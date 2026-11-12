import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';

export interface NuevaCancha {
  nombre: string;
  deporte_id: number | null;
  precio_base: number;
  activa?: boolean;
  caracteristicas?: string | null;
}

export interface NuevaTarifa {
  dia_semana: number | null;
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  porcentaje_seña: number;
}

export async function listarCanchas(complejoId: number) {
  const { data, error } = await supabaseAdmin
    .from('canchas')
    .select('*, deportes(nombre, tipo)')
    .eq('complejo_id', complejoId)
    .order('id');
  if (error) throw new HttpError(500, error.message);
  return data;
}

export async function crearCancha(cancha: NuevaCancha, complejoId: number) {
  if (!cancha.nombre?.trim()) throw new HttpError(400, 'El nombre es obligatorio');
  if (!(cancha.precio_base >= 0)) throw new HttpError(400, 'El precio base debe ser mayor o igual a 0');

  const { data, error } = await supabaseAdmin
    .from('canchas')
    .insert({
      nombre: cancha.nombre.trim(),
      deporte_id: cancha.deporte_id,
      precio_base: cancha.precio_base,
      activa: cancha.activa ?? true,
      caracteristicas: cancha.caracteristicas ?? null,
      complejo_id: complejoId,
    })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
}

export async function editarCancha(id: number, cambios: Partial<NuevaCancha>, complejoId: number) {
  // Whitelist de campos editables (nunca complejo_id ni id)
  const patch: Record<string, unknown> = {};
  if (cambios.nombre !== undefined) {
    const v = String(cambios.nombre).trim();
    if (v.length < 2) throw new HttpError(400, 'El nombre debe tener al menos 2 caracteres');
    patch.nombre = v;
  }
  if (cambios.deporte_id !== undefined) patch.deporte_id = cambios.deporte_id;
  if (cambios.precio_base !== undefined) {
    if (!(Number(cambios.precio_base) >= 0)) throw new HttpError(400, 'El precio debe ser mayor o igual a 0');
    patch.precio_base = cambios.precio_base;
  }
  if (cambios.activa !== undefined) patch.activa = !!cambios.activa;
  if (cambios.caracteristicas !== undefined) patch.caracteristicas = cambios.caracteristicas;

  if (Object.keys(patch).length === 0) throw new HttpError(400, 'No hay cambios para guardar');

  const { data, error } = await supabaseAdmin
    .from('canchas')
    .update(patch)
    .eq('id', id)
    .eq('complejo_id', complejoId)
    .select()
    .maybeSingle();
  if (error) throw new HttpError(400, error.message);
  if (!data) throw new HttpError(404, 'Cancha no encontrada');
  return data;
}

export async function eliminarCancha(id: number, complejoId: number) {
  const { data, error } = await supabaseAdmin
    .from('canchas')
    .delete()
    .eq('id', id)
    .eq('complejo_id', complejoId)
    .select('id');
  if (error) throw new HttpError(400, error.message);
  if (!data || data.length === 0) throw new HttpError(404, 'Cancha no encontrada');
  return { ok: true };
}

/** Verifica que la cancha pertenezca al complejo activo; devuelve la fila o lanza 404 */
async function canchaDelComplejo(canchaId: number, complejoId: number) {
  const { data, error } = await supabaseAdmin
    .from('canchas')
    .select('id, complejo_id')
    .eq('id', canchaId)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data || data.complejo_id !== complejoId) throw new HttpError(404, 'Cancha no encontrada');
  return data;
}

// ---------- Tarifas (opcionales por complejo) ----------

export async function listarTarifas(canchaId: number, complejoId: number) {
  await canchaDelComplejo(canchaId, complejoId);
  const { data, error } = await supabaseAdmin
    .from('tarifas')
    .select('*')
    .eq('cancha_id', canchaId)
    .order('dia_semana', { ascending: true, nullsFirst: false });
  if (error) throw new HttpError(500, error.message);
  return data;
}

export async function crearTarifa(canchaId: number, tarifa: NuevaTarifa, complejoId: number) {
  await canchaDelComplejo(canchaId, complejoId);
  if (tarifa.dia_semana != null && (tarifa.dia_semana < 0 || tarifa.dia_semana > 6)) {
    throw new HttpError(400, 'dia_semana debe ser 0 (domingo) a 6 (sábado) o null');
  }
  if (tarifa.hora_inicio >= tarifa.hora_fin) {
    throw new HttpError(400, 'hora_inicio debe ser anterior a hora_fin');
  }
  if (!(tarifa.precio >= 0)) throw new HttpError(400, 'El precio debe ser mayor o igual a 0');

  const { data, error } = await supabaseAdmin
    .from('tarifas')
    .insert({ ...tarifa, cancha_id: canchaId })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
}

export async function eliminarTarifa(id: number, complejoId: number) {
  const { data: tarifa, error: eT } = await supabaseAdmin
    .from('tarifas')
    .select('id, cancha_id')
    .eq('id', id)
    .maybeSingle();
  if (eT) throw new HttpError(500, eT.message);
  if (!tarifa) throw new HttpError(404, 'Tarifa no encontrada');
  await canchaDelComplejo(tarifa.cancha_id, complejoId);

  const { error } = await supabaseAdmin.from('tarifas').delete().eq('id', id);
  if (error) throw new HttpError(400, error.message);
  return { ok: true };
}
