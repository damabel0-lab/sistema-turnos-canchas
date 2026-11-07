import { Router } from 'express';

export const abonosRouter = Router();

// TODO: implementar
// GET  /abonos                 -> abonos del usuario / listado admin
// POST /abonos                 -> vender abono mensual o por clases (gym/pileta)
// POST /abonos/:id/consumo     -> descontar 1 clase al asistir/reservar
// POST /abonos/:id/pase-clase  -> pago por clase única

abonosRouter.get('/', (_req, res) => {
  res.json({ mensaje: 'TODO: abonos' });
});
