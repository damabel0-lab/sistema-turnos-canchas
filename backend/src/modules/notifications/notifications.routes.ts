import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  listarNotificaciones,
  leerNotificacion,
  crearNotificacion,
  recordatorioTurno,
  avisoSuspension,
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

// POST /notificaciones/recordatorio -> crear recordatorio manual (staff)
notificacionesRouter.post(
  '/recordatorio',
  h(async (req, res) => {
    const { usuario_id, fecha, hora, cancha } = req.body ?? {};
    await recordatorioTurno(usuario_id, { fecha, hora, cancha });
    res.status(201).json({ ok: true });
  }),
);

// POST /notificaciones/suspension -> aviso masivo (staff)
notificacionesRouter.post(
  '/suspension',
  h(async (req, res) => {
    const { usuario_ids, motivo } = req.body ?? {};
    if (!Array.isArray(usuario_ids) || !motivo) {
      res.status(400).json({ error: 'usuario_ids y motivo son obligatorios' });
      return;
    }
    await avisoSuspension(usuario_ids, motivo);
    res.json({ ok: true });
  }),
);
