import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { registrarEgreso, resumenCaja, type FiltroCaja } from './caja.service.js';

export const cajaRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /caja/resumen?fecha=YYYY-MM-DD&periodo=dia|semana|mes
// Finanzas: solo super_admin (el recepcionista no ve la plata del negocio)
cajaRouter.get(
  '/resumen',
  requireSuperAdmin,
  h(async (req, res) => {
    const filtro: FiltroCaja = {
      fecha: req.query.fecha ? String(req.query.fecha) : undefined,
      periodo: (req.query.periodo as FiltroCaja['periodo']) ?? 'dia',
    };
    res.json(await resumenCaja(filtro));
  }),
);

// POST /caja/egresos -> egreso manual
cajaRouter.post(
  '/egresos',
  requireSuperAdmin,
  h(async (req, res) => {
    res.status(201).json(await registrarEgreso(req.body));
  }),
);
