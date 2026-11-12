import { leerConfigComplejo } from './complejoConfig.js';

export interface HorasComplejo {
  apertura: number;
  cierre: number;
}

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
export async function leerHorasComplejo(complejoId: number): Promise<HorasComplejo> {
  const cfg = await leerConfigComplejo(complejoId);
  return { apertura: cfg.hora_apertura, cierre: cfg.hora_cierre };
}

// Re-export para no romper imports existentes de config de env
export { envNum };
