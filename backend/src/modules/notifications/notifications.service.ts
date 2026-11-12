import { supabaseAdmin } from '../../config/supabase.js';
import { hoyLocal, mananaLocal } from '../../lib/fecha.js';
import { HttpError } from '../../middleware/error.js';

export interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  leida: boolean;
  creado_en: string;
}

/** true si el error indica que la tabla notificaciones no existe en Supabase
 *  (ej: "Could not find the table 'public.notificaciones' in the schema cache") */
function esTablaNotificacionesFaltante(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    (msg.includes('notificaciones') && (msg.includes('schema cache') || msg.includes('not find the table')))
  );
}

/** Listar notificaciones de un usuario */
export async function listarNotificaciones(usuarioId: string) {
  const { data, error } = await supabaseAdmin
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: false });
  if (error) {
    if (esTablaNotificacionesFaltante(error)) {
      console.warn('Tabla notificaciones no existe — devolviendo lista vacía. Ejecutar docs/notificaciones.sql en Supabase.');
      return [];
    }
    throw new HttpError(500, error.message);
  }
  return data ?? [];
}

/** Marcar como leída */
export async function leerNotificacion(id: string, usuarioId: string) {
  const { error } = await supabaseAdmin
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', id)
    .eq('usuario_id', usuarioId);
  if (error) {
    if (esTablaNotificacionesFaltante(error)) {
      console.warn('Tabla notificaciones no existe — se omite el update. Ejecutar docs/notificaciones.sql en Supabase.');
      return { ok: true };
    }
    throw new HttpError(404, 'Notificación no encontrada');
  }
  return { ok: true };
}

/** Marcar TODAS como leídas */
export async function marcarTodasLeidas(usuarioId: string) {
  const { error } = await supabaseAdmin
    .from('notificaciones')
    .update({ leida: true })
    .eq('usuario_id', usuarioId)
    .eq('leida', false);
  if (error) {
    if (esTablaNotificacionesFaltante(error)) return { ok: true, actualizadas: 0 };
    throw new HttpError(500, error.message);
  }
  return { ok: true };
}

/** Borrar TODAS las notificaciones del usuario */
export async function eliminarTodasNotificaciones(usuarioId: string) {
  const { error } = await supabaseAdmin
    .from('notificaciones')
    .delete()
    .eq('usuario_id', usuarioId);
  if (error) {
    if (esTablaNotificacionesFaltante(error)) return { ok: true, borradas: 0 };
    throw new HttpError(500, error.message);
  }
  return { ok: true };
}

/** Borrar una notificación */
export async function eliminarNotificacion(id: string, usuarioId: string) {
  const { error } = await supabaseAdmin
    .from('notificaciones')
    .delete()
    .eq('id', id)
    .eq('usuario_id', usuarioId);
  if (error) {
    if (esTablaNotificacionesFaltante(error)) return { ok: true };
    throw new HttpError(404, 'Notificación no encontrada');
  }
  return { ok: true };
}

/** Crear una notificación (para uso interno del sistema) */
export async function crearNotificacion(entrada: {
  usuario_id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
}) {
  const { data, error } = await supabaseAdmin
    .from('notificaciones')
    .insert(entrada)
    .select()
    .single();
  if (error) {
    if (esTablaNotificacionesFaltante(error)) {
      console.warn('Tabla notificaciones no existe — se omite la creación. Ejecutar docs/notificaciones.sql en Supabase.');
      return null;
    }
    throw new HttpError(400, error.message);
  }
  return data;
}

/** Recordatorio previo a un turno (se envía unas horas antes) */
export async function recordatorioTurno(usuarioId: string, turno: {
  fecha: string;
  hora: string;
  cancha: string;
}) {
  return crearNotificacion({
    usuario_id: usuarioId,
    tipo: 'recordatorio',
    titulo: 'Recordatorio de turno',
    cuerpo: `Recordá que hoy a las ${turno.hora} tenés turno en la cancha ${turno.cancha}.`,
  });
}

/** Detectar reservas próximas (hoy/mañana) y crear recordatorios automáticos si no existen */
export async function procesarRecordatoriosProximos() {
  const hoy = hoyLocal();
  const mañana = mananaLocal();

  const { data: reservas, error } = await supabaseAdmin
    .from('reservas')
    .select('id, usuario_id, fecha, hora_inicio, canchas(nombre)')
    .in('fecha', [hoy, mañana])
    .eq('estado', 'confirmada');
  if (error) throw new HttpError(500, error.message);

  const creadas: Array<{ reserva_id: number; usuario_id: string }> = [];
  const errores: Array<{ reserva_id: number; error: string }> = [];

  for (const r of reservas ?? []) {
    const usuarioId = r.usuario_id as string;
    if (!usuarioId) continue;

    // Evitar duplicar recordatorios: buscar si ya existe uno similar para esta reserva
    const canchaNombre = (r.canchas as unknown as { nombre: string })?.nombre ?? 'cancha';
    const inicioTexto = r.hora_inicio ? String(r.hora_inicio).slice(0, 5) : '';

    const { data: existentes } = await supabaseAdmin
      .from('notificaciones')
      .select('id')
      .eq('usuario_id', usuarioId)
      .eq('tipo', 'recordatorio')
      .ilike('cuerpo', `%Reserva #${r.id}%`)
      .limit(1);

    if (!existentes || existentes.length === 0) {
      try {
        const esHoy = mañana === hoy;
        await crearNotificacion({
          usuario_id: usuarioId,
          tipo: 'recordatorio',
          titulo: 'Recordatorio de turno',
          cuerpo: `${esHoy ? 'Hoy' : 'Mañana'} a las ${inicioTexto} tenés reserva #${r.id} en ${canchaNombre}.`,
        });
        creadas.push({ reserva_id: r.id, usuario_id: usuarioId });
      } catch (err) {
        errores.push({
          reserva_id: r.id,
          error: err instanceof Error ? err.message : 'Error desconocido',
        });
      }
    }
  }

  return { creadas: creadas.length, errores, total_reservas: reservas?.length ?? 0 };
}

/** Aviso masivo de suspensión (lluvia, evento, etc.) */
export async function avisoSuspension(usuarioIds: string[], motivo: string) {
  const rows = usuarioIds.map((uid) => ({
    usuario_id: uid,
    tipo: 'suspension',
    titulo: 'Turno suspendido',
    cuerpo: `Se suspendió tu turno por: ${motivo}.`,
  }));
  const { error } = await supabaseAdmin.from('notificaciones').insert(rows);
  if (error) {
    if (esTablaNotificacionesFaltante(error)) {
      console.warn('Tabla notificaciones no existe — aviso no enviado. Ejecutar docs/notificaciones.sql en Supabase.');
      return { ok: true, enviados: 0 };
    }
    throw new HttpError(400, error.message);
  }
  return { ok: true, enviados: usuarioIds.length };
}

/** Notificación masiva a todo el staff del complejo (super_admin + recepcionista).
 *  Pensado para avisar movimientos de caja/eventos relevantes del día. */
export async function notificarStaff(tipo: string, titulo: string, cuerpo: string) {
  const { data: staff, error } = await supabaseAdmin
    .from('usuarios')
    .select('id')
    .in('rol', ['super_admin', 'recepcionista']);
  if (error) {
    console.warn('No se pudo leer staff para notificar:', error.message);
    return { ok: false, enviados: 0 };
  }
  if (!staff || staff.length === 0) return { ok: true, enviados: 0 };

  const rows = staff.map((s) => ({ usuario_id: s.id, tipo, titulo, cuerpo }));
  const { error: eIns } = await supabaseAdmin.from('notificaciones').insert(rows);
  if (eIns) {
    if (esTablaNotificacionesFaltante(eIns)) {
      console.warn('Tabla notificaciones no existe — aviso al staff omitido. Ejecutar docs/notificaciones.sql en Supabase.');
      return { ok: true, enviados: 0 };
    }
    console.warn('No se pudo insertar notificación al staff:', eIns.message);
    return { ok: false, enviados: 0 };
  }
  return { ok: true, enviados: staff.length };
}

/** Agrupar alias para que los callers no tengan que repetir nada */
export async function notoCliente(usuarioId: string, tipo: string, titulo: string, cuerpo: string) {
  return crearNotificacion({ usuario_id: usuarioId, tipo, titulo, cuerpo });
}
