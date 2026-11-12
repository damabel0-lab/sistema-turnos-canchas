import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authMiddleware, complejoIdRequerido, type AuthedRequest } from '../../middleware/auth.js';
import {
  listarCatalogo,
  detallePorSlug,
  crearComplejo,
  misComplejos,
  editarComplejo,
} from './complejos.service.js';

export const complejosRouter = Router();

/** Envuelve los handlers async para mandar las excepciones al errorHandler */
const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthedRequest, res).catch(next);

// TODO: logueado → catálogo público de complejos disponibles
// GET /complejos?q=&ciudad=&deporteId=
complejosRouter.get(
  '/',
  h(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const ciudad = typeof req.query.ciudad === 'string' ? req.query.ciudad : undefined;
    const deporteId = req.query.deporteId ? Number(req.query.deporteId) : undefined;
    res.json(
      await listarCatalogo({
        q,
        ciudad,
        deporteId: deporteId && Number.isFinite(deporteId) ? deporteId : undefined,
      }),
    );
  }),
);

// Mis complejos (membresías + suscripción) — panel del dueño
// GET /complejos/mi
complejosRouter.get(
  '/mi',
  h(async (req, res) => {
    if (!req.userId) throw new Error('sin usuario');
    res.json(await misComplejos(req.userId));
  }),
);

// Detalle público por slug
// GET /complejos/:slug
complejosRouter.get(
  '/:slug',
  h(async (req, res) => {
    res.json(await detallePorSlug(String(req.params.slug)));
  }),
);

// Self-service: registrar un complejo nuevo (el creador queda DUEÑO y arranca trial 14 días)
// POST /complejos
complejosRouter.post(
  '/',
  h(async (req, res) => {
    if (!req.userId) throw new Error('sin usuario');
    res.status(201).json(await crearComplejo(req.userId, req.body));
  }),
);

// Editar datos/horarios/políticas/amenities del complejo — solo el DUEÑO de ESE complejo
// PATCH /complejos/:id
complejosRouter.patch(
  '/:id',
  h(async (req, res) => {
    if (!req.userId) throw new Error('sin usuario');
    res.json(await editarComplejo(req.userId, req.rol, Number(req.params.id), req.body));
  }),
);
