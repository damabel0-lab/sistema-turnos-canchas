import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

export const configRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

/** Intenta parsear un valor JSON guardado en configuracion_valores */
function intentarParse(raw: string | null | undefined): unknown {
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Lee toda la configuración del complejo desde la DB (una sola query) */
async function leerConfiguracionDb(): Promise<Record<string, Record<string, unknown>>> {
  try {
    const { data: valores, error } = await supabaseAdmin
      .from('configuracion_valores')
      .select('categoria, clave, valor');
    if (error) {
      console.warn('No se pudo leer configuracion_valores:', error.message);
      return {};
    }
    const parseado: Record<string, Record<string, unknown>> = {};
    for (const fila of valores ?? []) {
      const cat = fila.categoria as string;
      if (!parseado[cat]) parseado[cat] = {};
      parseado[cat][fila.clave] = intentarParse(fila.valor);
    }
    return parseado;
  } catch (e) {
    console.warn('Error leyendo configuracion_valores:', e instanceof Error ? e.message : e);
    return {};
  }
}

const envNum = (clave: string, fallback: number): number =>
  process.env[clave] ? Number(process.env[clave]) : fallback;

/** GET /config -> configuración PÚBLICA del complejo.
 *  Fuente única de verdad: tablas configuracion_complejo / configuracion_valores.
 *  Fallback: variables de entorno (si el asistente nunca se ejecutó). */
configRouter.get(
  '/',
  h(async (_req, res) => {
    const config = await leerConfiguracionDb();
    const meta = config.metadatos ?? {};
    const pol = config.politicas ?? {};
    const am = config.amenidades ?? {};
    const soc = config.socios ?? {};
    const tor = config.torneos ?? {};

    const num = (fuente: Record<string, unknown>, clave: string, fallback: number): number => {
      const v = fuente[clave];
      if (v === null || v === undefined) return fallback; // guardado como "null" = sin configurar
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const numONull = (fuente: Record<string, unknown>, clave: string): number | null => {
      const v = fuente[clave];
      if (v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const bool = (fuente: Record<string, unknown>, clave: string, fallback: boolean): boolean =>
      typeof fuente[clave] === 'boolean' ? (fuente[clave] as boolean) : fallback;
    const str = (fuente: Record<string, unknown>, clave: string): string | null =>
      typeof fuente[clave] === 'string' && (fuente[clave] as string).trim() ? (fuente[clave] as string) : null;

    res.json({
      // Datos del complejo (si corrió el asistente)
      nombre: str(meta, 'nombre'),
      tipo: str(meta, 'tipo'),
      // Horario y políticas (compatibles con los consumidores actuales)
      hora_apertura: num(meta, 'hora_apertura', envNum('HORA_APERTURA_COMPLEJO', 8)),
      hora_cierre: num(meta, 'hora_cierre', envNum('HORA_CIERRE_COMPLEJO', 23)),
      cancelacion_minima_horas: num(pol, 'cancelacion_minima_horas', envNum('POLITICA_CANCELACION_HORAS', 2)),
      descuento_turno_fijo_porcentaje: num(pol, 'descuento_turno_fijo_porcentaje', envNum('DESCUENTO_TURNO_FIJO_PORCENTAJE', 0)),
      seña_obligatoria: bool(pol, 'seña_obligatoria', false),
      // Amenidades
      amenidades: {
        gym: bool(am, 'gym', false),
        pileta: bool(am, 'pileta', false),
        precio_mensual_gym: numONull(am, 'precio_mensual_gym'),
        precio_mensual_pileta: numONull(am, 'precio_mensual_pileta'),
      },
      // Socios
      ofrece_socios: bool(soc, 'ofrece_socios', false),
      // Torneos
      ofrece_torneos: bool(tor, 'ofrece_torneos', true),
    });
  }),
);
