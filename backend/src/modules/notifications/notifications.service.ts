import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';

export interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  leida: boolean;
  creada_en: string;
}

/** Listar notificaciones de un usuario */
export async function listarNotificaciones(usuarioId: string) {
  const { data, error } = await supabaseAdmin
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('creada_en', { ascending: false });
  if (error) throw new HttpError(500, error.message);
  return data ?? [];
}

/** Marcar como leída */
export async function leerNotificacion(id: string, usuarioId: string) {
  const { error } = await supabaseAdmin
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', id)
    .eq('usuario_id', usuarioId);
  if (error) throw new HttpError(404, 'Notificación no encontrada');
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
  if (error) throw new HttpError(400, error.message);
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

/** Aviso masivo de suspensión (lluvia, evento, etc.) */
export async function avisoSuspension(usuarioIds: string[], motivo: string) {
  const rows = usuarioIds.map((uid) => ({
    usuario_id: uid,
    tipo: 'suspension',
    titulo: 'Turno suspendido',
    cuerpo: `Se suspendió tu turno por: ${motivo}.`,
  }));
  const { error } = await supabaseAdmin.from('notificaciones').insert(rows);
  if (error) throw new HttpError(400, error.message);
  return { ok: true, enviados: usuarioIds.length };
}
