import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { listarBeneficios, crearBeneficio, eliminarBeneficio } from './beneficios.service.js';

export const beneficiosRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /beneficios -> catálogo (staff ve el catálogo, super_admin edita)
beneficiosRouter.get(
  '/',
  h(async (_req, res) => {
    res.json(await listarBeneficios());
  }),
);

// POST /beneficios -> alta de beneficio (solo super_admin)
beneficiosRouter.post(
  '/',
  requireSuperAdmin,
  h(async (req, res) => {
    res.status(201).json(await crearBeneficio(req.body));
  }),
);

// DELETE /beneficios/:id (solo super_admin)
beneficiosRouter.delete(
  '/:id',
  requireSuperAdmin,
  h(async (req, res) => {
    await eliminarBeneficio(Number(req.params.id));
    res.json({ ok: true });
  }),
);
