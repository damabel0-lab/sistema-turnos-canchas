import { Router } from 'express';

export const torneosRouter = Router();

// TODO: implementar
// GET    /torneos                  -> listado
// POST   /torneos                  -> crear torneo (super_admin)
// POST   /torneos/:id/fixtures     -> generar cruces/fase
// PATCH  /torneos/partidos/:id     -> cargar resultado
// GET    /torneos/:id/posiciones   -> tabla de posiciones

torneosRouter.get('/', (_req, res) => {
  res.json({ mensaje: 'TODO: torneos' });
});
