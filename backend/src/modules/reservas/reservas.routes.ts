import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AuthedRequest } from '../../middleware/auth.js';
import { disponibilidad, crearReserva, grillaDelDia, cambiarEstadoReserva } from './reservas.service.js';
import { cargaManual } from './carga-manual.service.js';

export const reservasRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response, next: NextFunction) => fn(req, res).catch(next);

// POST /reservas/manual -> carga rápida del admin (nombre + teléfono, sin cuenta)
reservasRouter.post(
  '/manual',
  (req: AuthedRequest, res, next) => {
    if (req.rol !== 'super_admin' && req.rol !== 'recepcionista') {
      return res.status(403).json({ error: 'Requiere rol de staff' });
    }
    next();
  },
  h(async (req, res) => {
    res.status(201).json(await cargaManual(req.body));
  }),
);

// GET /reservas/grilla?fecha=YYYY-MM-DD -> tablero del día (solo staff)
reservasRouter.get(
  '/grilla',
  (req: AuthedRequest, res, next) => {
    if (req.rol !== 'super_admin' && req.rol !== 'recepcionista') {
      return res.status(403).json({ error: 'Requiere rol de staff' });
    }
    next();
  },
  h(async (req, res) => {
    res.json(await grillaDelDia(String(req.query.fecha ?? '')));
  }),
);

// POST /reservas -> crear reserva (cliente logueado, o admin con usuario_id ajeno)
reservasRouter.post(
  '/',
  h(async (req, res) => {
    const body = req.body ?? {};
    // Un cliente siempre reserva a su nombre; el staff puede asignarle a otro
    // (carga manual por teléfono) pasando usuario_id en el body.
    const esStaff = req.rol === 'super_admin' || req.rol === 'recepcionista';
    const usuario_id = esStaff ? (body.usuario_id ?? null) : req.userId;

    res.status(201).json(await crearReserva({ ...body, usuario_id }));
  }),
);

// PATCH /reservas/:id/estado -> confirmar seña / completar / cancelar (solo staff)
reservasRouter.patch(
  '/:id/estado',
  (req: AuthedRequest, res, next) => {
    if (req.rol !== 'super_admin' && req.rol !== 'recepcionista') {
      return res.status(403).json({ error: 'Requiere rol de staff' });
    }
    next();
  },
  h(async (req, res) => {
    const { estado, metodo_pago } = req.body ?? {};
    if (!['confirmada', 'cancelada', 'completada'].includes(estado)) {
      res.status(400).json({ error: 'estado debe ser confirmada, cancelada o completada' });
      return;
    }
    res.json(await cambiarEstadoReserva(Number(req.params.id), estado, metodo_pago));
  }),
);

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
