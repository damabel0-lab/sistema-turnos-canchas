import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { disponibilidad } from './reservas.service.js';

export const reservasRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /reservas/disponibilidad?cancha_id=1&fecha=2026-11-13
// -> [{ hora: "08:00", estado: "libre" | "ocupada" | "bloqueada" }, ...]
reservasRouter.get(
  '/disponibilidad',
  h(async (req, res) => {
    const canchaId = Number(req.query.cancha_id);
    const fecha = String(req.query.fecha ?? '');
    if (!canchaId) {
      res.status(400).json({ error: 'cancha_id es obligatorio' });
      return;
    }
    res.json(await disponibilidad(canchaId, fecha));
  }),
);

// TODO (siguientes fases):
// GET    /reservas/grilla        -> grilla/calendario del día por cancha
// POST   /reservas               -> crear reserva (cliente o carga manual del admin)
// PATCH  /reservas/:id/estado    -> confirmar seña, cancelar, completar
// DELETE /reservas/:id           -> cancelar (política de cancelación)
// POST   /reservas/:id/turno-fijo -> proyectar reservas semanales recurrentes
