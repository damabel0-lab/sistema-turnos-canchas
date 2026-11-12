import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireSuperAdmin, type AuthedRequest } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/error.js';
import {
  activarSuscripcion,
  suspenderSuscripcion,
  cancelarSuscripcion,
  historialSuscripciones,
  ultimaSuscripcion,
} from './suscripciones.service.js';
import { listarPlataforma, resumenPlataforma } from '../complejos/complejos.service.js';
import { crearNotificacion } from '../notifications/notifications.service.js';
import { supabaseAdmin } from '../../config/supabase.js';

export const suscripcionesAdminRouter = Router();

/** Envuelve los handlers async para mandar las excepciones al errorHandler */
const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthedRequest, res).catch(next);

const sip = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** Aviso in-app a los dueños del complejo (mejor esfuerzo) */
async function avisarDuenos(complejoId: number, tipo: string, titulo: string, cuerpo: string) {
  try {
    const { data: duenos } = await supabaseAdmin
      .from('complejo_usuarios')
      .select('usuario_id')
      .eq('complejo_id', complejoId)
      .eq('rol', 'dueno');
    for (const d of duenos ?? []) {
      await crearNotificacion({ usuario_id: d.usuario_id, tipo, titulo, cuerpo });
    }
  } catch (e) {
    console.warn('No se pudo notificar al dueño del complejo:', e);
  }
}

// Listado completo para la plataforma: complejos + suscripción actual + dueños + totales
// GET /admin/suscripciones
suscripcionesAdminRouter.get(
  '/',
  requireSuperAdmin,
  h(async (_req, res) => {
    const [items, resumen] = await Promise.all([listarPlataforma(), resumenPlataforma()]);
    res.json({ items, resumen });
  }),
);

// Detalle + historial de un complejo
// GET /admin/suscripciones/:complejoId
suscripcionesAdminRouter.get(
  '/:complejoId',
  requireSuperAdmin,
  h(async (req, res) => {
    const complejoId = Number(req.params.complejoId);
    if (!Number.isInteger(complejoId) || complejoId <= 0) throw new HttpError(400, 'complejoId inválido');
    const { data: complejo, error } = await supabaseAdmin
      .from('complejos')
      .select('*')
      .eq('id', complejoId)
      .maybeSingle();
    if (error) throw new HttpError(500, error.message);
    if (!complejo) throw new HttpError(404, 'Complejo no encontrado');
    const [actual, historial] = await Promise.all([
      ultimaSuscripcion(complejoId),
      historialSuscripciones(complejoId),
    ]);
    res.json({ complejo, suscripcion: actual, historial });
  }),
);

// Activar / renovar suscripción (cobro manual)
// POST /admin/suscripciones/:complejoId/activar  { meses?, metodo_pago?, monto?, notas? }
suscripcionesAdminRouter.post(
  '/:complejoId/activar',
  requireSuperAdmin,
  h(async (req, res) => {
    const complejoId = Number(req.params.complejoId);
    if (!Number.isInteger(complejoId) || complejoId <= 0) throw new HttpError(400, 'complejoId inválido');
    if (!req.userId) throw new HttpError(401, 'sin usuario');
    const { meses, metodo_pago, monto, notas } = req.body ?? {};
    const sub = await activarSuscripcion(
      complejoId,
      {
        meses: meses ? sip(meses, 1, 1, 60) : undefined,
        metodo_pago: ['efectivo', 'transferencia', 'otro'].includes(metodo_pago) ? metodo_pago : 'efectivo',
        monto: monto !== undefined ? sip(monto, 50_000, 0, 100_000_000) : undefined,
        notas: typeof notas === 'string' ? notas.slice(0, 500) : undefined,
      },
      req.userId,
    );
    await avisarDuenos(
      complejoId,
      'sistema',
      '¡Tu suscripción está activa!',
      `PlayControl confirmó tu suscripción (${sub.fin ? `vigente hasta el ${sub.fin}` : 'sin vencimiento'}). ¡A jugar!`,
    );
    res.status(201).json(sub);
  }),
);

// Suspender por no pago / revisión (el complejo desaparece del catálogo)
// POST /admin/suscripciones/:complejoId/suspender  { notas? }
suscripcionesAdminRouter.post(
  '/:complejoId/suspender',
  requireSuperAdmin,
  h(async (req, res) => {
    const complejoId = Number(req.params.complejoId);
    if (!Number.isInteger(complejoId) || complejoId <= 0) throw new HttpError(400, 'complejoId inválido');
    if (!req.userId) throw new HttpError(401, 'sin usuario');
    const notas = typeof req.body?.notas === 'string' ? req.body.notas.slice(0, 500) : undefined;
    const sub = await suspenderSuscripcion(complejoId, req.userId, notas);
    await avisarDuenos(
      complejoId,
      'sistema',
      'Suscripción suspendida',
      'Tu complejo dejó de aparecer en el catálogo. Contactá a PlayControl para regularizarla.',
    );
    res.json(sub);
  }),
);

// Cancelación definitiva
// POST /admin/suscripciones/:complejoId/cancelar  { notas? }
suscripcionesAdminRouter.post(
  '/:complejoId/cancelar',
  requireSuperAdmin,
  h(async (req, res) => {
    const complejoId = Number(req.params.complejoId);
    if (!Number.isInteger(complejoId) || complejoId <= 0) throw new HttpError(400, 'complejoId inválido');
    if (!req.userId) throw new HttpError(401, 'sin usuario');
    const notas = typeof req.body?.notas === 'string' ? req.body.notas.slice(0, 500) : undefined;
    const sub = await cancelarSuscripcion(complejoId, req.userId, notas);
    await avisarDuenos(
      complejoId,
      'sistema',
      'Suscripción cancelada',
      'Tu complejo ya no forma parte de PlayControl. Si fue un error, escribinos.',
    );
    res.json(sub);
  }),
);
