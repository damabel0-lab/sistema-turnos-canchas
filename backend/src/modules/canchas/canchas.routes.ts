import { Router } from 'express';

export const canchasRouter = Router();

// TODO: implementar
// GET    /canchas              -> listado (con deporte y activa)
// POST   /canchas              -> alta de cancha (solo super_admin)
// PATCH  /canchas/:id          -> editar precio, nombre, activa
// GET    /canchas/:id/tarifas  -> tarifas opcionales de la cancha
// POST   /canchas/:id/tarifas  -> crear tarifa (día/horario/precio/seña)

canchasRouter.get('/', (_req, res) => {
  res.json({ mensaje: 'TODO: listado de canchas' });
});
