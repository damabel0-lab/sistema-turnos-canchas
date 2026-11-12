import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireOwner, complejoIdRequerido, type AuthedRequest } from '../../middleware/auth.js';
import {
  crearCancha,
  crearTarifa,
  editarCancha,
  eliminarCancha,
  eliminarTarifa,
  listarCanchas,
  listarTarifas,
} from './canchas.service.js';
import { cotizar } from '../../services/tarifas/cotizador.js';

export const canchasRouter = Router();

/** Envuelve los handlers async para mandar las excepciones al errorHandler */
const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthedRequest, res).catch(next);

// POST /canchas/cotizar -> precio final de un turno (cualquier rol logueado)
canchasRouter.post(
  '/cotizar',
  h(async (req, res) => {
    res.json(await cotizar(req.body));
  }),
);

// GET /canchas -> listado de canchas del complejo activo
canchasRouter.get(
  '/',
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await listarCanchas(cid));
  }),
);

// POST /canchas -> alta (dueño del complejo activo)
canchasRouter.post(
  '/',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.status(201).json(await crearCancha(req.body, cid));
  }),
);

// PATCH /canchas/:id -> editar precio, nombre, activa
canchasRouter.patch(
  '/:id',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await editarCancha(Number(req.params.id), req.body, cid));
  }),
);

// DELETE /canchas/:id -> eliminar cancha
canchasRouter.delete(
  '/:id',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await eliminarCancha(Number(req.params.id), cid));
  }),
);

// GET /canchas/:id/tarifas
canchasRouter.get(
  '/:id/tarifas',
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await listarTarifas(Number(req.params.id), cid));
  }),
);

// POST /canchas/:id/tarifas
canchasRouter.post(
  '/:id/tarifas',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.status(201).json(await crearTarifa(Number(req.params.id), req.body, cid));
  }),
);

// DELETE /tarifas/:id  (la tarifa se referencia por su propio id)
canchasRouter.delete(
  '/tarifas/:id',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await eliminarTarifa(Number(req.params.id), cid));
  }),
);
