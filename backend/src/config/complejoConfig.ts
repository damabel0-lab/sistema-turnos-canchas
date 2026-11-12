import { supabaseAdmin } from './supabase.js';

export interface ConfigComplejo {
  id: number;
  nombre: string;
  slug: string;
  tipo: string;
  hora_apertura: number;
  hora_cierre: number;
  cancelacion_minima_horas: number;
  descuento_turno_fijo_porcentaje: number;
  sena_obligatoria: boolean;
  gym: boolean;
  pileta: boolean;
  precio_mensual_gym: number | null;
  precio_mensual_pileta: number | null;
  ofrece_socios: boolean;
  ofrece_torneos: boolean;
}

const CACHE_MS = 60_000;
const cache = new Map<number, { valor: ConfigComplejo; ts: number }>();

/** Invalida la caché (llamar tras editar el complejo) */
export function invalidarConfigComplejo(complejoId: number) {
  cache.delete(complejoId);
}

const envNum = (clave: string, fallback: number): number =>
  process.env[clave] ? Number(process.env[clave]) : fallback;

/** 'HH:MM:SS' | 'HH:MM' → horas enteras (la apertura de un complejo cae en punto) */
const horaAEntero = (t: unknown, fallback: number): number => {
  if (typeof t === 'number' && Number.isFinite(t)) return t;
  if (typeof t === 'string') {
    const h = Number(t.split(':')[0]);
    return Number.isFinite(h) ? h : fallback;
  }
  return fallback;
};

/** Config completa del complejo desde la DB (única fuente de verdad), con cache 60s
 *  y fallback a variables de entorno si la DB falla. */
export async function leerConfigComplejo(complejoId: number): Promise<ConfigComplejo> {
  const hit = cache.get(complejoId);
  if (hit && Date.now() - hit.ts < CACHE_MS) return hit.valor;

  const fallback: ConfigComplejo = {
    id: complejoId,
    nombre: 'Mi Complejo',
    slug: '',
    tipo: 'complejo_deportivo',
    hora_apertura: envNum('HORA_APERTURA_COMPLEJO', 8),
    hora_cierre: envNum('HORA_CIERRE_COMPLEJO', 23),
    cancelacion_minima_horas: envNum('POLITICA_CANCELACION_HORAS', 2),
    descuento_turno_fijo_porcentaje: envNum('DESCUENTO_TURNO_FIJO_PORCENTAJE', 0),
    sena_obligatoria: false,
    gym: false,
    pileta: false,
    precio_mensual_gym: null,
    precio_mensual_pileta: null,
    ofrece_socios: false,
    ofrece_torneos: true,
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('complejos')
      .select('id, nombre, slug, tipo, hora_apertura, hora_cierre, cancelacion_minima_horas, descuento_turno_fijo_porcentaje, sena_obligatoria, gym, pileta, precio_mensual_gym, precio_mensual_pileta, ofrece_socios, ofrece_torneos')
      .eq('id', complejoId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return fallback;

    const valor: ConfigComplejo = {
      id: data.id,
      nombre: data.nombre,
      slug: data.slug,
      tipo: data.tipo,
      hora_apertura: horaAEntero(data.hora_apertura, fallback.hora_apertura),
      hora_cierre: horaAEntero(data.hora_cierre, fallback.hora_cierre),
      cancelacion_minima_horas: Number(data.cancelacion_minima_horas ?? fallback.cancelacion_minima_horas),
      descuento_turno_fijo_porcentaje: Number(data.descuento_turno_fijo_porcentaje ?? 0),
      sena_obligatoria: !!data.sena_obligatoria,
      gym: !!data.gym,
      pileta: !!data.pileta,
      precio_mensual_gym: data.precio_mensual_gym != null ? Number(data.precio_mensual_gym) : null,
      precio_mensual_pileta: data.precio_mensual_pileta != null ? Number(data.precio_mensual_pileta) : null,
      ofrece_socios: !!data.ofrece_socios,
      ofrece_torneos: data.ofrece_torneos !== false,
    };

    cache.set(complejoId, { valor, ts: Date.now() });
    return valor;
  } catch (e) {
    console.warn(`No se pudo leer la config del complejo #${complejoId} (uso env):`, e instanceof Error ? e.message : e);
    return fallback;
  }
}
