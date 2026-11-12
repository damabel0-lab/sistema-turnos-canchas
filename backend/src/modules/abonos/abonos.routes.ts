import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireStaff, complejoIdRequerido, type AuthedRequest } from '../../middleware/auth.js';
import {
  listarAbonos,
  listarAbonosDelUsuario,
  venderAbono,
  consumirClase,
  listarAbonosVencidos,
  cerrarAbonosVencidos,
  solicitarAbono,
  listarSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
} from './abonos.service.js';

export const abonosRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthedRequest, res).catch(next);

// GET /abonos -> listado completo del complejo activo (staff)
abonosRouter.get(
  '/',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await listarAbonos(cid));
  }),
);

// GET /abonos/mis -> abonos del usuario logueado (cualquier complejo — es SU historial)
abonosRouter.get(
  '/mis',
  h(async (req, res) => {
    res.json(await listarAbonosDelUsuario(req.userId!));
  }),
);

// POST /abonos/solicitud -> el cliente pide la mensualidad para un complejo (header X-Complejo-Id)
abonosRouter.post(
  '/solicitud',
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.status(201).json(await solicitarAbono(req.userId!, (req.body ?? {}).servicio, cid));
  }),
);

// GET /abonos/solicitudes -> solicitudes pendientes de activación (staff del complejo activo)
abonosRouter.get(
  '/solicitudes',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await listarSolicitudes(cid));
  }),
);

// POST /abonos/solicitudes/:id/aprobar -> staff activa tras cobrar en el mostrador
abonosRouter.post(
  '/solicitudes/:id/aprobar',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await aprobarSolicitud(Number(req.params.id), req.body ?? {}, cid));
  }),
);

// POST /abonos/solicitudes/:id/rechazar -> staff rechaza la solicitud
abonosRouter.post(
  '/solicitudes/:id/rechazar',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await rechazarSolicitud(Number(req.params.id), cid));
  }),
);

// POST /abonos -> vender abono mensual/pases (staff del complejo activo)
abonosRouter.post(
  '/',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.status(201).json(await venderAbono(req.body, cid));
  }),
);

// POST /abonos/consumo -> descontar 1 clase (staff)
abonosRouter.post(
  '/consumo',
  requireStaff,
  h(async (req, res) => {
    const { usuario_id, disciplina_id } = req.body ?? {};
    if (!usuario_id) {
      res.status(400).json({ error: 'usuario_id es obligatorio' });
      return;
    }
    res.json(await consumirClase(usuario_id, disciplina_id));
  }),
);

// GET /abonos/vencidos -> listado para dar de baja (staff del complejo activo)
abonosRouter.get(
  '/vencidos',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await listarAbonosVencidos(cid));
  }),
);

// POST /abonos/cerrar-vencidos -> inactivar abonos vencidos (staff del complejo activo)
abonosRouter.post(
  '/cerrar-vencidos',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await cerrarAbonosVencidos(cid));
  }),
);
