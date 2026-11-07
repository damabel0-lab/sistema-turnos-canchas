import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { listarEquipos, crearEquipo } from './torneos.service.js';

export const equiposRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /torneos/:id/equipos -> equipos de un torneo
equiposRouter.get(
  '/:torneoId/equipos',
  h(async (req, res) => {
    res.json(await listarEquipos(Number(req.params.torneoId)));
  }),
);

// POST /torneos/:id/equipos -> crear equipo en un torneo (solo super_admin)
equiposRouter.post(
  '/:torneoId/equipos',
  requireSuperAdmin,
  h(async (req, res) => {
    const { nombre_equipo, capitan_id } = req.body ?? {};
    res.status(201).json(await crearEquipo(Number(req.params.torneoId), nombre_equipo, capitan_id));
  }),
);
