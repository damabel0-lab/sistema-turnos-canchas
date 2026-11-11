import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';

export const setupRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /admin/setup -> estado actual de configuración del complejo
setupRouter.get(
  '/',
  h(async (_req, res) => {
    const { data: config, error: eConfig } = await supabaseAdmin
      .from('configuracion_complejo')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const { data: valores, error: eValores } = await supabaseAdmin
      .from('configuracion_valores')
      .select('categoria, clave, valor')
      .order('categoria', { ascending: true });

    if (eConfig && eConfig.code !== 'PGRST116') throw new HttpError(500, eConfig.message);
    if (eValores) throw new HttpError(500, eValores.message);

    // Parsear valores a JSON según categoría
    const parseado: Record<string, Record<string, unknown>> = {};
    for (const fila of valores ?? []) {
      if (!parseado[fila.categoria]) parseado[fila.categoria] = {};
      try {
        parseado[fila.categoria][fila.clave] = JSON.parse(fila.valor ?? 'null');
      } catch {
        parseado[fila.categoria][fila.clave] = fila.valor;
      }
    }

    res.json({
      setup_completado: config ? true : false,
      config_id: config?.id ?? null,
      valores: parseado,
    });
  }),
);

// POST /admin/setup -> guardar configuración inicial completa
setupRouter.post(
  '/',
  h(async (req, res) => {
    const { tipo, nombre, hora_apertura, hora_cierre, politica_cancelacion_horas, descuento_turno_fijo_porcentaje, gym, pileta, socios } =
      req.body ?? {};

    if (!nombre?.trim()) throw new HttpError(400, 'El nombre comercial es obligatorio');
    if (!tipo || !['fraccionado', 'complejo_deportivo'].includes(tipo)) {
      throw new HttpError(400, 'tipo debe ser "fraccionado" o "complejo_deportivo"');
    }

    // Guardar o actualizar fila en configuracion_complejo
    const { data: existente } = await supabaseAdmin
      .from('configuracion_complejo')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existente) {
      const { error } = await supabaseAdmin
        .from('configuracion_complejo')
        .update({ actualizado_en: new Date().toISOString() })
        .eq('id', existente.id);
      if (error) throw new HttpError(500, error.message);
    } else {
      const { error } = await supabaseAdmin.from('configuracion_complejo').insert({});
      if (error) throw new HttpError(500, error.message);
    }

    // Guardar valores en configuracion_valores (upsert por categoria+clave)
    const pares: Array<{ categoria: string; clave: string; valor: string }> = [
      { categoria: 'metadatos', clave: 'nombre', valor: JSON.stringify(nombre) },
      { categoria: 'metadatos', clave: 'tipo', valor: JSON.stringify(tipo) },
      { categoria: 'metadatos', clave: 'hora_apertura', valor: JSON.stringify(hora_apertura ?? 8) },
      { categoria: 'metadatos', clave: 'hora_cierre', valor: JSON.stringify(hora_cierre ?? 23) },
      { categoria: 'politicas', clave: 'cancelacion_minima_horas', valor: JSON.stringify(politica_cancelacion_horas ?? 2) },
      { categoria: 'politicas', clave: 'descuento_turno_fijo_porcentaje', valor: JSON.stringify(descuento_turno_fijo_porcentaje ?? 0) },
      { categoria: 'amenidades', clave: 'gym', valor: JSON.stringify(!!gym) },
      { categoria: 'amenidades', clave: 'pileta', valor: JSON.stringify(!!pileta) },
      { categoria: 'socios', clave: 'ofrece_socios', valor: JSON.stringify(!!socios) },
    ];

    for (const par of pares) {
      const { error } = await supabaseAdmin
        .from('configuracion_valores')
        .upsert(
          { categoria: par.categoria, clave: par.clave, valor: par.valor, actualizado_en: new Date().toISOString() },
          { onConflict: 'categoria,clave', ignoreDuplicates: false },
        );
      if (error) console.warn('upsert config error:', error.message);
    }

    res.json({ ok: true });
  }),
);
