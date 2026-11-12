import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { leerConfigComplejo } from '../../config/complejoConfig.js';
import { suscripcionVigente } from '../suscripciones/suscripciones.service.js';

export const configRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).then(() => undefined).catch(next);

/** GET /config?complejo=<slug> → configuración PÚBLICA de UN complejo.
 *  Sin query → el primer complejo VIGENTE (compat con clientes viejos).
 *  Incluye las canchas activas con su precio (para la página pública del complejo). */
configRouter.get(
  '/',
  h(async (req, res) => {
    const slug = typeof req.query.complejo === 'string' ? req.query.complejo.trim() : '';

    let complejoId: number | null = null;
    if (slug) {
      const { data } = await supabaseAdmin
        .from('complejos')
        .select('id')
        .eq('slug', slug)
        .eq('activo', true)
        .maybeSingle();
      complejoId = data?.id ?? null;
      if (complejoId == null) return res.status(404).json({ error: 'Complejo no encontrado' });
      if (!(await suscripcionVigente(complejoId))) {
        return res.status(404).json({ error: 'Complejo no disponible por el momento' });
      }
    } else {
      // Back-compat: primer complejo vigente del sistema
      const { data: candidatos } = await supabaseAdmin
        .from('complejos')
        .select('id')
        .eq('activo', true)
        .order('id');
      for (const c of candidatos ?? []) {
        if (await suscripcionVigente(c.id)) {
          complejoId = c.id;
          break;
        }
      }
      if (complejoId == null) {
        return res.status(404).json({ error: 'No hay complejos disponibles por el momento' });
      }
    }

    const cfg = await leerConfigComplejo(complejoId);

    const { data: canchasRaw } = await supabaseAdmin
      .from('canchas')
      .select('id, nombre, precio_base, caracteristicas, deporte_id, deportes(nombre)')
      .eq('complejo_id', complejoId)
      .eq('activa', true)
      .order('nombre');

    const canchasList = (canchasRaw ?? []) as unknown as Array<{
      id: number;
      nombre: string;
      precio_base: number;
      caracteristicas: string | null;
      deporte_id: number | null;
      deportes: { nombre: string } | null;
    }>;
    const canchas = canchasList.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      deporte: c.deportes?.nombre ?? null,
      caracteristicas: c.caracteristicas,
      precio_base: c.precio_base,
    }));

    res.json({
      nombre: cfg.nombre,
      tipo: cfg.tipo,
      slug: cfg.slug,
      hora_apertura: cfg.hora_apertura,
      hora_cierre: cfg.hora_cierre,
      cancelacion_minima_horas: cfg.cancelacion_minima_horas,
      descuento_turno_fijo_porcentaje: cfg.descuento_turno_fijo_porcentaje,
      seña_obligatoria: cfg.sena_obligatoria,
      amenidades: {
        gym: cfg.gym,
        pileta: cfg.pileta,
        precio_mensual_gym: cfg.precio_mensual_gym,
        precio_mensual_pileta: cfg.precio_mensual_pileta,
      },
      ofrece_socios: cfg.ofrece_socios,
      ofrece_torneos: cfg.ofrece_torneos,
      canchas,
    });
  }),
);
