import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { listarPartidos, cargarResultadoPartido } from './torneos.service.js';

export const partidosRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /torneos/:id/partidos -> fixture de un torneo
partidosRouter.get(
  '/:torneoId/partidos',
  h(async (req, res) => {
    res.json(await listarPartidos(Number(req.params.torneoId)));
  }),
);

// PATCH /torneos/partidos/:id -> cargar resultado (solo super_admin)
partidosRouter.patch(
  '/partidos/:partidoId',
  requireSuperAdmin,
  h(async (req, res) => {
    const { goles_local, goles_visitante, jugado } = req.body ?? {};
    res.json(
      await cargarResultadoPartido(
        Number(req.params.partidoId),
        Number(goles_local),
        Number(goles_visitante),
        Boolean(jugado),
      ),
    );
  }),
);
