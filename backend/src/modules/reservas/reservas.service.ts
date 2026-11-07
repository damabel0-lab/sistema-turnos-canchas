import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';

/**
 * Disponibilidad de una cancha para una fecha.
 * Devuelve las horas del día con su estado: libre / ocupada / bloqueada.
 * Horario de atención del complejo: 08:00 a 23:00 (ajustable).
 */
export const HORA_APERTURA = 8;
export const HORA_CIERRE = 23;

/** '2026-11-13T15:00:00+00:00' -> '2026-11-13T15:00:00' */
function quitarOffset(iso: string): string {
  return iso.replace(/([+-]\d{2}:\d{2}|Z)$/, '');
}

export interface EstadoHora {
  hora: string; // HH:00
  estado: 'libre' | 'ocupada' | 'bloqueada';
}

export async function disponibilidad(canchaId: number, fecha: string): Promise<EstadoHora[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new HttpError(400, 'fecha debe tener formato YYYY-MM-DD');
  }

  const { data: cancha, error: eCancha } = await supabaseAdmin
    .from('canchas')
    .select('id, activa')
    .eq('id', canchaId)
    .single();
  if (eCancha || !cancha) throw new HttpError(404, 'Cancha no encontrada');
  if (!cancha.activa) throw new HttpError(400, 'La cancha no está activa');

  // Reservas que ocupan el día (canceladas no bloquean)
  const { data: reservas, error: eReservas } = await supabaseAdmin
    .from('reservas')
    .select('hora_inicio, hora_fin, estado')
    .eq('cancha_id', canchaId)
    .eq('fecha', fecha)
    .neq('estado', 'cancelada');
  if (eReservas) throw new HttpError(500, eReservas.message);

  // Bloqueos (mantenimiento, eventos, lluvia) — pueden cruzar medianoche
  const inicioDia = `${fecha}T00:00:00`;
  const finDia = `${fecha}T23:59:59`;
  const { data: bloqueos, error: eBloqueos } = await supabaseAdmin
    .from('bloqueos_horarios')
    .select('fecha_inicio, fecha_fin, motivo')
    .eq('cancha_id', canchaId)
    .lte('fecha_inicio', finDia)
    .gte('fecha_fin', inicioDia);
  if (eBloqueos) throw new HttpError(500, eBloqueos.message);

  const horas: EstadoHora[] = [];

  for (let h = HORA_APERTURA; h < HORA_CIERRE; h++) {
    const hora = `${String(h).padStart(2, '0')}:00`;
    const finHora = `${String(h + 1).padStart(2, '0')}:00`;

    const ocupada = (reservas ?? []).some((r) => r.hora_inicio.slice(0, 5) < finHora && r.hora_fin.slice(0, 5) > hora);
    const bloqueada = (bloqueos ?? []).some((b) => {
      // Comparación "wall time": los timestamps se guardan como hora local
      // sin offset (el frontend envía 'YYYY-MM-DDTHH:MM:SS' sin zona), pero
      // Postgres los devuelve con '+00:00'. Normalizamos quitando el offset
      // y parseando ambos lados igual (UTC) para que la comparación sea
      // manzana con manzana.
      const bInicio = new Date(`${quitarOffset(b.fecha_inicio)}Z`);
      const bFin = new Date(`${quitarOffset(b.fecha_fin)}Z`);
      const hInicio = new Date(`${fecha}T${hora}:00Z`);
      const hFin = new Date(`${fecha}T${finHora}:00Z`);
      return bInicio < hFin && bFin > hInicio;
    });

    horas.push({ hora, estado: ocupada ? 'ocupada' : bloqueada ? 'bloqueada' : 'libre' });
  }

  return horas;
}
