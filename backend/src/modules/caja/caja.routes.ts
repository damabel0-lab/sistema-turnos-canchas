import { Router } from 'express';

export const cajaRouter = Router();

// TODO: implementar
// GET  /caja/movimientos       -> detalle con filtros (día/semana/mes, tipo, disciplina)
// GET  /caja/resumen           -> sumas por día, semana, mes y por origen
// GET  /caja/arqueo            -> arqueo/cierre de caja del día
// POST /caja/movimientos       -> registrar egreso manual

cajaRouter.get('/resumen', (_req, res) => {
  res.json({ mensaje: 'TODO: resumen de caja' });
});
