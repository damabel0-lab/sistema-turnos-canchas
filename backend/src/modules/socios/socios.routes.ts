import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireStaff, complejoIdRequerido, type AuthedRequest } from '../../middleware/auth.js';
import {
  listarSocios,
  darDeAltaSocio,
  bajaSocio,
  buscarSocio,
  asociarme,
  desasociarme,
} from './socios.service.js';

export const sociosRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthedRequest, res).catch(next);

// POST /socios/asociarme -> el jugador SE suma como socio (self-service, si el complejo lo ofrece)
sociosRouter.post(
  '/asociarme',
  h(async (req, res) => {
    complejoIdRequerido(req);
    res.json(await asociarme(req.userId!));
  }),
);

// DELETE /socios/asociarme -> el jugador se da de baja como socio
sociosRouter.delete(
  '/asociarme',
  h(async (req, res) => {
    complejoIdRequerido(req);
    res.json(await desasociarme(req.userId!));
  }),
);

// GET /socios -> directorio de socios CON ACTIVIDAD en tu complejo (staff)
sociosRouter.get(
  '/',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await listarSocios(cid));
  }),
);

// GET /socios/buscar?telefono=... -> buscar un cliente/socio por teléfono exacto (staff)
sociosRouter.get(
  '/buscar',
  requireStaff,
  h(async (req, res) => {
    complejoIdRequerido(req);
    const telefono = String(req.query.telefono ?? '');
    if (!telefono) {
      res.status(400).json({ error: 'telefono es obligatorio' });
      return;
    }
    res.json(await buscarSocio(telefono));
  }),
);

// POST /socios -> dar de alta socio (staff: recepcionista también puede dar de alta)
sociosRouter.post(
  '/',
  requireStaff,
  h(async (req, res) => {
    complejoIdRequerido(req);
    res.status(201).json(await darDeAltaSocio(req.body));
  }),
);

// DELETE /socios/:id -> baja de socio (no borra el usuario, quita el flag)
sociosRouter.delete(
  '/:id',
  requireStaff,
  h(async (req, res) => {
    complejoIdRequerido(req);
    await bajaSocio(req.params.id);
    res.json({ ok: true });
  }),
);
