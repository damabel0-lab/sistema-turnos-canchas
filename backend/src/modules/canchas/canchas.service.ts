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

export async function listarCanchas() {
  const { data, error } = await supabaseAdmin
    .from('canchas')
    .select('*, deportes(nombre, tipo)')
    .order('id');
  if (error) throw new HttpError(500, error.message);
  return data;
}

export async function crearCancha(cancha: NuevaCancha) {
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
    })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
}

export async function editarCancha(id: number, cambios: Partial<NuevaCancha>) {
  const { data, error } = await supabaseAdmin
    .from('canchas')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new HttpError(404, error.message);
  return data;
}

// ---------- Tarifas (opcionales por complejo) ----------

export async function listarTarifas(canchaId: number) {
  const { data, error } = await supabaseAdmin
    .from('tarifas')
    .select('*')
    .eq('cancha_id', canchaId)
    .order('dia_semana', { ascending: true, nullsFirst: false });
  if (error) throw new HttpError(500, error.message);
  return data;
}

export async function crearTarifa(canchaId: number, tarifa: NuevaTarifa) {
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

export async function eliminarTarifa(id: number) {
  const { error } = await supabaseAdmin.from('tarifas').delete().eq('id', id);
  if (error) throw new HttpError(400, error.message);
  return { ok: true };
}
