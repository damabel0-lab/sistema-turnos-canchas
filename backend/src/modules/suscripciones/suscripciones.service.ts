import { supabaseAdmin } from '../../config/supabase.js';
import { hoyLocal } from '../../lib/fecha.js';

export interface SuscripcionRow {
  id: number;
  complejo_id: number;
  plan: string;
  estado: 'prueba' | 'activa' | 'vencida' | 'cancelada';
  monto: number;
  inicio: string;
  fin: string | null;
  metodo_pago: string | null;
  registrada_por: string | null;
  notas: string | null;
  creado_en: string;
}

export const PLAN_COMPLETO = 'completo';
export const MONTO_PLAN_COMPLETO = 50_000;
const CACHE_VIGENCIA_MS = 30_000;
const cacheVigencia = new Map<number, { vigente: boolean; ts: number }>();

/** Invalida la cache de vigencia (llamar tras activar/suspender/cancelar) */
export function invalidarVigencia(complejoId: number) {
  cacheVigencia.delete(complejoId);
}

/** Última suscripción del complejo (por fecha de inicio e id). null si nunca tuvo. */
export async function ultimaSuscripcion(complejoId: number): Promise<SuscripcionRow | null> {
  const { data, error } = await supabaseAdmin
    .from('suscripciones')
    .select('*')
    .eq('complejo_id', complejoId)
    .order('inicio', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('ultimaSuscripcion:', error.message);
    return null;
  }
  return data as SuscripcionRow | null;
}

/** ¿Está vigente la suscripción? (activa sin vencimiento o activas/prueba con fin >= hoy) */
export function esVigente(sub: SuscripcionRow | null): boolean {
  if (!sub) return false;
  const hoy = hoyLocal();
  if (sub.estado === 'activa') return !sub.fin || sub.fin >= hoy;
  if (sub.estado === 'prueba') return !!sub.fin && sub.fin >= hoy;
  return false;
}

/** ¿Puede operar/vender el complejo? (cache 30s — suficiente para el catálogo y reservas) */
export async function suscripcionVigente(complejoId: number): Promise<boolean> {
  const hit = cacheVigencia.get(complejoId);
  if (hit && Date.now() - hit.ts < CACHE_VIGENCIA_MS) return hit.vigente;
  const sub = await ultimaSuscripcion(complejoId);
  const vigente = esVigente(sub);
  cacheVigencia.set(complejoId, { vigente, ts: Date.now() });
  return vigente;
}

/** Historial completo de suscripciones del complejo (más nueva primero) */
export async function historialSuscripciones(complejoId: number): Promise<SuscripcionRow[]> {
  const { data, error } = await supabaseAdmin
    .from('suscripciones')
    .select('*')
    .eq('complejo_id', complejoId)
    .order('id', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SuscripcionRow[];
}

export interface ActivacionInput {
  meses?: number;          // duración en meses; si no viene → sin vencimiento (fin NULL)
  metodo_pago?: 'efectivo' | 'transferencia' | 'otro';
  monto?: number;
  notas?: string;
}

/** Activa (o renueva) la suscripción del complejo. Crea una fila nueva, no edita historial. */
export async function activarSuscripcion(complejoId: number, input: ActivacionInput, porUserId: string): Promise<SuscripcionRow> {
  const inicio = hoyLocal();
  let fin: string | null = null;
  if (input.meses && input.meses > 0) {
    const d = new Date();
    d.setDate(d.getDate() + Math.round(input.meses * 30));
    fin = d.toISOString().slice(0, 10); // suficiente para mensual aproximado
  }
  const { data, error } = await supabaseAdmin
    .from('suscripciones')
    .insert({
      complejo_id: complejoId,
      plan: PLAN_COMPLETO,
      estado: 'activa',
      monto: input.monto ?? MONTO_PLAN_COMPLETO,
      inicio,
      fin,
      metodo_pago: input.metodo_pago ?? 'efectivo',
      registrada_por: porUserId,
      notas: input.notas ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  invalidarVigencia(complejoId);
  return data as SuscripcionRow;
}

/** Aviso de no pago: marca vencida con fin = hoy (el complejo sale del catálogo) */
export async function suspenderSuscripcion(complejoId: number, porUserId: string, notas?: string): Promise<SuscripcionRow> {
  const hoy = hoyLocal();
  const { data, error } = await supabaseAdmin
    .from('suscripciones')
    .insert({
      complejo_id: complejoId,
      plan: PLAN_COMPLETO,
      estado: 'vencida',
      monto: 0,
      inicio: hoy,
      fin: hoy,
      metodo_pago: 'otro',
      registrada_por: porUserId,
      notas: notas ?? 'Suspendida por la plataforma (no pago / revisión)',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  invalidarVigencia(complejoId);
  return data as SuscripcionRow;
}

/** Cancelación definitiva del servicio (no pago, baja del complejo, etc.) */
export async function cancelarSuscripcion(complejoId: number, porUserId: string, notas?: string): Promise<SuscripcionRow> {
  const hoy = hoyLocal();
  const { data, error } = await supabaseAdmin
    .from('suscripciones')
    .insert({
      complejo_id: complejoId,
      plan: PLAN_COMPLETO,
      estado: 'cancelada',
      monto: 0,
      inicio: hoy,
      fin: hoy,
      metodo_pago: 'otro',
      registrada_por: porUserId,
      notas: notas ?? 'Cancelada por la plataforma',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  invalidarVigencia(complejoId);
  return data as SuscripcionRow;
}
