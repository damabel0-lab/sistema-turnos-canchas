import { Router } from 'express';
import { hoyLocal, isoMinLocal } from '../../lib/fecha.js';
import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';

export const dashboardRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /dashboard/resumen -> resumen del día para el admin
dashboardRouter.get(
  '/resumen',
  h(async (_req, res) => {
    const hoy = hoyLocal();

    const [reservas, movimientos, abonosPorVencer] = await Promise.all([
      supabaseAdmin
        .from('reservas')
        .select('id, estado, cancha_id, fecha, hora_inicio, usuario_id, precio_total, monto_seña')
        .eq('fecha', hoy)
        .neq('estado', 'cancelada'),
      supabaseAdmin
        .from('movimientos_caja')
        .select('monto, tipo_movimiento, metodo_pago')
        .gte('fecha_hora', `${hoy}T00:00:00Z`)
        .lt('fecha_hora', `${hoy}T23:59:59Z`),
      supabaseAdmin
        .from('abonos')
        .select('id, usuario_id, disciplina_id, clases_disponibles, fecha_vencimiento')
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
