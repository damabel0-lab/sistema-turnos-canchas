import { supabaseAdmin } from './supabase.js';

export interface HorasComplejo {
  apertura: number;
  cierre: number;
}

const CACHE_MS = 60_000;
let cache: { valor: HorasComplejo; ts: number } | null = null;

const envNum = (clave: string, fallback: number): number =>
  process.env[clave] ? Number(process.env[clave]) : fallback;

/** Cierre en minutos desde 00:00. Si el cierre es <= apertura, se interpreta del día
 *  siguiente (complejo que juega hasta tarde): 20:00 → 01:00 => cierre a las 25:00. */
export function minutosCierreAjustado(apertura: number, cierre: number): number {
  if (cierre <= apertura) return (cierre === 0 ? 24 : cierre + 24) * 60;
  return cierre * 60;
}

/** Lee las horas del complejo desde la DB (única fuente de verdad, como el resto del sistema),
 *  con fallback a variables de entorno. Cachea 60s para no saturar la DB en rutas calientes. */
export async function leerHorasComplejo(): Promise<HorasComplejo> {
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.valor;

  const fallback: HorasComplejo = {
    apertura: envNum('HORA_APERTURA_COMPLEJO', 8),
    cierre: envNum('HORA_CIERRE_COMPLEJO', 23),
  };

  try {
    const { data: valores, error } = await supabaseAdmin
      .from('configuracion_valores')
      .select('categoria, clave, valor')
      .eq('categoria', 'metadatos');
    if (error) throw error;

    const parsed: Record<string, unknown> = {};
    for (const fila of valores ?? []) {
      try {
        parsed[fila.clave] = JSON.parse(fila.valor ?? 'null');
      } catch {
        parsed[fila.clave] = fila.valor;
      }
    }

    const aperturaN = Number(parsed.hora_apertura);
    const cierreN = Number(parsed.hora_cierre);
    const valor: HorasComplejo = {
      apertura: Number.isFinite(aperturaN) ? aperturaN : fallback.apertura,
      cierre: Number.isFinite(cierreN) ? cierreN : fallback.cierre,
    };

    cache = { valor, ts: Date.now() };
    return valor;
  } catch (e) {
    console.warn('No se pudieron leer las horas del complejo (uso env):', e instanceof Error ? e.message : e);
    return fallback;
  }
}
