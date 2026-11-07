import { Router } from 'express';

export const notificacionesRouter = Router();

// TODO: implementar (etapa 1: email + in-app; WhatsApp provider en futuro)
// POST /notificaciones/recordatorio   -> recordatorio previo a turno
// POST /notificaciones/suspension     -> aviso masivo por lluvia/suspensión
// GET  /notificaciones                -> bandeja del usuario

notificacionesRouter.get('/', (_req, res) => {
  res.json({ mensaje: 'TODO: notificaciones' });
});
