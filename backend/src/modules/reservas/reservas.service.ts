import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';
import { cotizar, aMinutos } from '../../services/tarifas/cotizador.js';

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

/**
 * Grilla del día para el admin: todas las canchas activas con sus reservas
 * y bloqueos en la fecha pedida.
 */
export interface ItemGrilla {
  hora: string;
  tipo: 'reserva' | 'bloqueo';
  estado?: string;
  reserva_id?: number;
  cliente?: string;
  monto?: number;
  motivo?: string;
}

export interface FilaGrilla {
  cancha_id: number;
  cancha: string;
  deporte: string | null;
  items: ItemGrilla[];
}

export async function grillaDelDia(fecha: string): Promise<FilaGrilla[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new HttpError(400, 'fecha debe tener formato YYYY-MM-DD');
  }

  const [canchas, reservas, bloqueos] = await Promise.all([
    supabaseAdmin
      .from('canchas')
      .select('id, nombre, activa, deportes(nombre)')
      .order('nombre'),
    supabaseAdmin
      .from('reservas')
      .select(
        'id, cancha_id, hora_inicio, hora_fin, precio_total, monto_seña, estado, usuarios(nombre, apellido)',
      )
      .eq('fecha', fecha)
      .neq('estado', 'cancelada'),
    supabaseAdmin
      .from('bloqueos_horarios')
      .select('cancha_id, fecha_inicio, fecha_fin, motivo')
      .lte('fecha_inicio', `${fecha}T${HORA_CIERRE}:00`)
      .gte('fecha_fin', `${fecha}T${HORA_APERTURA}:00`),
  ]);

  if (canchas.error) throw new HttpError(500, canchas.error.message);
  if (reservas.error) throw new HttpError(500, reservas.error.message);
  if (bloqueos.error) throw new HttpError(500, bloqueos.error.message);

  // (casts: sin tipos generados de Supabase, el parser de tipos se confunde con "monto_seña")
  const filasCan = canchas.data as unknown as Array<{
    id: number;
    nombre: string;
    activa: boolean;
    deportes: { nombre: string } | null;
  }>;
  const filasRes = (reservas.data ?? []) as unknown as Array<{
    id: number;
    cancha_id: number;
    hora_inicio: string;
    hora_fin: string;
    precio_total: number;
    monto_seña: number;
    estado: string;
    usuarios: { nombre: string; apellido: string } | null;
  }>;
  const filasBlo = (bloqueos.data ?? []) as unknown as Array<{
    cancha_id: number;
    fecha_inicio: string;
    fecha_fin: string;
    motivo: string;
  }>;

  const filas: FilaGrilla[] = filasCan.map((c) => {
    const items: ItemGrilla[] = [];

    for (const r of filasRes.filter((x) => x.cancha_id === c.id)) {
      const cliente = r.usuarios;
      // Marcamos cada hora que cubre la reserva para pintarla en la grilla
      for (let m = aMinutos(r.hora_inicio); m < aMinutos(r.hora_fin); m += 60) {
        items.push({
          hora: `${String(Math.floor(m / 60)).padStart(2, '0')}:00`,
          tipo: 'reserva',
          estado: r.estado,
          reserva_id: r.id,
          cliente: cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Cliente',
          monto: r.estado === 'confirmada' ? Number(r.precio_total) : Number(r.monto_seña),
        });
      }
    }

    for (const b of filasBlo.filter((x) => x.cancha_id === c.id)) {
      const inicio = Math.max(aMinutos(quitarOffset(b.fecha_inicio).slice(11, 16)), HORA_APERTURA * 60);
      const fin = Math.min(aMinutos(quitarOffset(b.fecha_fin).slice(11, 16)), HORA_CIERRE * 60);
      for (let m = inicio; m < fin; m += 60) {
        items.push({
          hora: `${String(Math.floor(m / 60)).padStart(2, '0')}:00`,
          tipo: 'bloqueo',
          motivo: b.motivo,
        });
      }
    }

    return {
      cancha_id: c.id,
      cancha: c.nombre,
      deporte: c.deportes?.nombre ?? null,
      items,
    };
  });

  return filas;
}

export interface NuevaReserva {
  usuario_id?: string | null;
  cancha_id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  /** Si no viene, se calcula con el cotizador */
  precio_total?: number;
  monto_seña?: number;
  metodo_pago?: string | null;
  estado?: 'pendiente_seña' | 'confirmada';
  /** Para la carga manual del admin: cliente sin cuenta */
  cliente_nombre?: string | null;
}

/**
 * Crea una reserva validando TODO en el servidor:
 * 1. que la cancha exista y esté activa
 * 2. horario dentro del día y coherente
 * 3. que ninguna hora esté ocupada por otra reserva (no cancelada)
 * 4. que ninguna hora caiga en un bloqueo
 * 5. si no trae precio, lo calcula con el cotizador
 */
export async function crearReserva(entrada: NuevaReserva) {
  const { cancha_id, fecha, hora_inicio, hora_fin } = entrada;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new HttpError(400, 'fecha inválida (YYYY-MM-DD)');
  if (aMinutos(hora_fin) <= aMinutos(hora_inicio)) {
    throw new HttpError(400, 'hora_fin debe ser posterior a hora_inicio');
  }
  if (aMinutos(hora_inicio) < HORA_APERTURA * 60 || aMinutos(hora_fin) > HORA_CIERRE * 60) {
    throw new HttpError(400, `El horario debe estar entre ${HORA_APERTURA}:00 y ${HORA_CIERRE}:00`);
  }

  // 1. cancha activa
  const { data: cancha, error: eCancha } = await supabaseAdmin
    .from('canchas')
    .select('id, activa')
    .eq('id', cancha_id)
    .single();
  if (eCancha || !cancha) throw new HttpError(404, 'Cancha no encontrada');
  if (!cancha.activa) throw new HttpError(400, 'La cancha no está activa');

  // 3. superposición con reservas existentes
  const { data: reservas, error: eReservas } = await supabaseAdmin
    .from('reservas')
    .select('hora_inicio, hora_fin, estado')
    .eq('cancha_id', cancha_id)
    .eq('fecha', fecha)
    .neq('estado', 'cancelada');
  if (eReservas) throw new HttpError(500, eReservas.message);

  const solapa = (reservas ?? []).some(
    (r) => r.hora_inicio.slice(0, 5) < hora_fin && r.hora_fin.slice(0, 5) > hora_inicio,
  );
  if (solapa) throw new HttpError(409, 'Ese horario ya está reservado (alguien ganó la carrera)');

  // 4. bloqueos
  const { data: bloqueos, error: eBloqueos } = await supabaseAdmin
    .from('bloqueos_horarios')
    .select('fecha_inicio, fecha_fin, motivo')
    .eq('cancha_id', cancha_id)
    .lte('fecha_inicio', `${fecha}T${hora_fin}:00`)
    .gte('fecha_fin', `${fecha}T${hora_inicio}:00`);
  if (eBloqueos) throw new HttpError(500, eBloqueos.message);
  if ((bloqueos ?? []).length > 0) {
    throw new HttpError(409, `Horario bloqueado: ${bloqueos![0].motivo}`);
  }

  // 5. precio (si no viene calculado)
  let precio_total = entrada.precio_total;
  let monto_seña = entrada.monto_seña;
  if (precio_total == null) {
    const cotizacion = await cotizar({
      cancha_id,
      fecha,
      hora_inicio,
      hora_fin,
      usuario_id: entrada.usuario_id ?? null,
    });
    precio_total = cotizacion.precio_total;
    monto_seña = cotizacion.monto_seña;
  }

  const { data, error } = await supabaseAdmin
    .from('reservas')
    .insert({
      usuario_id: entrada.usuario_id ?? null,
      cancha_id,
      fecha,
      hora_inicio,
      hora_fin,
      precio_total,
      monto_seña: monto_seña ?? 0,
      metodo_pago: (entrada.metodo_pago ?? null) as never,
      estado: entrada.estado ?? 'pendiente_seña',
    })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
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
