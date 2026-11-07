import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireSuperAdmin } from '../../middleware/auth.js';
import {
  listarBeneficiosDeSocio,
  asignarBeneficio,
  quitarBeneficio,
  descuentoDelSocio,
} from './socio-beneficios.service.js';

export const socioBeneficiosRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /socio-beneficios/:usuarioId -> beneficios asignados a un socio
socioBeneficiosRouter.get(
  '/:usuarioId',
  h(async (req, res) => {
    res.json(await listarBeneficiosDeSocio(req.params.usuarioId));
  }),
);

// POST /socio-beneficios/:usuarioId/:beneficioId -> asignar beneficio a socio
socioBeneficiosRouter.post(
  '/:usuarioId/:beneficioId',
  requireSuperAdmin,
  h(async (req, res) => {
    await asignarBeneficio(req.params.usuarioId, Number(req.params.beneficioId));
    res.status(201).json({ ok: true });
  }),
);

// DELETE /socio-beneficios/:usuarioId/:beneficioId -> quitar beneficio
socioBeneficiosRouter.delete(
  '/:usuarioId/:beneficioId',
  requireSuperAdmin,
  h(async (req, res) => {
    await quitarBeneficio(req.params.usuarioId, Number(req.params.beneficioId));
    res.json({ ok: true });
  }),
);

// GET /socio-beneficios/:usuarioId/descuento?aplica_en=... -> % de descuento vigente
socioBeneficiosRouter.get(
  '/:usuarioId/descuento',
  h(async (req, res) => {
    const aplicaEn = String(req.query.aplica_en ?? 'cancha');
    res.json({ descuento_porcentaje: await descuentoDelSocio(req.params.usuarioId, aplicaEn) });
  }),
);
