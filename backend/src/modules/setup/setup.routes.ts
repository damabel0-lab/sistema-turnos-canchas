import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireOwner, complejoIdRequerido, type AuthedRequest } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/error.js';
import { leerConfigComplejo, invalidarConfigComplejo } from '../../config/complejoConfig.js';
import { supabaseAdmin } from '../../config/supabase.js';

export const setupRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthedRequest, res).catch(next);

const bool = (v: unknown): boolean => v === true || v === 'true' || v === 1 || v === '1';
const num = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const horaStr = (v: unknown, fallback: string): string => {
  if (typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v.trim())) {
    const [h, m] = v.trim().split(':');
    return `${String(Number(h)).padStart(2, '0')}:${m.padStart(2, '0')}`;
  }
  const n = Number(v);
  if (Number.isFinite(n) && n >= 0 && n <= 23) return `${String(n).padStart(2, '0')}:00`;
  return fallback;
};
const numONull = (v: unknown): number | null => {
  if (v === null || v === '' || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

type Payload = Record<string, unknown>;

/** Normaliza body (flat del wizard o anidado por categoría) a columnas de complejos */
function aColumnas(body: Payload): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const pick = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Payload : undefined);

  const meta = pick(body.metadatos) ?? {};
  const pol = pick(body.politicas) ?? {};
  const am = pick(body.amenidades) ?? {};
  const soc = pick(body.socios) ?? {};
  const tor = pick(body.torneos) ?? {};
  const find = (obj: Payload, k1: string, k2?: string) => (obj[k1] !== undefined ? obj[k1] : k2 ? obj[k2] : undefined);

  if (find(meta, 'nombre') !== undefined || body.nombre !== undefined) {
    const v = String(find(meta, 'nombre') ?? body.nombre ?? '').trim();
    if (v.length < 2) throw new HttpError(400, 'El nombre comercial es obligatorio');
    patch.nombre = v.slice(0, 120);
  }
  if (find(meta, 'tipo') !== undefined || body.tipo !== undefined) {
    const t = String(find(meta, 'tipo') ?? body.tipo);
    if (!['fraccionado', 'complejo_deportivo'].includes(t)) {
      throw new HttpError(400, 'tipo debe ser "fraccionado" o "complejo_deportivo"');
    }
    patch.tipo = t;
  }
  const ha = find(meta, 'hora_apertura') ?? body.hora_apertura;
  if (ha !== undefined) patch.hora_apertura = horaStr(ha, '08:00');
  const hc = find(meta, 'hora_cierre') ?? body.hora_cierre;
  if (hc !== undefined) patch.hora_cierre = horaStr(hc, '23:00');

  const ch = find(pol, 'cancelacion_minima_horas') ?? body.politica_cancelacion_horas;
  if (ch !== undefined) patch.cancelacion_minima_horas = num(ch, 2, 0, 168);
  const dt = find(pol, 'descuento_turno_fijo_porcentaje') ?? body.descuento_turno_fijo_porcentaje;
  if (dt !== undefined) patch.descuento_turno_fijo_porcentaje = num(dt, 0, 0, 100);
  const sena = find(pol, 'seña_obligatoria') ?? find(pol, 'sena_obligatoria');
  if (sena !== undefined) patch.sena_obligatoria = bool(sena);

  if (am.gym !== undefined) patch.gym = bool(am.gym);
  else if (body.gym !== undefined) patch.gym = bool(body.gym);
  if (am.pileta !== undefined) patch.pileta = bool(am.pileta);
  else if (body.pileta !== undefined) patch.pileta = bool(body.pileta);
  if (am.precio_mensual_gym !== undefined) patch.precio_mensual_gym = numONull(am.precio_mensual_gym);
  if (am.precio_mensual_pileta !== undefined) patch.precio_mensual_pileta = numONull(am.precio_mensual_pileta);

  if (soc.ofrece_socios !== undefined) patch.ofrece_socios = bool(soc.ofrece_socios);
  else if (body.socios !== undefined && typeof body.socios === 'boolean') patch.ofrece_socios = body.socios;
  if (tor.ofrece_torneos !== undefined) patch.ofrece_torneos = bool(tor.ofrece_torneos);

  return patch;
}

// GET /admin/setup → estado del setup del complejo ACTIVO del request
// (clientes/dueños de plataforma sin complejo: { setup_completado: false })
setupRouter.get(
  '/',
  h(async (req, res) => {
    if (!req.complejoId) {
      res.json({ setup_completado: false });
      return;
    }
    const cfg = await leerConfigComplejo(req.complejoId);
    res.json({
      setup_completado: true,
      config_id: cfg.id,
      valores: {
        metadatos: {
          nombre: cfg.nombre,
          tipo: cfg.tipo,
          hora_apertura: cfg.hora_apertura,
          hora_cierre: cfg.hora_cierre,
        },
        politicas: {
          cancelacion_minima_horas: cfg.cancelacion_minima_horas,
          descuento_turno_fijo_porcentaje: cfg.descuento_turno_fijo_porcentaje,
          seña_obligatoria: cfg.sena_obligatoria,
        },
        amenidades: {
          gym: cfg.gym,
          pileta: cfg.pileta,
          precio_mensual_gym: cfg.precio_mensual_gym,
          precio_mensual_pileta: cfg.precio_mensual_pileta,
        },
        socios: { ofrece_socios: cfg.ofrece_socios },
        torneos: { ofrece_torneos: cfg.ofrece_torneos },
      },
      // Flat back-compat
      nombre: cfg.nombre,
      tipo: cfg.tipo,
      hora_apertura: cfg.hora_apertura,
      hora_cierre: cfg.hora_cierre,
      cancelacion_minima_horas: cfg.cancelacion_minima_horas,
      descuento_turno_fijo_porcentaje: cfg.descuento_turno_fijo_porcentaje,
      seña_obligatoria: cfg.sena_obligatoria,
      ofrece_socios: cfg.ofrece_socios,
      ofrece_torneos: cfg.ofrece_torneos,
    });
  }),
);

// POST /admin/setup → guardar configuración inicial del complejo ACTIVO (dueño/plataforma)
setupRouter.post(
  '/',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    const patch = aColumnas((req.body ?? {}) as Payload);
    if (patch.nombre === undefined || patch.tipo === undefined) {
      throw new HttpError(400, 'El nombre comercial y el tipo son obligatorios');
    }
    patch.actualizado_en = new Date().toISOString();
    const { error } = await supabaseAdmin.from('complejos').update(patch).eq('id', cid);
    if (error) throw new HttpError(400, error.message);
    invalidarConfigComplejo(cid);
    res.json({ ok: true });
  }),
);

// PATCH /admin/setup → actualización parcial (metadatos/políticas/amenidades/socios/torneos)
setupRouter.patch(
  '/',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    const body = req.body ?? {};
    if (typeof body !== 'object' || Array.isArray(body)) {
      throw new HttpError(400, 'Body debe ser un objeto JSON');
    }
    const patch = aColumnas(body as Payload);
    if (Object.keys(patch).length === 0) throw new HttpError(400, 'No hay cambios para guardar');
    patch.actualizado_en = new Date().toISOString();
    const { error } = await supabaseAdmin.from('complejos').update(patch).eq('id', cid);
    if (error) throw new HttpError(400, error.message);
    invalidarConfigComplejo(cid);
    res.json({ ok: true });
  }),
);
