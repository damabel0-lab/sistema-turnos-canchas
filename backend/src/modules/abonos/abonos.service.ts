import { supabaseAdmin } from '../../config/supabase.js';
import { hoyLocal, isoMinLocal } from '../../lib/fecha.js';
import { HttpError } from '../../middleware/error.js';
import { crearNotificacion, notificarStaff } from '../notifications/notifications.service.js';
import { leerConfigComplejo } from '../../config/complejoConfig.js';
import { suscripcionVigente } from '../suscripciones/suscripciones.service.js';

export type ServicioAbono = 'gym' | 'pileta';

export interface Abono {
  id: number;
  usuario_id: string;
  disciplina_id: number | null;
  clases_totales: number;
  clases_disponibles: number;
  fecha_inicio: string;
  fecha_vencimiento: string;
  monto_pagado: number;
  activo: boolean;
  servicio: ServicioAbono | null;
  estado: 'solicitado' | 'activo' | 'cancelado';
}

export interface VenderAbono {
  usuario_id: string;
  servicio: ServicioAbono;
  metodo_pago?: string;
  monto_pagado?: number;
  fecha_vencimiento?: string;
}

export interface AprobarSolicitud {
  metodo_pago?: string;
  monto_pagado?: number;
  fecha_vencimiento?: string;
}

/** hoy + 1 mes (formato YYYY-MM-DD) */
function unMesDesdeHoy(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return isoMinLocal(d);
}

function precioDe(servicio: ServicioAbono, config: {
  precio_mensual_gym: number | null;
  precio_mensual_pileta: number | null;
}): number | null {
  const n = servicio === 'gym' ? config.precio_mensual_gym : config.precio_mensual_pileta;
  return n != null && Number(n) > 0 ? Number(n) : null;
}

function nombreServicio(servicio: ServicioAbono): string {
  return servicio === 'gym' ? 'Gimnasio' : 'Pileta';
}

/** Registra el ingreso de la venta del abono en la caja (descripción: abono → categoría 'Abonos gym/pileta') */
async function registrarEnCaja(entrada: {
  usuario_id: string;
  descripcion: string;
  monto: number;
  metodo_pago: string;
  complejo_id: number;
}) {
  const { error } = await supabaseAdmin.from('movimientos_caja').insert({
    reserva_id: null,
    usuario_id: entrada.usuario_id,
    complejo_id: entrada.complejo_id,
    monto: entrada.monto,
    tipo_movimiento: 'ingreso',
    metodo_pago: entrada.metodo_pago,
    descripcion: entrada.descripcion,
  });
  if (error) {
    // El abono ya quedó creado/activo — no debe revertirse por un problema de caja
    console.error('Abono activado pero falló el registro en caja:', error.message);
  }
}

/** true si el error indica que falta correr la migración de abonos (docs/abonos_mensualidad.sql) */
function esMigracionAbonosFaltante(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    (msg.includes('servicio') || msg.includes('estado')) &&
    (msg.includes('column') || msg.includes('schema'))
  );
}

export async function listarAbonos(complejoId: number) {
  const { data, error } = await supabaseAdmin
    .from('abonos')
    .select('*')
    .eq('complejo_id', complejoId)
    .order('fecha_vencimiento');
  if (error) {
    if (esMigracionAbonosFaltante(error)) {
      console.warn('Falta la migración de abonos (docs/abonos_mensualidad.sql) — lista vacía.');
      return [];
    }
    throw new HttpError(500, error.message);
  }
  return data ?? [];
}

export async function listarAbonosDelUsuario(usuarioId: string) {
  const { data, error } = await supabaseAdmin
    .from('abonos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('fecha_vencimiento');
  if (error) {
    if (esMigracionAbonosFaltante(error)) {
      console.warn('Falta la migración de abonos (docs/abonos_mensualidad.sql) — lista vacía.');
      return [];
    }
    throw new HttpError(500, error.message);
  }
  return data ?? [];
}

/** Solicitudes de mensualidad pendientes de activación (mostrador de UN complejo) */
export async function listarSolicitudes(complejoId: number) {
  const { data, error } = await supabaseAdmin
    .from('abonos')
    .select('id, usuario_id, servicio, monto_pagado, fecha_vencimiento, usuarios(nombre, apellido, telefono)')
    .eq('complejo_id', complejoId)
    .eq('estado', 'solicitado')
    .eq('activo', false)
    .order('id', { ascending: true });
  if (error) {
    if (esMigracionAbonosFaltante(error)) {
      console.warn('Falta la migración de abonos (docs/abonos_mensualidad.sql) — lista vacía.');
      return [];
    }
    throw new HttpError(500, error.message);
  }
  return (data ?? []) as unknown as Array<Abono & SolicitudVista>;
}

interface SolicitudVista {
  usuarios: { nombre: string; apellido: string | null; telefono: string | null } | null;
}

/** Venta directa en mostrador (staff): abono activo desde el momento */
export async function venderAbono(datos: VenderAbono, complejoId: number) {
  const servicio = datos.servicio;
  if (!servicio || !['gym', 'pileta'].includes(servicio)) {
    throw new HttpError(400, 'servicio debe ser "gym" o "pileta"');
  }
  if (!datos.usuario_id) throw new HttpError(400, 'usuario_id es obligatorio');

  if (!(await suscripcionVigente(complejoId))) {
    throw new HttpError(403, 'Este complejo no está disponible por el momento');
  }

  const config = await leerConfigComplejo(complejoId);
  const habilitado = servicio === 'gym' ? config.gym : config.pileta;
  if (!habilitado) throw new HttpError(400, `El servicio de ${nombreServicio(servicio)} no está habilitado en este complejo`);

  const monto = datos.monto_pagado ?? precioDe(servicio, config) ?? 0;
  const vencimiento = datos.fecha_vencimiento ?? unMesDesdeHoy();
  const metodoPago = datos.metodo_pago ?? 'efectivo';

  // No permitir duplicado mensual activo/solicitado para el mismo servicio (en ESTE complejo)
  const { data: existente } = await supabaseAdmin
    .from('abonos')
    .select('id')
    .eq('usuario_id', datos.usuario_id)
    .eq('servicio', servicio)
    .eq('complejo_id', complejoId)
    .neq('estado', 'cancelado')
    .limit(1)
    .maybeSingle();
  if (existente) {
    throw new HttpError(409, 'Esa persona ya tiene una mensualidad de este servicio (o una solicitada)');
  }

  const { data, error } = await supabaseAdmin
    .from('abonos')
    .insert({
      usuario_id: datos.usuario_id,
      servicio,
      clases_totales: 1,
      clases_disponibles: 1,
      fecha_inicio: hoyLocal(),
      fecha_vencimiento: vencimiento,
      monto_pagado: monto,
      activo: true,
      estado: 'activo',
      disciplina_id: null,
      complejo_id: complejoId,
    })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);

  const nombreServicioLabel = nombreServicio(servicio);
  await registrarEnCaja({
    usuario_id: datos.usuario_id,
    descripcion: `Abono ${nombreServicioLabel} mensual — venta en mostrador`,
    monto,
    metodo_pago: metodoPago,
    complejo_id: complejoId,
  });

  const { data: clienteInfo } = await supabaseAdmin
    .from('usuarios')
    .select('nombre, apellido')
    .eq('id', datos.usuario_id)
    .single();
  const nombreCliente = clienteInfo ? `${clienteInfo.nombre} ${clienteInfo.apellido}` : 'Un cliente';

  await crearNotificacion({
    usuario_id: datos.usuario_id,
    tipo: 'abono',
    titulo: `¡Tu mensualidad de ${nombreServicioLabel} está activa!`,
    cuerpo: `Ya podés usar el servicio. Tu mensualidad vence el ${vencimiento}. Si todavía no pagaste, abonala en recepción.`,
  });
  await notificarStaff(
    'abono',
    'Mensualidad vendida en mostrador',
    `${nombreCliente} activó mensualidad de ${nombreServicioLabel} · $${Number(monto).toLocaleString('es-AR')} · ${metodoPago}`,
    complejoId,
  );

  return data;
}

/** El cliente solicita una mensualidad DESDE LA APP para un complejo puntual (queda pendiente de pago/activación en recepción) */
export async function solicitarAbono(usuarioId: string, servicioRaw: unknown, complejoId: number) {
  const servicio = servicioRaw as ServicioAbono;
  if (!servicio || !['gym', 'pileta'].includes(servicio)) {
    throw new HttpError(400, 'servicio debe ser "gym" o "pileta"');
  }

  if (!(await suscripcionVigente(complejoId))) {
    throw new HttpError(403, 'Este complejo no está disponible por el momento');
  }

  const config = await leerConfigComplejo(complejoId);
  const habilitado = servicio === 'gym' ? config.gym : config.pileta;
  if (!habilitado) throw new HttpError(400, `El servicio de ${nombreServicio(servicio)} no está habilitado`);

  // Evitar solicitudes duplicadas / abonos activos del mismo servicio (en ESTE complejo)
  const { data: existente } = await supabaseAdmin
    .from('abonos')
    .select('id, estado')
    .eq('usuario_id', usuarioId)
    .eq('servicio', servicio)
    .eq('complejo_id', complejoId)
    .neq('estado', 'cancelado')
    .limit(1)
    .maybeSingle();
  if (existente) {
    throw new HttpError(
      409,
      existente.estado === 'solicitado'
        ? 'Ya pediste esta mensualidad — acercate al mostrador para pagar y activarla'
        : 'Ya tenés una mensualidad activa de este servicio',
    );
  }

  const monto = precioDe(servicio, config) ?? 0;
  const vencimiento = unMesDesdeHoy();

  const { data, error } = await supabaseAdmin
    .from('abonos')
    .insert({
      usuario_id: usuarioId,
      servicio,
      clases_totales: 1,
      clases_disponibles: 1,
      fecha_inicio: hoyLocal(),
      fecha_vencimiento: vencimiento,
      monto_pagado: monto,
      activo: false,
      estado: 'solicitado',
      disciplina_id: null,
      complejo_id: complejoId,
    })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);

  // Notificaciones: cliente y staff
  try {
    const { data: clienteInfo } = await supabaseAdmin
      .from('usuarios')
      .select('nombre, apellido')
      .eq('id', usuarioId)
      .single();
    const nombreCliente = clienteInfo ? `${clienteInfo.nombre} ${clienteInfo.apellido}` : 'Un cliente';
    await crearNotificacion({
      usuario_id: usuarioId,
      tipo: 'abono',
      titulo: 'Solicitud enviada',
      cuerpo: `Pediste mensualidad de ${nombreServicio(servicio)} ($${Number(monto).toLocaleString('es-AR')}). Acercate al mostrador para activarla.`,
    });
    await notificarStaff(
      'abono',
      'Mensualidad por activar',
      `${nombreCliente} quiere activar su mensualidad de ${nombreServicio(servicio)} · $${Number(monto).toLocaleString('es-AR')}`,
      complejoId,
    );
  } catch (e) {
    console.warn('No se pudo notificar la solicitud de abono', e);
  }

  return data;
}

/** Activar una solicitud (mostrador, tras cobrar): pasa a activo, registra en caja y avisa al cliente */
export async function aprobarSolicitud(id: number, datos: AprobarSolicitud, complejoId: number) {
  const { data: actual, error: eGet } = await supabaseAdmin
    .from('abonos')
    .select('*')
    .eq('id', id)
    .eq('complejo_id', complejoId)
    .single();
  if (eGet || !actual) throw new HttpError(404, 'Solicitud no encontrada');
  if (actual.estado !== 'solicitado') throw new HttpError(409, 'La solicitud ya fue resuelta');

  const config = await leerConfigComplejo(complejoId);
  const servicio = actual.servicio as ServicioAbono;
  const monto = datos.monto_pagado ?? precioDe(servicio, config) ?? Number(actual.monto_pagado) ?? 0;
  const vencimiento = datos.fecha_vencimiento ?? unMesDesdeHoy();
  const metodoPago = datos.metodo_pago ?? 'efectivo';

  const { data, error } = await supabaseAdmin
    .from('abonos')
    .update({
      estado: 'activo',
      activo: true,
      monto_pagado: monto,
      fecha_inicio: hoyLocal(),
      fecha_vencimiento: vencimiento,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new HttpError(500, error.message);

  const nombreServicioLabel = nombreServicio(servicio);
  await registrarEnCaja({
    usuario_id: actual.usuario_id,
    descripcion: `Abono ${nombreServicioLabel} mensual — cobro de solicitud`,
    monto,
    metodo_pago: metodoPago,
    complejo_id: complejoId,
  });

  const { data: clienteInfo } = await supabaseAdmin
    .from('usuarios')
    .select('nombre, apellido')
    .eq('id', actual.usuario_id)
    .single();
  const nombreCliente = clienteInfo ? `${clienteInfo.nombre} ${clienteInfo.apellido}` : 'Un cliente';

  await crearNotificacion({
    usuario_id: actual.usuario_id,
    tipo: 'abono',
    titulo: `¡Tu mensualidad de ${nombreServicioLabel} está activa!`,
    cuerpo: `Se activó en recepción. Podés usar el servicio hasta el ${vencimiento}.`,
  });
  await notificarStaff(
    'abono',
    'Mensualidad aprobada',
    `${nombreCliente} activó mensualidad de ${nombreServicioLabel} · $${Number(monto).toLocaleString('es-AR')} · ${metodoPago}`,
    complejoId,
  );

  return data;
}

/** Rechazar una solicitud (mostrador del complejo activo): no se aprueba ni se cobra */
export async function rechazarSolicitud(id: number, complejoId: number) {
  const { data: actual } = await supabaseAdmin
    .from('abonos')
    .select('id, estado')
    .eq('id', id)
    .eq('complejo_id', complejoId)
    .maybeSingle();
  if (!actual) throw new HttpError(404, 'Solicitud no encontrada');
  if (actual.estado !== 'solicitado') throw new HttpError(409, 'La solicitud ya fue resuelta');

  const { data, error } = await supabaseAdmin
    .from('abonos')
    .update({ estado: 'cancelado', activo: false })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new HttpError(500, error.message);

  const usuarioId = (data as unknown as { usuario_id: string } | null)?.usuario_id;
  if (usuarioId) {
    await crearNotificacion({
      usuario_id: usuarioId,
      tipo: 'abono',
      titulo: 'Solicitud de mensualidad rechazada',
      cuerpo: 'No se pudo activar tu mensualidad. Acercate a recepción para más información.',
    });
  }
  return data;
}

/** Consumir 1 clase de un abono activo (modelo legacy de clases). Devuelve cuántas quedan. */
export async function consumirClase(usuarioId: string, disciplinaId?: number | null) {
  const { data: abonos, error } = await supabaseAdmin
    .from('abonos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('activo', true)
    .order('fecha_vencimiento', { ascending: true });
  if (error) throw new HttpError(500, error.message);

  const apto = (abonos ?? []).find((a: any) => {
    const venc = new Date(a.fecha_vencimiento);
    if (venc < new Date()) return false; // vencido
    if (disciplinaId !== undefined && a.disciplina_id !== null && a.disciplina_id !== disciplinaId) return false;
    return a.clases_disponibles > 0;
  });

  if (!apto) throw new HttpError(409, 'No quedan clases disponibles en ningún abono activo');

  const { data, error: eUpd } = await supabaseAdmin
    .from('abonos')
    .update({ clases_disponibles: apto.clases_disponibles - 1 })
    .eq('id', apto.id)
    .select()
    .single();
  if (eUpd) throw new HttpError(500, eUpd.message);

  return {
    abono_id: data.id,
    clases_disponibles: data.clases_disponibles,
    clases_totales: data.clases_totales,
    fecha_vencimiento: data.fecha_vencimiento,
  };
}

export async function listarAbonosVencidos(complejoId: number) {
  const hoy = hoyLocal();
  const { data, error } = await supabaseAdmin
    .from('abonos')
    .select('*')
    .eq('activo', true)
    .eq('complejo_id', complejoId)
    .lt('fecha_vencimiento', hoy);
  if (error) throw new HttpError(500, error.message);
  return data ?? [];
}

/** Marcar como vencido (fin de período) los abonos vencidos de este complejo */
export async function cerrarAbonosVencidos(complejoId: number) {
  const hoy = hoyLocal();
  const { error } = await supabaseAdmin
    .from('abonos')
    .update({ activo: false, estado: 'cancelado' })
    .eq('activo', true)
    .eq('complejo_id', complejoId)
    .lt('fecha_vencimiento', hoy);
  if (error) throw new HttpError(500, error.message);
  return { ok: true };
}
