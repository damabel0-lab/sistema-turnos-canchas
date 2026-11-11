import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';
import { leerHorasComplejo } from '../../config/complejoHoras.js';

/**
 * Caja: movimientos y cortes por día / semana / mes.
 * Los ingresos ya los registran los cambios de estado de reserva;
 * aquí solo se consultan y suman (más egresos manuales del admin).
 */

export interface FiltroCaja {
  /** YYYY-MM-DD. Si no viene, se usa hoy */
  fecha?: string;
  /** dia | semana | mes (partiendo de "fecha", o de hoy).
   *  Para `dia` se usa el horario operativo del complejo (apertura → apertura siguiente). */
  periodo?: 'dia' | 'semana' | 'mes' | 'anio' | 'historico';
  /** Si vienen desde/hasta, tienen prioridad (formato YYYY-MM-DD). */
  desde?: string;
  hasta?: string;
}

export interface Movimiento {
  id: number;
  fecha_hora: string;
  tipo_movimiento: string;
  monto: number;
  metodo_pago: string;
  descripcion: string;
  reserva_id: number | null;
}

export interface ResumenCaja {
  desde: string;
  hasta: string;
  ingresos: number;
  egresos: number;
  saldo: number;
  por_metodo_pago: Record<string, number>;
  por_origen: Array<{ origen: string; total: number; movimientos: number }>;
  movimientos: Movimiento[];
}

/** Clasifica el origen del ingreso según la descripción que generó el backend */
function origenDe(descripcion: string): string {
  const d = descripcion.toLowerCase();
  if (d.includes('seña')) return 'Señas de turnos';
  if (d.includes('saldo') || d.includes('pago total')) return 'Turnos (canchas)';
  if (d.includes('abono') || d.includes('mensual')) return 'Abonos gym/pileta';
  if (d.includes('clase') || d.includes('pase')) return 'Clases sueltas';
  if (d.includes('torneo')) return 'Torneos';
  if (d.startsWith('egreso')) return 'Egresos';
  return 'Otros';
}

export async function resumenCaja(filtro: FiltroCaja): Promise<ResumenCaja> {
  const base = filtro.fecha ? new Date(`${filtro.fecha}T00:00:00`) : new Date();
  if (filtro.fecha && Number.isNaN(base.getTime())) {
    throw new HttpError(400, 'fecha inválida (YYYY-MM-DD)');
  }

  const periodo = filtro.periodo ?? 'dia';

  /** Apertura del complejo leída de la configuración (define tu "día" si abre hasta medianoche) */
  const { apertura } = await leerHorasComplejo();
  const horaApertura: number = apertura;

  const desde = new Date(base);
  if (filtro.desde) {
    const d = new Date(`${filtro.desde}T00:00:00`);
    if (Number.isNaN(d.getTime())) throw new HttpError(400, 'desde inválido (YYYY-MM-DD)');
    desde.setTime(d.getTime());
  } else {
    desde.setHours(horaApertura, 0, 0, 0);
  }

  let hasta = new Date(desde);
  if (filtro.hasta) {
    const h = new Date(`${filtro.hasta}T00:00:00`);
    if (Number.isNaN(h.getTime())) throw new HttpError(400, 'hasta inválido (YYYY-MM-DD)');
    hasta.setTime(h.getTime());
    hasta.setDate(hasta.getDate() + 1); // fin de día inclusive
  } else if (periodo === 'dia') {
    hasta.setDate(hasta.getDate() + 1); // apertura -> apertura del día siguiente
  } else if (periodo === 'semana') {
    hasta.setDate(hasta.getDate() + 7);
  } else if (periodo === 'mes') {
    hasta.setMonth(hasta.getMonth() + 1);
  } else if (periodo === 'anio') {
    hasta.setFullYear(hasta.getFullYear() + 1);
  } else if (periodo === 'historico') {
    hasta = new Date(); // no usa "hasta" — la query no altera el rango, simplemente no filtra "hasta" abajo
  } else {
    throw new HttpError(400, 'periodo debe ser dia, semana, mes, anio o historico');
  }

  const query = supabaseAdmin
    .from('movimientos_caja')
    .select('id, fecha_hora, tipo_movimiento, monto, metodo_pago, descripcion, reserva_id')
    .gte('fecha_hora', desde.toISOString());

  const { data, error } = periodo === 'historico'
    ? await query.order('fecha_hora', { ascending: false })
    : await query.lt('fecha_hora', hasta.toISOString()).order('fecha_hora', { ascending: false });
  if (error) throw new HttpError(500, error.message);

  const movimientos = (data ?? []) as unknown as Movimiento[];

  let ingresos = 0;
  let egresos = 0;
  const porMetodo: Record<string, number> = {};
  const porOrigenMap = new Map<string, { total: number; movimientos: number }>();

  for (const m of movimientos) {
    const monto = Number(m.monto);
    if (m.tipo_movimiento === 'ingreso') {
      ingresos += monto;
      porMetodo[m.metodo_pago] = (porMetodo[m.metodo_pago] ?? 0) + monto;
    } else {
      egresos += monto;
    }

    const origen = origenDe(m.descripcion);
    const acum = porOrigenMap.get(origen) ?? { total: 0, movimientos: 0 };
    acum.total += m.tipo_movimiento === 'ingreso' ? monto : -monto;
    acum.movimientos += 1;
    porOrigenMap.set(origen, acum);
  }

  return {
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
    ingresos,
    egresos,
    saldo: ingresos - egresos,
    por_metodo_pago: porMetodo,
    por_origen: [...porOrigenMap.entries()]
      .map(([origen, v]) => ({ origen, total: v.total, movimientos: v.movimientos }))
      .sort((a, b) => b.total - a.total),
    movimientos,
  };
}

/** Egreso manual (sueldos, compras, mantenimiento...) */
export async function registrarEgreso(entrada: {
  monto: number;
  metodo_pago: string;
  descripcion: string;
}) {
  if (!(entrada.monto > 0)) throw new HttpError(400, 'El monto debe ser mayor a 0');
  if (!entrada.descripcion?.trim()) throw new HttpError(400, 'La descripción es obligatoria');
  if (!['efectivo', 'transferencia', 'mercado_pago', 'tarjeta'].includes(entrada.metodo_pago)) {
    throw new HttpError(400, 'Método de pago inválido');
  }

  const { data, error } = await supabaseAdmin
    .from('movimientos_caja')
    .insert({
      monto: entrada.monto,
      tipo_movimiento: 'egreso',
      metodo_pago: entrada.metodo_pago as never,
      descripcion: `Egreso: ${entrada.descripcion.trim()}`,
    })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
}
