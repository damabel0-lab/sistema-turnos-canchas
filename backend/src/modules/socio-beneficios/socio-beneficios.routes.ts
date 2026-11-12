import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireStaff, requireOwner, complejoIdRequerido, type AuthedRequest } from '../../middleware/auth.js';
import {
  listarBeneficiosDeSocio,
  asignarBeneficio,
  quitarBeneficio,
  descuentoDelSocio,
} from './socio-beneficios.service.js';

export const socioBeneficiosRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthedRequest, res).catch(next);

// GET /socio-beneficios/:usuarioId -> beneficios asignados a un socio (staff del complejo activo)
socioBeneficiosRouter.get(
  '/:usuarioId',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await listarBeneficiosDeSocio(req.params.usuarioId, cid));
  }),
);

// POST /socio-beneficios/:usuarioId/:beneficioId -> asignar beneficio (dueño del complejo activo)
socioBeneficiosRouter.post(
  '/:usuarioId/:beneficioId',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    await asignarBeneficio(req.params.usuarioId, Number(req.params.beneficioId), cid);
    res.status(201).json({ ok: true });
  }),
);

// DELETE /socio-beneficios/:usuarioId/:beneficioId -> quitar beneficio (dueño del complejo activo)
socioBeneficiosRouter.delete(
  '/:usuarioId/:beneficioId',
  requireOwner,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    await quitarBeneficio(req.params.usuarioId, Number(req.params.beneficioId), cid);
    res.json({ ok: true });
  }),
);

// GET /socio-beneficios/:usuarioId/descuento?aplica_en=... -> % de descuento vigente en el complejo activo
socioBeneficiosRouter.get(
  '/:usuarioId/descuento',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    const aplicaEn = String(req.query.aplica_en ?? 'cancha');
    res.json({ descuento_porcentaje: await descuentoDelSocio(req.params.usuarioId, aplicaEn, cid) });
  }),
);
