import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireStaff, complejoIdRequerido, type AuthedRequest } from '../../middleware/auth.js';
import {
  disponibilidad,
  crearReserva,
  grillaDelDia,
  cambiarEstadoReserva,
  reservasDelUsuario,
  cancelarPropia,
  proyectarTurnosFijos,
  estadisticasDelUsuario,
} from './reservas.service.js';
import { cargaManual } from './carga-manual.service.js';

export const reservasRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthedRequest, res).catch(next);

// POST /reservas/manual -> carga rápida del admin (nombre + teléfono, sin cuenta)
reservasRouter.post(
  '/manual',
  requireStaff,
  h(async (req, res) => {
    complejoIdRequerido(req);
    res.status(201).json(await cargaManual(req.body));
  }),
);

// GET /reservas/grilla?fecha=YYYY-MM-DD -> tablero del día (staff del complejo activo)
reservasRouter.get(
  '/grilla',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    res.json(await grillaDelDia(String(req.query.fecha ?? ''), cid));
  }),
);

// POST /reservas -> crear reserva (cliente logueado, o admin con usuario_id ajeno)
reservasRouter.post(
  '/',
  h(async (req, res) => {
    const body = req.body ?? {};
    const esStaff = req.rol === 'super_admin' || (req.rolComplejo != null && req.complejoId != null);

    // Staff con toggle "Para otra persona": usa el mismo flujo que la Carga rápida
    // (busca el teléfono en el directorio o crea un cliente fantasma si no existe)
    if (esStaff && body.cliente_telefono && String(body.cliente_telefono).trim()) {
      res.status(201).json(await cargaManual({
        cancha_id: Number(body.cancha_id),
        fecha: body.fecha,
        hora_inicio: body.hora_inicio,
        hora_fin: body.hora_fin,
        precio_total: body.precio_total,
        monto_seña: body.monto_seña,
        metodo_pago: body.metodo_pago ?? null,
        estado: body.estado,
        cliente_nombre: String(body.cliente_nombre ?? '').trim(),
        cliente_telefono: String(body.cliente_telefono).trim(),
      }));
      return;
    }

    // Si sos staff y no pasás usuario_id, se te atribuye a vos mismo (reservando desde la app).
    // Si querés asignar a otro cliente (mostrador), pasá body.usuario_id explícito.
    const usuario_id = esStaff ? (body.usuario_id ?? req.userId ?? null) : req.userId;

    res.status(201).json(await crearReserva({ ...body, usuario_id }));
  }),
);

// GET /reservas/mias -> próximas + historial del usuario logueado
reservasRouter.get(
  '/mias',
  h(async (req, res) => {
    res.json(await reservasDelUsuario(req.userId!));
  }),
);

// GET /reservas/mias/estadisticas -> actividad del cliente (veces jugado, gasto, favorita)
reservasRouter.get(
  '/mias/estadisticas',
  h(async (req, res) => {
    res.json(await estadisticasDelUsuario(req.userId!));
  }),
);

// DELETE /reservas/:id/mia -> el cliente cancela su propia reserva
reservasRouter.delete(
  '/:id/mia',
  h(async (req, res) => {
    res.json(await cancelarPropia(req.userId!, Number(req.params.id)));
  }),
);

// POST /reservas/turno-fijo -> proyectar reservas semanales recurrentes (staff del complejo activo)
reservasRouter.post(
  '/turno-fijo',
  requireStaff,
  h(async (req, res) => {
    complejoIdRequerido(req);
    res.status(201).json(await proyectarTurnosFijos(req.body));
  }),
);

// PATCH /reservas/:id/estado -> confirmar seña / completar / cancelar (staff del complejo activo)
reservasRouter.patch(
  '/:id/estado',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    const { estado, metodo_pago } = req.body ?? {};
    if (!['confirmada', 'cancelada', 'completada'].includes(estado)) {
      res.status(400).json({ error: 'estado debe ser confirmada, cancelada o completada' });
      return;
    }
    res.json(await cambiarEstadoReserva(Number(req.params.id), estado, metodo_pago, cid));
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
