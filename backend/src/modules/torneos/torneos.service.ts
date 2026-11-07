import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';

export interface Torneo {
  id: number;
  nombre: string;
  deporte_id: number | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  premio: string | null;
  activo: boolean;
}

export interface NuevoTorneo {
  nombre: string;
  deporte_id?: number | null;
  fecha_inicio: string;
  fecha_fin?: string | null;
  premio?: string | null;
}

export async function listarTorneos() {
  const { data, error } = await supabaseAdmin
    .from('torneos')
    .select('*')
    .order('fecha_inicio', { ascending: false });
  if (error) throw new HttpError(500, error.message);
  return data ?? [];
}

export async function crearTorneo(datos: NuevoTorneo) {
  if (!datos.nombre?.trim()) throw new HttpError(400, 'El nombre es obligatorio');
  if (!datos.fecha_inicio) throw new HttpError(400, 'La fecha de inicio es obligatoria');

  const { data, error } = await supabaseAdmin
    .from('torneos')
    .insert({
      nombre: datos.nombre.trim(),
      deporte_id: datos.deporte_id ?? null,
      fecha_inicio: datos.fecha_inicio,
      fecha_fin: datos.fecha_fin ?? null,
      premio: datos.premio ?? null,
      activo: true,
    })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
}

export async function listarTorneosActivos() {
  const { data, error } = await supabaseAdmin
    .from('torneos')
    .select('*')
    .eq('activo', true)
    .order('fecha_inicio', { ascending: true });
  if (error) throw new HttpError(500, error.message);
  return data ?? [];
}

export interface EquipoTorneo {
  id: number;
  torneo_id: number;
  nombre_equipo: string;
  capitan_id: string | null;
}

export async function listarEquipos(torneoId: number) {
  const { data, error } = await supabaseAdmin
    .from('equipos_torneo')
    .select('*')
    .eq('torneo_id', torneoId)
    .order('nombre_equipo');
  if (error) throw new HttpError(500, error.message);
  return data ?? [];
}

export async function crearEquipo(torneoId: number, nombreEquipo: string, capitanId?: string | null) {
  if (!nombreEquipo?.trim()) throw new HttpError(400, 'El nombre del equipo es obligatorio');

  const { data, error } = await supabaseAdmin
    .from('equipos_torneo')
    .insert({
      torneo_id: torneoId,
      nombre_equipo: nombreEquipo.trim(),
      capitan_id: capitanId ?? null,
    })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
}

export interface PartidoTorneo {
  id: number;
  torneo_id: number;
  equipo_local_id: number | null;
  equipo_visitante_id: number | null;
  cancha_id: number | null;
  fecha_hora: string;
  goles_local: number | null;
  goles_visitante: number | null;
  jugado: boolean;
  fase: string;
}

export async function listarPartidos(torneoId: number) {
  const { data, error } = await supabaseAdmin
    .from('partidos_torneo')
    .select('*')
    .eq('torneo_id', torneoId)
    .order('fecha_hora', { ascending: true });
  if (error) throw new HttpError(500, error.message);
  return data ?? [];
}

export async function cargarResultadoPartido(
  partidoId: number,
  golesLocal: number,
  golesVisitante: number,
  jugado: boolean,
) {
  const { data, error } = await supabaseAdmin
    .from('partidos_torneo')
    .update({ goles_local: golesLocal, goles_visitante: golesVisitante, jugado })
    .eq('id', partidoId)
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
}
