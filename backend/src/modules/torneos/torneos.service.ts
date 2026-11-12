import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';
import { suscripcionVigente } from '../suscripciones/suscripciones.service.js';

export type ModalidadTorneo = 'individual' | 'equipos';
export type FormatoTorneo = 'todos_contra_todos' | 'eliminacion_directa';
export type EstadoTorneo = 'inscripcion' | 'en_curso' | 'finalizado' | 'cancelado';

export interface Torneo {
  id: number;
  nombre: string;
  deporte_id: number | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  premio: string | null;
  activo: boolean;
  modalidad: ModalidadTorneo;
  formato: FormatoTorneo;
  jugadores_por_equipo: number | null;
  cupo_equipos: number | null;
  cuota_inscripcion: number | null;
  reglamento: string | null;
  cancha_id: number | null;
  estado: EstadoTorneo;
}

export interface NuevoTorneo {
  nombre: string;
  deporte_id?: number | null;
  fecha_inicio: string;
  fecha_fin?: string | null;
  premio?: string | null;
  modalidad?: ModalidadTorneo;
  formato?: FormatoTorneo;
  jugadores_por_equipo?: number | null;
  cupo_equipos?: number | null;
  cuota_inscripcion?: number | null;
  reglamento?: string | null;
  cancha_id?: number | null;
}

/** Torneo + complejo_id. Lanza 404 si no existe. */
async function torneoConComplejo(torneoId: number): Promise<Torneo & { complejo_id: number }> {
  const { data, error } = await supabaseAdmin
    .from('torneos')
    .select('*, deportes(nombre)')
    .eq('id', torneoId)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Torneo no encontrado');
  return data as unknown as Torneo & { complejo_id: number };
}

/** Acceso público/participantes: exige que el complejo del torneo tenga suscripción vigente. */
async function torneoPublico(torneoId: number) {
  const torneo = await torneoConComplejo(torneoId);
  if (!(await suscripcionVigente(Number(torneo.complejo_id)))) {
    throw new HttpError(404, 'Torneo no disponible por el momento');
  }
  return torneo;
}

/** Staff: exige que el torneo pertenezca al complejo activo del request. */
async function torneoDelComplejo(torneoId: number, complejoId: number) {
  const torneo = await torneoConComplejo(torneoId);
  if (Number(torneo.complejo_id) !== complejoId) throw new HttpError(404, 'Torneo no encontrado');
  return torneo;
}

export async function listarTorneos(complejoId: number) {
  const { data, error } = await supabaseAdmin
    .from('torneos')
    .select('*, deportes(nombre)')
    .eq('complejo_id', complejoId)
    .order('fecha_inicio', { ascending: false });
  if (error) throw new HttpError(500, error.message);
  return data ?? [];
}

/** Torneos abiertos a participantes: solo complejos con suscripción vigente */
export async function listarTorneosActivos() {
  const { data: complejos } = await supabaseAdmin
    .from('complejos')
    .select('id')
    .eq('activo', true);
  const vigentIds: number[] = [];
  for (const c of complejos ?? []) {
    if (await suscripcionVigente(c.id)) vigentIds.push(c.id);
  }
  if (vigentIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('torneos')
    .select('*, deportes(nombre), complejos(nombre, slug, ciudad)')
    .eq('activo', true)
    .in('complejo_id', vigentIds)
    .order('fecha_inicio', { ascending: true });
  if (error) throw new HttpError(500, error.message);
  return data ?? [];
}

export async function crearTorneo(datos: NuevoTorneo, complejoId: number) {
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
      modalidad: datos.modalidad ?? 'equipos',
      formato: datos.formato ?? 'todos_contra_todos',
      jugadores_por_equipo: datos.jugadores_por_equipo ?? null,
      cupo_equipos: datos.cupo_equipos ?? null,
      cuota_inscripcion: datos.cuota_inscripcion ?? null,
      reglamento: datos.reglamento ?? null,
      cancha_id: datos.cancha_id ?? null,
      activo: true,
      estado: 'inscripcion',
      complejo_id: complejoId,
    })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
}

export interface TorneoActual {
  torneo: Torneo;
  inscripciones: number;
  equipos: number;
}

/** Devuelve el torneo + conteos de participantes y equipos (público: exige complejo vigente) */
export async function obtenerTorneoConConteos(torneoId: number): Promise<TorneoActual> {
  const torneo = await torneoPublico(torneoId);

  const { count: inscripciones } = torneo.modalidad === 'individual'
    ? await supabaseAdmin.from('inscripciones_torneo').select('id', { count: 'exact', head: true }).eq('torneo_id', torneoId)
    : { count: 0 };

  const { count: equipos } = await supabaseAdmin
    .from('equipos_torneo')
    .select('id', { count: 'exact', head: true })
    .eq('torneo_id', torneoId);

  return { torneo: torneo as unknown as Torneo, inscripciones: inscripciones ?? 0, equipos: equipos ?? 0 };
}

/* ===== Inscripción cliente ===== */

export async function inscribirIndividual(torneoId: number, usuarioId: string) {
  const torneo = await torneoPublico(torneoId);
  if (torneo.modalidad !== 'individual') throw new HttpError(400, 'Este torneo es por equipos');
  if (torneo.estado !== 'inscripcion') throw new HttpError(400, 'La inscripción ya cerró');

  if (torneo.cupo_equipos != null) {
    const { count } = await supabaseAdmin
      .from('inscripciones_torneo')
      .select('id', { count: 'exact', head: true })
      .eq('torneo_id', torneoId);
    if ((count ?? 0) >= torneo.cupo_equipos) throw new HttpError(409, 'No hay cupo disponible');
  }

  const { error } = await supabaseAdmin.from('inscripciones_torneo').insert({
    torneo_id: torneoId,
    usuario_id: usuarioId,
  });
  if (error) {
    if (/duplicate|already/i.test(error.message)) throw new HttpError(409, 'Ya estás inscripto');
    throw new HttpError(500, error.message);
  }
  return { ok: true };
}

export async function crearEquipoConCapitan(torneoId: number, usuarioId: string, nombreEquipo: string) {
  const torneo = await torneoPublico(torneoId);
  if (torneo.modalidad !== 'equipos') throw new HttpError(400, 'Este torneo es individual');
  if (torneo.estado !== 'inscripcion') throw new HttpError(400, 'La inscripción ya cerró');
  if (!nombreEquipo.trim()) throw new HttpError(400, 'El nombre del equipo es obligatorio');

  if (torneo.cupo_equipos != null) {
    const { count } = await supabaseAdmin
      .from('equipos_torneo')
      .select('id', { count: 'exact', head: true })
      .eq('torneo_id', torneoId);
    if ((count ?? 0) >= torneo.cupo_equipos) throw new HttpError(409, 'No hay más cupos de equipo');
  }

  const { data, error } = await supabaseAdmin
    .from('equipos_torneo')
    .insert({ torneo_id: torneoId, nombre_equipo: nombreEquipo.trim(), capitan_id: usuarioId })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
}

/* ===== Listar participantes ===== */

interface InscripcionVista {
  tipo: 'individual' | 'equipo';
  nombre: string;
  capitan_id: string | null;
  id: number;
}

export async function listarInscripciones(torneoId: number) {
  await torneoPublico(torneoId);
  const { data: torneo } = await supabaseAdmin.from('torneos').select('modalidad').eq('id', torneoId).single();
  const individual = torneo?.modalidad === 'individual';
  if (individual) {
    const { data } = await supabaseAdmin
      .from('inscripciones_torneo')
      .select('id, torneo_id, usuarios(nombre, apellido, telefono)')
      .eq('torneo_id', torneoId);
    return (data ?? []) as unknown as Array<{
      id: number;
      usuarios: { nombre: string; apellido: string | null; telefono: string | null } | null;
    }>;
  }
  const { data } = await supabaseAdmin
    .from('equipos_torneo')
    .select('id, torneo_id, nombre_equipo, capitan_id, usuarios(nombre, apellido, telefono)')
    .eq('torneo_id', torneoId)
    .order('nombre_equipo');
  return (data ?? []) as unknown as Array<{
    id: number;
    nombre_equipo: string;
    capitan_id: string | null;
    usuarios: { nombre: string; apellido: string | null; telefono: string | null } | null;
  }>;
}

/* ===== Fixture ===== */

/** Participantes del torneo (equipos + inscripciones individuales, normalizados como equipos) */
async function obtenerParticipantes(torneoId: number) {
  const { data: inscriptos } = await supabaseAdmin
    .from('inscripciones_torneo')
    .select('usuario_id')
    .eq('torneo_id', torneoId);
  const individualIds = (inscriptos ?? []).map((r) => r.usuario_id);

  const { data: equipoList } = await supabaseAdmin
    .from('equipos_torneo')
    .select('id, nombre_equipo, capitan_id')
    .eq('torneo_id', torneoId)
    .order('id');

  let participantes: Array<{ id: number; nombre_equipo: string }> = [];
  if (equipoList && equipoList.length >= 2) {
    participantes = equipoList.map((e) => ({ id: e.id, nombre_equipo: e.nombre_equipo }));
  } else if (individualIds.length >= 2) {
    const { data: usuarios } = await supabaseAdmin
      .from('usuarios')
      .select('id, nombre, apellido')
      .in('id', individualIds);
    for (const u of usuarios ?? []) {
      const { data: eq, error: eEq } = await supabaseAdmin
        .from('equipos_torneo')
        .insert({ torneo_id: torneoId, nombre_equipo: `${u.nombre} ${u.apellido}`.trim(), capitan_id: u.id })
        .select('id, nombre_equipo, capitan_id')
        .single();
      if (eq) participantes.push(eq);
    }
  } else {
    throw new HttpError(400, 'Necesitás al menos 2 participantes para generar el fixture');
  }
  return participantes;
}

/** Genera el fixture (todos contra todos) respetando N equipos (bye si son impares). */
export async function generarFixtureAllVsAll(torneoId: number) {
  const { data: torneo, error: eT } = await supabaseAdmin
    .from('torneos')
    .select('id, estado, formato')
    .eq('id', torneoId)
    .single();
  if (eT || !torneo) throw new HttpError(404, 'Torneo no encontrado');
  if (torneo.formato !== 'todos_contra_todos') throw new HttpError(400, 'Formato no soportado por el generador automático — usá todos_contra_todos');
  if (torneo.estado !== 'inscripcion') throw new HttpError(400, 'El torneo ya empezó');

  const participantes = await obtenerParticipantes(torneoId);
  const ids = participantes.map((p) => p.id);

  // Limpiar fixture anterior si existe
  await supabaseAdmin.from('partidos_torneo').delete().eq('torneo_id', torneoId);

  // Round-robin: cada pareja juega una vez
  const partidos: Array<{
    torneo_id: number;
    equipo_local_id: number;
    equipo_visitante_id: number;
    fase: string;
  }> = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      partidos.push({
        torneo_id: torneoId,
        equipo_local_id: ids[i],
        equipo_visitante_id: ids[j],
        fase: 'Grupos',
      });
    }
  }

  if (partidos.length > 0) {
    const { error } = await supabaseAdmin.from('partidos_torneo').insert(partidos);
    if (error) throw new HttpError(500, error.message);
  }

  await supabaseAdmin.from('torneos').update({ estado: 'en_curso' }).eq('id', torneoId);
  return { generadas: partidos.length };
}

export async function generarFixtureEliminatoria(torneoId: number) {
  const { data: torneo, error: eT } = await supabaseAdmin
    .from('torneos')
    .select('id, estado, formato')
    .eq('id', torneoId)
    .single();
  if (eT || !torneo) throw new HttpError(404, 'Torneo no encontrado');
  if (torneo.formato !== 'eliminacion_directa') throw new HttpError(400, 'Formato no soportado');
  if (torneo.estado !== 'inscripcion') throw new HttpError(400, 'El torneo ya empezó');

  const participantes = await obtenerParticipantes(torneoId);

  await supabaseAdmin.from('partidos_torneo').delete().eq('torneo_id', torneoId);

  const { construirBracketLocal } = await import('./bracket.service.js');
  const slots = await construirBracketLocal(participantes);

  if (slots.length > 0) {
    const { error } = await supabaseAdmin.from('partidos_torneo').insert(
      slots.map((s) => ({
        torneo_id: torneoId,
        equipo_local_id: s.local_id,
        equipo_visitante_id: s.visitante_id,
        fase: s.fase,
      })),
    );
    if (error) throw new HttpError(500, error.message);
  }

  await supabaseAdmin.from('torneos').update({ estado: 'en_curso' }).eq('id', torneoId);
  return { generadas: slots.length };
}

/** Dispatch al generador según formato. Solo staff del complejo del torneo. */
export async function generarFixture(torneoId: number, complejoId: number) {
  await torneoDelComplejo(torneoId, complejoId);
  const { data: torneo } = await supabaseAdmin
    .from('torneos')
    .select('formato')
    .eq('id', torneoId)
    .single();
  if (torneo?.formato === 'eliminacion_directa') return generarFixtureEliminatoria(torneoId);
  return generarFixtureAllVsAll(torneoId);
}

export interface PartidoTorneo {
  id: number;
  torneo_id: number;
  equipo_local_id: number | null;
  equipo_visitante_id: number | null;
  cancha_id: number | null;
  fecha_hora: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
  jugado: boolean;
  fase: string;
}

/* ===== Resultado y tabla ===== */

export async function listarPartidos(torneoId: number) {
  await torneoPublico(torneoId);
  const { data: partidos, error } = await supabaseAdmin
    .from('partidos_torneo')
    .select('*')
    .eq('torneo_id', torneoId)
    .order('id', { ascending: true });
  if (error) throw new HttpError(500, error.message);

  const { data: equipos } = await supabaseAdmin
    .from('equipos_torneo')
    .select('id, nombre_equipo')
    .eq('torneo_id', torneoId);
  const nombres = new Map((equipos ?? []).map((e) => [e.id, e.nombre_equipo as string]));

  return (partidos ?? []).map((p) => ({
    ...p,
    equipo_local_nombre: p.equipo_local_id ? (nombres.get(p.equipo_local_id) ?? null) : null,
    equipo_visitante_nombre: p.equipo_visitante_id ? (nombres.get(p.equipo_visitante_id) ?? null) : null,
  }));
}

export async function cargarResultadoPartido(
  partidoId: number,
  golesLocal: number,
  golesVisitante: number,
  jugado: boolean,
  complejoId: number,
) {
  const { data: partido } = await supabaseAdmin
    .from('partidos_torneo')
    .select('torneo_id, fase')
    .eq('id', partidoId)
    .single();
  if (!partido) throw new HttpError(404, 'Partido no encontrado');
  await torneoDelComplejo(partido.torneo_id, complejoId);

  const { data, error } = await supabaseAdmin
    .from('partidos_torneo')
    .update({ goles_local: golesLocal, goles_visitante: golesVisitante, jugado })
    .eq('id', partidoId)
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);

  // Si el torneo es eliminatoria directa y la ronda se completó, auto-crear la siguiente fase
  if (jugado) {
    const { autoAvanzarBracket } = await import('./bracket.service.js');
    await autoAvanzarBracket(partido.torneo_id, partido.fase);
  }
  return data;
}

export interface Posicion {
  equipoId: number;
  nombreEquipo: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  puntos: number;
}

export async function tablaPosiciones(torneoId: number): Promise<Posicion[]> {
  await torneoPublico(torneoId);
  const { data: partidos, error } = await supabaseAdmin
    .from('partidos_torneo')
    .select('equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, jugado')
    .eq('torneo_id', torneoId);
  if (error) throw new HttpError(500, error.message);

  const { data: equiposRaw } = await supabaseAdmin
    .from('equipos_torneo')
    .select('id, nombre_equipo')
    .eq('torneo_id', torneoId);
  const nombres = new Map((equiposRaw ?? []).map((e) => [e.id, e.nombre_equipo as string]));

  const equipos = new Map<number, Posicion>();

  const ensure = (id: number): Posicion => {
    if (!equipos.has(id)) {
      equipos.set(id, {
        equipoId: id,
        nombreEquipo: nombres.get(id) ?? `Equipo ${id}`,
        pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, puntos: 0,
      });
    }
    return equipos.get(id)!;
  };

  for (const p of partidos ?? []) {
    const local = p.equipo_local_id;
    const visitante = p.equipo_visitante_id;
    if (!local || !visitante) continue;

    const localPos = ensure(local);
    const visitantePos = ensure(visitante);

    if (!p.jugado) continue;

    localPos.pj += 1;
    localPos.gf += p.goles_local ?? 0;
    localPos.gc += p.goles_visitante ?? 0;
    visitantePos.pj += 1;
    visitantePos.gf += p.goles_visitante ?? 0;
    visitantePos.gc += p.goles_local ?? 0;

    const gl = p.goles_local ?? 0;
    const gv = p.goles_visitante ?? 0;
    if (gl > gv) {
      localPos.pg += 1;
      localPos.puntos += 3;
      visitantePos.pp += 1;
    } else if (gv > gl) {
      visitantePos.pg += 1;
      visitantePos.puntos += 3;
      localPos.pp += 1;
    } else {
      localPos.pe += 1;
      visitantePos.pe += 1;
      localPos.puntos += 1;
      visitantePos.puntos += 1;
    }
  }

  const tabla = [...equipos.values()].map((pos) => ({
    ...pos,
    dg: pos.gf - pos.gc,
  }));
  tabla.sort((a, b) => b.puntos - a.puntos || b.dg - a.dg || b.gf - a.gf);
  return tabla;
}

export async function finalizarTorneo(torneoId: number, complejoId: number) {
  await torneoDelComplejo(torneoId, complejoId);
  const { data, error } = await supabaseAdmin
    .from('torneos')
    .update({ estado: 'finalizado' })
    .eq('id', torneoId)
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
}

export async function cancelarInscripcionIndividual(torneoId: number, usuarioId: string) {
  const { error } = await supabaseAdmin
    .from('inscripciones_torneo')
    .delete()
    .eq('torneo_id', torneoId)
    .eq('usuario_id', usuarioId);
  if (error) throw new HttpError(400, error.message);
  return { ok: true };
}

export async function cancelarEquipo(torneoId: number, equipoId: number, usuarioId: string, esStaff: boolean, complejoId?: number) {
  const { data: equipo } = await supabaseAdmin
    .from('equipos_torneo')
    .select('capitan_id')
    .eq('id', equipoId)
    .eq('torneo_id', torneoId)
    .single();
  if (!equipo) throw new HttpError(404, 'Equipo no encontrado');

  // El staff solo puede operar equipos de SU complejo (el capitán cancela los suyos siempre)
  if (esStaff && complejoId != null) {
    await torneoDelComplejo(torneoId, complejoId);
  }
  if (!esStaff && equipo.capitan_id !== usuarioId) {
    throw new HttpError(403, 'Sólo el capitán o un admin puede cancelarlo');
  }
  const { error } = await supabaseAdmin.from('equipos_torneo').delete().eq('id', equipoId);
  if (error) throw new HttpError(400, error.message);
  return { ok: true };
}
