import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { reportePorDisciplina } from './reporte.service.js';

export const reporteRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /caja/reporte-disciplina?fecha=YYYY-MM-DD -> recaudación agrupada por origen
reporteRouter.get(
  '/reporte-disciplina',
  requireSuperAdmin,
  h(async (req, res) => {
    res.json(await reportePorDisciplina(String(req.query.fecha ?? '')));
  }),
);
