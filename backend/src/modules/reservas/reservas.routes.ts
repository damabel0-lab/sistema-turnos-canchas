import { Router } from 'express';

export const reservasRouter = Router();

// TODO: implementar
// GET    /reservas/grilla        -> grilla/calendario del día por cancha
// GET    /reservas               -> historial / filtros
// POST   /reservas               -> crear reserva (cliente o carga manual del admin)
// PATCH  /reservas/:id/estado    -> confirmar seña, cancelar, completar
// DELETE /reservas/:id           -> cancelar (política de cancelación)
// POST   /reservas/:id/turno-fijo -> proyectar reservas semanales recurrentes

reservasRouter.get('/grilla', (_req, res) => {
  res.json({ mensaje: 'TODO: grilla de reservas' });
});
