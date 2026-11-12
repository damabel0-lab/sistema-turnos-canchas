import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  listarNotificaciones,
  leerNotificacion,
  crearNotificacion,
  recordatorioTurno,
  avisoSuspension,
  procesarRecordatoriosProximos,
  marcarTodasLeidas,
  eliminarTodasNotificaciones,
  eliminarNotificacion,
} from './notifications.service.js';

export const notificacionesRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /notificaciones -> mis notificaciones (cliente)
notificacionesRouter.get(
  '/',
  h(async (req, res) => {
    const usuarioId = (req as any).userId;
    res.json(await listarNotificaciones(usuarioId));
  }),
);

// PATCH /notificaciones/:id/leer -> marcar como leída
notificacionesRouter.patch(
  '/:id/leer',
  h(async (req, res) => {
    const usuarioId = (req as any).userId;
    await leerNotificacion(req.params.id, usuarioId);
    res.json({ ok: true });
  }),
);

// PATCH /notificaciones/leer-todas -> marcar TODAS como leídas
notificacionesRouter.patch(
  '/leer-todas',
  h(async (req, res) => {
    const usuarioId = (req as any).userId;
    res.json(await marcarTodasLeidas(usuarioId));
  }),
);

// DELETE /notificaciones -> borrar TODAS las del usuario
notificacionesRouter.delete(
  '/',
  h(async (req, res) => {
    const usuarioId = (req as any).userId;
    res.json(await eliminarTodasNotificaciones(usuarioId));
  }),
);

// DELETE /notificaciones/:id -> borrar una
notificacionesRouter.delete(
  '/:id',
  h(async (req, res) => {
    const usuarioId = (req as any).userId;
    res.json(await eliminarNotificacion(req.params.id, usuarioId));
  }),
);

// POST /notificaciones/procesar-recordatorios -> detectar reservas próximas y enviar recordatorios (staff)
notificacionesRouter.post(
  '/procesar-recordatorios',
  h(async (req, res) => {
    const rol = (req as any).rol;
    if (rol !== 'super_admin' && rol !== 'recepcionista') {
      res.status(403).json({ error: 'Requiere rol de staff' });
      return;
    }
    res.json(await procesarRecordatoriosProximos());
  }),
);
