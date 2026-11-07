import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireSuperAdmin } from '../../middleware/auth.js';
import {
  listarTorneos,
  crearTorneo,
  listarTorneosActivos,
} from './torneos.service.js';

export const torneosRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /torneos -> listado completo (staff)
torneosRouter.get(
  '/',
  h(async (_req, res) => {
    res.json(await listarTorneos());
  }),
);

// GET /torneos/activos -> solo los activos (cliente puede verlos)
torneosRouter.get(
  '/activos',
  h(async (_req, res) => {
    res.json(await listarTorneosActivos());
  }),
);

// POST /torneos -> crear torneo (solo super_admin)
torneosRouter.post(
  '/',
  requireSuperAdmin,
  h(async (req, res) => {
    res.status(201).json(await crearTorneo(req.body));
  }),
);
