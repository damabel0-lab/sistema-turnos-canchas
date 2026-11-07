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
export const DURACION_TURNO_MINUTOS = 60;
export const MINUTOS_BLOQUE = 15; // los turnos arrancan en cuartos de hora (00, 15, 30, 45)

/** '2026-11-13T15:00:00+00:00' -> '2026-11-13T15:00:00' */
function quitarOffset(iso: string): string {
  return iso.replace(/([+-]\d{2}:\d{2}|Z)$/, '');
}

/** Calcula las próximas N fechas que caigan en un día de la semana dado.
 * 0 = domingo, 1 = lunes, ..., 6 = sábado. Empieza a buscar desde mañana. */
export function proximasNFechasDiaSemana(diaSemana: number, cantidad: number, desde: Date = new Date()): Date[] {
  const fechas: Date[] = [];
  let fecha = new Date(desde);
  fecha.setDate(fecha.getDate() + 1); // empezar desde mañana para no incluir hoy

  while (fechas.length < cantidad) {
    if (fecha.getDay() === diaSemana) {
      fechas.push(new Date(fecha));
    }
    fecha.setDate(fecha.getDate() + 1);
  }
  return fechas;
}


/**
 * Reservas de un usuario: próximas (futuras, no canceladas) e historial.
 * El cliente solo puede ver las suyas; el staff pasa usuario_id explícito.
 */
export async function reservasDelUsuario(usuarioId: string) {
  if (!usuarioId) throw new HttpError(400, 'usuario_id es obligatorio');

  const hoy = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from('reservas')
    .select('id, fecha, hora_inicio, hora_fin, precio_total, monto_seña, estado, metodo_pago, es_turno_fijo, canchas(nombre, deportes(nombre))')
    .eq('usuario_id', usuarioId)
    .order('fecha', { ascending: false })
    .order('hora_inicio', { ascending: false });
  if (error) throw new HttpError(500, error.message);

  const filas = (data ?? []) as unknown as Array<{
    id: number;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    precio_total: number;
    monto_seña: number;
    estado: string;
    metodo_pago: string | null;
    es_turno_fijo: boolean;
    canchas: { nombre: string; deportes: { nombre: string } | null } | null;
  }>;

  const mapear = (r: (typeof filas)[number]) => ({
    id: r.id,
    fecha: r.fecha,
    hora_inicio: r.hora_inicio,
    hora_fin: r.hora_fin,
    precio_total: Number(r.precio_total),
    monto_seña: Number(r.monto_seña),
    estado: r.estado,
    metodo_pago: r.metodo_pago,
    es_turno_fijo: r.es_turno_fijo,
    cancha: r.canchas?.nombre ?? 'Gimnasio / Pileta',
    deporte: r.canchas?.deportes?.nombre ?? null,
  });

  return {
    proximas: filas
      .filter((r) => r.fecha >= hoy && r.estado !== 'cancelada')
      .reverse()
      .map(mapear),
    historial: filas
      .filter((r) => r.fecha < hoy || r.estado === 'cancelada')
      .map(mapear),
  };
}

/**
 * Cancelación por parte del cliente (solo las suyas y hasta X antes).
 * Política simple por ahora: se puede cancelar cualquier reserva futura.
 */
export async function cancelarPropia(usuarioId: string, reservaId: number) {
  const { data: reserva, error } = await supabaseAdmin
    .from('reservas')
    .select('id, usuario_id, fecha, estado')
    .eq('id', reservaId)
    .single();
  if (error || !reserva) throw new HttpError(404, 'Reserva no encontrada');
  if (reserva.usuario_id !== usuarioId) throw new HttpError(403, 'Esa reserva no es tuya');
  if (reserva.estado !== 'pendiente_seña' && reserva.estado !== 'confirmada') {
    throw new HttpError(409, `No se puede cancelar una reserva "${reserva.estado}"`);
  }

  const { data, error: eUpd } = await supabaseAdmin
    .from('reservas')
    .update({ estado: 'cancelada' })
    .eq('id', reservaId)
    .select()
    .single();
  if (eUpd) throw new HttpError(500, eUpd.message);
  return data;
}

/**
 * Cambia el estado de una reserva y registra el cobro en caja.
 *
 * Transiciones permitidas:
 *   pendiente_seña -> confirmada | cancelada
 *   confirmada     -> completada | cancelada
 *   completada     -> (final)
 *   cancelada      -> (final)
 *
 * Al confirmar se registra el ingreso de la seña (o del total si no tiene).
 * Al completar se registra el saldo restante.
 */
export async function cambiarEstadoReserva(
  id: number,
  nuevoEstado: 'confirmada' | 'cancelada' | 'completada',
  metodoPago?: string | null,
) {
  const { data: reserva, error } = await supabaseAdmin
    .from('reservas')
    .select('*, canchas(nombre), usuarios(nombre, apellido)')
    .eq('id', id)
    .single();
  if (error || !reserva) throw new HttpError(404, 'Reserva no encontrada');

  const actual = reserva.estado as string;
  const transiciones: Record<string, string[]> = {
    pendiente_seña: ['confirmada', 'cancelada'],
    confirmada: ['completada', 'cancelada'],
  };
  if (!(transiciones[actual] ?? []).includes(nuevoEstado)) {
    throw new HttpError(409, `No se puede pasar de "${actual}" a "${nuevoEstado}"`);
  }
  if (nuevoEstado === 'confirmada' && !metodoPago) {
    throw new HttpError(400, 'Para confirmar hay que indicar el método de pago');
  }

  const { data: actualizada, error: eUpd } = await supabaseAdmin
    .from('reservas')
    .update({
      estado: nuevoEstado,
      ...(metodoPago ? { metodo_pago: metodoPago } : {}),
    })
    .eq('id', id)
    .select()
    .single();
  if (eUpd) throw new HttpError(500, eUpd.message);

  // Movimiento de caja según el cobro correspondiente
  const cancha = (reserva.canchas as unknown as { nombre: string } | null)?.nombre ?? 'cancha';
  const cliente = (reserva.usuarios as unknown as { nombre: string; apellido: string } | null)
    ? `${reserva.usuarios.nombre} ${reserva.usuarios.apellido}`
    : 'Cliente';

  let monto = 0;
  let descripcion = '';
  if (nuevoEstado === 'confirmada') {
    monto = Number(reserva.monto_seña) > 0 ? Number(reserva.monto_seña) : Number(reserva.precio_total);
    descripcion = `${Number(reserva.monto_seña) > 0 ? 'Seña' : 'Pago total'} reserva #${id} · ${cancha} · ${cliente}`;
  } else if (nuevoEstado === 'completada') {
    // Si la seña fue 0, al confirmar ya se cobró el total → no hay saldo.
    // Si tenía seña, falta cobrar total - seña.
    const saldo =
      Number(reserva.monto_seña) > 0
        ? Number(reserva.precio_total) - Number(reserva.monto_seña)
        : 0;
    if (saldo > 0 && reserva.metodo_pago) {
      monto = saldo;
      descripcion = `Saldo reserva #${id} · ${cancha} · ${cliente}`;
    }
  }

  if (monto > 0) {
    const { error: eCaja } = await supabaseAdmin.from('movimientos_caja').insert({
      reserva_id: id,
      usuario_id: reserva.usuario_id,
      monto,
      tipo_movimiento: 'ingreso',
      metodo_pago: (metodoPago ?? reserva.metodo_pago ?? 'efectivo') as never,
      descripcion,
    });
    if (eCaja) throw new HttpError(500, `Reserva actualizada pero falló el registro en caja: ${eCaja.message}`);
  }

  return { reserva: actualizada, caja_registrada: monto > 0 ? monto : 0 };
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

  const inicioMin = aMinutos(hora_inicio);
  const finMin = aMinutos(hora_fin);

  // Los turnos duran exactamente 1 hora y arrancan en cuartos de hora (00, 15, 30, 45)
  if (finMin - inicioMin !== DURACION_TURNO_MINUTOS) {
    throw new HttpError(400, `El turno debe durar exactamente ${DURACION_TURNO_MINUTOS} minutos`);
  }
  if (inicioMin % MINUTOS_BLOQUE !== 0) {
    throw new HttpError(400, `La hora de inicio debe ser en cuartos de hora (${MINUTOS_BLOQUE} min)`);
  }
  if (inicioMin < HORA_APERTURA * 60 || finMin > HORA_CIERRE * 60) {
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

  const minutosApertura = HORA_APERTURA * 60; // 480 = 08:00
  const minutosCierre = HORA_CIERRE * 60; // 1380 = 23:00

  // Los turnos duran 1 hora y arrancan en cuartos de hora (00, 15, 30, 45)
  for (let inicioMin = minutosApertura; inicioMin + DURACION_TURNO_MINUTOS <= minutosCierre; inicioMin += MINUTOS_BLOQUE) {
    const finMin = inicioMin + DURACION_TURNO_MINUTOS;
    const hora = `${String(Math.floor(inicioMin / 60)).padStart(2, '0')}:${String(inicioMin % 60).padStart(2, '0')}`;
    const finHora = `${String(Math.floor(finMin / 60)).padStart(2, '0')}:${String(finMin % 60).padStart(2, '0')}`;

    const ocupada = (reservas ?? []).some((r) => r.hora_inicio.slice(0, 5) < finHora && r.hora_fin.slice(0, 5) > hora);
    const bloqueada = (bloqueos ?? []).some((b) => {
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

/**
 * Proyecta turnos fijos recurrentes.
 *
 * Crea una reserva por cada fecha que caiga en el día de la semana indicado,
 * durante la cantidad de semanas pedida, siempre a la misma hora y cancha.
 *
 * Valida solapamientos y bloqueos para cada fecha individualmente.
 */
export async function proyectarTurnosFijos(entrada: {
  usuario_id: string;
  cancha_id: number;
  dia_semana: number; // 0 = domingo ... 6 = sábado
  hora: string; // HH:MM (debe ser múltiplo de 15)
  semanas: number; // cuántas semanas proyectar
  precio_total?: number;
  monto_seña?: number;
  metodo_pago?: string | null;
  estado?: 'pendiente_seña' | 'confirmada';
}) {
  const { usuario_id, cancha_id, dia_semana, hora, semanas } = entrada;

  if (!(dia_semana >= 0 && dia_semana <= 6)) {
    throw new HttpError(400, 'dia_semana debe estar entre 0 (domingo) y 6 (sábado)');
  }
  if (!(semanas >= 1 && semanas <= 52)) {
    throw new HttpError(400, 'semanas debe estar entre 1 y 52');
  }
  if (!/^\d{2}:\d{2}$/.test(hora)) {
    throw new HttpError(400, 'hora debe tener formato HH:MM');
  }

  const inicioMin = aMinutos(hora);
  if (inicioMin % MINUTOS_BLOQUE !== 0) {
    throw new HttpError(400, `La hora debe ser en cuartos de hora (${MINUTOS_BLOQUE} min)`);
  }
  if (inicioMin < HORA_APERTURA * 60 || inicioMin + DURACION_TURNO_MINUTOS > HORA_CIERRE * 60) {
    throw new HttpError(400, `El horario debe estar entre ${HORA_APERTURA}:00 y ${HORA_CIERRE}:00`);
  }

  const horaFin = `${String(Math.floor((inicioMin + DURACION_TURNO_MINUTOS) / 60)).padStart(2, '0')}:${String((inicioMin + DURACION_TURNO_MINUTOS) % 60).padStart(2, '0')}`;

  const fechas = proximasNFechasDiaSemana(dia_semana, semanas);

  const creadas: Array<{ fecha: string; reserva_id: number }> = [];
  const errores: Array<{ fecha: string; error: string }> = [];

  for (const fecha of fechas) {
    const fechaStr = fecha.toISOString().slice(0, 10);
    try {
      const reserva = await crearReserva({
        usuario_id,
        cancha_id,
        fecha: fechaStr,
        hora_inicio: hora,
        hora_fin: horaFin,
        precio_total: entrada.precio_total,
        monto_seña: entrada.monto_seña,
        metodo_pago: entrada.metodo_pago,
        estado: entrada.estado,
      });
      creadas.push({ fecha: fechaStr, reserva_id: reserva.id });
    } catch (err) {
      errores.push({
        fecha: fechaStr,
        error: err instanceof Error ? err.message : 'Error desconocido',
      });
    }
  }

  return {
    creadas,
    errores,
    total_creadas: creadas.length,
    total_solicitadas: semanas,
  };
}

