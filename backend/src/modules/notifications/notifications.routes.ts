import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  listarNotificaciones,
  leerNotificacion,
  crearNotificacion,
  recordatorioTurno,
  avisoSuspension,
  procesarRecordatoriosProximos,
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
