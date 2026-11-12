import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireOwner, complejoIdRequerido, type AuthedRequest } from '../../middleware/auth.js';
import { registrarEgreso, resumenCaja, type FiltroCaja } from './caja.service.js';

export const cajaRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthedRequest, res).catch(next);

// GET /caja/resumen?fecha=YYYY-MM-DD&periodo=dia|semana|mes|anio|historico
//   o también desde=&hasta= (sobreescriben el rango)
// Finanzas: solo el DUEÑO del complejo (el recepcionista no ve la plata del negocio)
cajaRouter.get(
  '/resumen',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    const filtro: FiltroCaja = {
      fecha: req.query.fecha ? String(req.query.fecha) : undefined,
      periodo: (req.query.periodo as FiltroCaja['periodo']) ?? 'dia',
      desde: req.query.desde ? String(req.query.desde) : undefined,
      hasta: req.query.hasta ? String(req.query.hasta) : undefined,
    };
    res.json(await resumenCaja(filtro, cid));
  }),
);

// POST /caja/egresos -> egreso manual
cajaRouter.post(
  '/egresos',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.status(201).json(await registrarEgreso(req.body, cid));
  }),
);
