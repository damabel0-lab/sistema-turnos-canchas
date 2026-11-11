import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';
import {
  crearCancha,
  crearTarifa,
  editarCancha,
  eliminarTarifa,
  listarCanchas,
  listarTarifas,
} from './canchas.service.js';
import { cotizar } from '../../services/tarifas/cotizador.js';

export const canchasRouter = Router();

/** Envuelve los handlers async para mandar las excepciones al errorHandler */
const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// POST /canchas/cotizar -> precio final de un turno (cualquier rol logueado)
canchasRouter.post(
  '/cotizar',
  h(async (req, res) => {
    res.json(await cotizar(req.body));
  }),
);

// GET /canchas -> listado (con deporte y activa)
canchasRouter.get(
  '/',
  h(async (_req, res) => {
    res.json(await listarCanchas());
  }),
);

// POST /canchas -> alta (solo super_admin)
canchasRouter.post(
  '/',
  requireSuperAdmin,
  h(async (req, res) => {
    res.status(201).json(await crearCancha(req.body));
  }),
);

// PATCH /canchas/:id -> editar precio, nombre, activa
canchasRouter.patch(
  '/:id',
  requireSuperAdmin,
  h(async (req, res) => {
    res.json(await editarCancha(Number(req.params.id), req.body));
  }),
);

// DELETE /canchas/:id -> eliminar cancha
canchasRouter.delete(
  '/:id',
  requireSuperAdmin,
  h(async (req, res) => {
    const { error } = await supabaseAdmin
      .from('canchas')
      .delete()
      .eq('id', Number(req.params.id));
    if (error) throw new HttpError(400, error.message);
    res.json({ ok: true });
  }),
);

// GET /canchas/:id/tarifas
canchasRouter.get(
  '/:id/tarifas',
  h(async (req, res) => {
    res.json(await listarTarifas(Number(req.params.id)));
  }),
);

// POST /canchas/:id/tarifas
canchasRouter.post(
  '/:id/tarifas',
  requireSuperAdmin,
  h(async (req, res) => {
    res.status(201).json(await crearTarifa(Number(req.params.id), req.body));
  }),
);

// DELETE /tarifas/:id  (la tarifa se referencia por su propio id)
canchasRouter.delete(
  '/tarifas/:id',
  requireSuperAdmin,
  h(async (req, res) => {
    res.json(await eliminarTarifa(Number(req.params.id)));
  }),
);
