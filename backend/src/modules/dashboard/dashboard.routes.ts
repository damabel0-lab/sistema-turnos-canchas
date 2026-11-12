import { Router } from 'express';
import { hoyLocal, isoMinLocal } from '../../lib/fecha.js';
import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { requireStaff, complejoIdRequerido, type AuthedRequest } from '../../middleware/auth.js';

export const dashboardRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthedRequest, res).catch(next);

// GET /dashboard/resumen -> resumen del día para el staff del complejo activo
dashboardRouter.get(
  '/resumen',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    const hoy = hoyLocal();

    const [reservas, movimientos, abonosPorVencer] = await Promise.all([
      supabaseAdmin
        .from('reservas')
        .select('id, estado, cancha_id, fecha, hora_inicio, usuario_id, precio_total, monto_seña')
        .eq('complejo_id', cid)
        .eq('fecha', hoy)
        .neq('estado', 'cancelada'),
      supabaseAdmin
        .from('movimientos_caja')
        .select('monto, tipo_movimiento, metodo_pago')
        .eq('complejo_id', cid)
        .gte('fecha_hora', `${hoy}T00:00:00Z`)
        .lt('fecha_hora', `${hoy}T23:59:59Z`),
      supabaseAdmin
        .from('abonos')
        .select('id, usuario_id, disciplina_id, clases_disponibles, fecha_vencimiento')
        .eq('complejo_id', cid)
        .eq('activo', true)
        .lt('fecha_vencimiento', isoMinLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)))
        .gt('fecha_vencimiento', hoy),
    ]);

    if (reservas.error) throw new Error(reservas.error.message);
    if (movimientos.error) throw new Error(movimientos.error.message);
    if (abonosPorVencer.error) throw new Error(abonosPorVencer.error.message);

    const reservadas = reservas.data ?? [];
    const confirmar = reservadas.filter((r: any) => r.estado === 'pendiente_seña' || r.estado === 'confirmada');
    const completadas = reservadas.filter((r: any) => r.estado === 'completada');

    const ingresos = (movimientos.data ?? [])
      .filter((m: any) => m.tipo_movimiento === 'ingreso')
      .reduce((sum: number, m: any) => sum + Number(m.monto), 0);

    res.json({
      fecha: hoy,
      reservas_hoy: reservadas.length,
      pendientes_seña: confirmar.filter((r: any) => r.estado === 'pendiente_seña').length,
      confirmadas: confirmar.filter((r: any) => r.estado === 'confirmada').length,
      completadas: completadas.length,
      ingresos_dia: ingresos,
      abonos_por_vencer: abonosPorVencer.data?.length ?? 0,
    });
  }),
);
