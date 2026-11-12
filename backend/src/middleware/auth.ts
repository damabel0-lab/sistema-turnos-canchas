import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { HttpError } from './error.js';
import { suscripcionVigente } from '../modules/suscripciones/suscripciones.service.js';

export type RolComplejo = 'dueno' | 'recepcionista';

export interface Membresia {
  complejo_id: number;
  rol: RolComplejo;
}

export interface AuthedRequest extends Request {
  userId?: string;
  /** Rol global: 'super_admin' = super admin de la PLATAFORMA (no de un complejo) | 'cliente' | 'recepcionista' (legacy) */
  rol?: string;
  /** Membresías del usuario (dueño/recepcionista) en complejos de la plataforma */
  membresias?: Membresia[];
  /** Complejo activo resuelto para este request (header X-Complejo-Id > única/primera membresía) */
  complejoId?: number | null;
  /** Rol del usuario en el complejo activo ('dueno' | 'recepcionista' | null si plataforma) */
  rolComplejo?: RolComplejo | null;
}

const CACHE_MEMBRESIAS_MS = 30_000;
const cacheMembresias = new Map<string, { valor: Membresia[]; ts: number }>();

/** Invalida la caché de membresías (llamar tras alta/fin de complejo del usuario) */
export function invalidarMembresias(userId?: string) {
  if (userId) cacheMembresias.delete(userId);
  else cacheMembresias.clear();
}

async function membresiasDe(userId: string): Promise<Membresia[]> {
  const hit = cacheMembresias.get(userId);
  if (hit && Date.now() - hit.ts < CACHE_MEMBRESIAS_MS) return hit.valor;
  const { data, error } = await supabaseAdmin
    .from('complejo_usuarios')
    .select('complejo_id, rol')
    .eq('usuario_id', userId)
    .order('creado_en', { ascending: true });
  if (error) {
    console.warn('No se pudieron leer las membresías del usuario:', error.message);
    return [];
  }
  const valor = (data ?? []) as Membresia[];
  cacheMembresias.set(userId, { valor, ts: Date.now() });
  return valor;
}

const CACHE_PUBLICO_MS = 60_000;
const cacheComplejoPublico = new Map<number, { ok: boolean; ts: number }>();

/** ¿Es un complejo público (activo y con suscripción vigente)? Cache 60s.
 *  Sirve para que un jugador logueado pueda CONSULTAR/reservar en ese complejo
 *  pasando X-Complejo-Id — el header es contexto público, no permiso privado. */
async function complejoPublicoVigente(id: number): Promise<boolean> {
  const hit = cacheComplejoPublico.get(id);
  if (hit && Date.now() - hit.ts < CACHE_PUBLICO_MS) return hit.ok;
  const { data: c } = await supabaseAdmin
    .from('complejos')
    .select('id, activo')
    .eq('id', id)
    .maybeSingle();
  let ok = false;
  if (c?.activo) {
    ok = await suscripcionVigente(id);
  }
  cacheComplejoPublico.set(id, { ok, ts: Date.now() });
  return ok;
}

/**
 * Complejo activo para el request:
 * 1. Header `X-Complejo-Id` — si el usuario es super_admin (soporte plataforma) o tiene membresía ahí,
 *    O el complejo es público vigente (contexto de reserva de jugadores).
 * 2. Si tiene exactamente 1 membresía → esa.
 * 3. Con varias membresías → la primera (orden de alta); el frontend puede forzar con el header.
 * 4. Sin membresías → null (cliente puro o super_admin de plataforma sin complejo asignado).
 */
async function resolverComplejoActivo(req: AuthedRequest, membresias: Membresia[]): Promise<number | null> {
  const header = req.headers['x-complejo-id'];
  const headerId = header ? Number(header) : NaN;
  if (Number.isInteger(headerId) && headerId > 0) {
    if (
      req.rol === 'super_admin' ||
      membresias.some((m) => m.complejo_id === headerId) ||
      (await complejoPublicoVigente(headerId))
    ) {
      return headerId;
    }
  }
  return membresias.length >= 1 ? membresias[0].complejo_id : null;
}

/** Valida el JWT de Supabase enviado en Authorization: Bearer <token>,
 *  carga perfil global + membresías y resuelve el complejo activo. */
export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token faltante' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  req.userId = data.user.id;

  const { data: perfil } = await supabaseAdmin
    .from('usuarios')
    .select('rol')
    .eq('id', data.user.id)
    .single();
  req.rol = perfil?.rol ?? 'cliente';

  const membresias = await membresiasDe(data.user.id);
  req.membresias = membresias;
  req.complejoId = await resolverComplejoActivo(req, membresias);
  req.rolComplejo = membresias.find((m) => m.complejo_id === req.complejoId)?.rol ?? null;

  next();
}

/** id del complejo activo del request, o lanza 400 si no hay ninguno resuelto */
export function complejoIdRequerido(req: AuthedRequest): number {
  if (!req.complejoId) {
    throw new HttpError(400, 'Elegí un complejo para continuar.');
  }
  return req.complejoId;
}

/** Super admin de la PLATAFORMA (no depende del complejo activo) */
export function requireSuperAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.rol !== 'super_admin') {
    return res.status(403).json({ error: 'Requiere super admin de la plataforma' });
  }
  next();
}

/** Dueño del complejo activo (o super_admin de plataforma en contexto de ese complejo).
 *  Para finanzas, precios, configuración y suscripción. */
export function requireOwner(req: AuthedRequest, res: Response, next: NextFunction) {
  const esOwner = req.rol === 'super_admin' || req.rolComplejo === 'dueno';
  if (!esOwner || !req.complejoId) {
    return res.status(403).json({ error: 'Requiere ser dueño del complejo' });
  }
  next();
}

/** Staff del complejo activo (dueño o recepcionista, o super_admin de plataforma).
 *  Para grilla, reservas, cobros y operación diaria. */
export function requireStaff(req: AuthedRequest, res: Response, next: NextFunction) {
  const esStaff =
    req.rol === 'super_admin' ||
    req.rolComplejo === 'dueno' ||
    req.rolComplejo === 'recepcionista';
  if (!esStaff || !req.complejoId) {
    return res.status(403).json({ error: 'Requiere rol de staff en un complejo' });
  }
  next();
}
