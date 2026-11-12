import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireStaff, requireOwner, complejoIdRequerido, type AuthedRequest } from '../../middleware/auth.js';
import { listarBeneficios, crearBeneficio, eliminarBeneficio } from './beneficios.service.js';

export const beneficiosRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthedRequest, res).catch(next);

// GET /beneficios -> catálogo del complejo activo (staff lo ve para aplicar)
beneficiosRouter.get(
  '/',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await listarBeneficios(cid));
  }),
);

// POST /beneficios -> alta de beneficio del complejo activo (dueño)
beneficiosRouter.post(
  '/',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.status(201).json(await crearBeneficio(req.body, cid));
  }),
);

// DELETE /beneficios/:id (dueño del complejo activo)
beneficiosRouter.delete(
  '/:id',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    await eliminarBeneficio(Number(req.params.id), cid);
    res.json({ ok: true });
  }),
);
