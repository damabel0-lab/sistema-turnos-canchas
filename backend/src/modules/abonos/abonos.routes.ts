import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AuthedRequest } from '../../middleware/auth.js';
import { requireStaff } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/error.js';
import {
  listarAbonos,
  listarAbonosDelUsuario,
  venderAbono,
  consumirClase,
  listarAbonosVencidos,
  cerrarAbonosVencidos,
} from './abonos.service.js';

export const abonosRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /abonos -> listado completo (staff)
abonosRouter.get(
  '/',
  h(async (_req, res) => {
    res.json(await listarAbonos());
  }),
);

// GET /abonos/mis -> abonos del usuario logueado (cliente)
abonosRouter.get(
  '/mis',
  h(async (req: AuthedRequest, res) => {
    res.json(await listarAbonosDelUsuario(req.userId!));
  }),
);

// POST /abonos -> vender abono mensual/pases (staff)
abonosRouter.post(
  '/',
  requireStaff,
  h(async (req, res) => {
    res.status(201).json(await venderAbono(req.body));
  }),
);

// POST /abonos/consumo -> descontar 1 clase (staff o sistema al crear reserva)
abonosRouter.post(
  '/consumo',
  h(async (req, res) => {
    const { usuario_id, disciplina_id } = req.body ?? {};
    if (!usuario_id) {
      res.status(400).json({ error: 'usuario_id es obligatorio' });
      return;
    }
    res.json(await consumirClase(usuario_id, disciplina_id));
  }),
);

// GET /abonos/vencidos -> listado para dar de baja (staff)
abonosRouter.get(
  '/vencidos',
  h(async (_req, res) => {
    res.json(await listarAbonosVencidos());
  }),
);

// POST /abonos/cerrar-vencidos -> inactivar abonos vencidos (staff)
abonosRouter.post(
  '/cerrar-vencidos',
  requireStaff,
  h(async (_req, res) => {
    res.json(await cerrarAbonosVencidos());
  }),
);
