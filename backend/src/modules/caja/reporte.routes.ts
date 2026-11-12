import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireOwner, complejoIdRequerido, type AuthedRequest } from '../../middleware/auth.js';
import { reportePorDisciplina } from './reporte.service.js';

export const reporteRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthedRequest, res).catch(next);

// GET /caja/reporte-disciplina?fecha=YYYY-MM-DD -> recaudación agrupada por origen
reporteRouter.get(
  '/reporte-disciplina',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await reportePorDisciplina(String(req.query.fecha ?? ''), cid));
  }),
);
