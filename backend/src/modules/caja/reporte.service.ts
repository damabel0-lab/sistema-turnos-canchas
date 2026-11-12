import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';

export interface IngresoPorDisciplina {
  origen: string;
  total: number;
  movimientos: number;
}

export interface ReporteDisciplina {
  desde: string;
  hasta: string;
  total_general: number;
  por_disciplina: IngresoPorDisciplina[];
}

/** Clasifica el origen del ingreso según la descripción generada por el backend */
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

export async function reportePorDisciplina(fecha: string | undefined, complejoId: number): Promise<ReporteDisciplina> {
  const base = fecha ? new Date(`${fecha}T00:00:00`) : new Date();
  if (fecha && Number.isNaN(base.getTime())) {
    throw new HttpError(400, 'fecha inválida (YYYY-MM-DD)');
  }

  const desde = new Date(base);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(desde);
  hasta.setDate(hasta.getDate() + 1);

  const { data, error } = await supabaseAdmin
    .from('movimientos_caja')
    .select('monto, tipo_movimiento, descripcion')
    .eq('complejo_id', complejoId)
    .gte('fecha_hora', desde.toISOString())
    .lt('fecha_hora', hasta.toISOString());
  if (error) throw new HttpError(500, error.message);

  const filas = (data ?? []) as Array<{ monto: number; tipo_movimiento: string; descripcion: string }>;

  const mapa = new Map<string, { total: number; movimientos: number }>();
  let totalGeneral = 0;

  for (const f of filas) {
    const monto = Number(f.monto);
    const origen = origenDe(f.descripcion);
    const acum = mapa.get(origen) ?? { total: 0, movimientos: 0 };
    if (f.tipo_movimiento === 'ingreso') {
      acum.total += monto;
      totalGeneral += monto;
    } else {
      acum.total -= monto;
      totalGeneral -= monto;
    }
    acum.movimientos += 1;
    mapa.set(origen, acum);
  }

  return {
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
    total_general: totalGeneral,
    por_disciplina: [...mapa.entries()]
      .map(([origen, v]) => ({ origen, total: v.total, movimientos: v.movimientos }))
      .sort((a, b) => b.total - a.total),
  };
}
