import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';
import { hoyLocal } from '../../lib/fecha.js';
import { crearNotificacion } from '../notifications/notifications.service.js';
import {
  esVigente,
  ultimaSuscripcion,
  suscripcionVigente,
  PLAN_COMPLETO,
  MONTO_PLAN_COMPLETO,
  type SuscripcionRow,
} from '../suscripciones/suscripciones.service.js';

// ---------- helpers ----------

export function slugify(texto: string): string {
  const slug = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // saca tildes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'complejo';
}

const str = (v: unknown, max: number): string => String(v ?? '').trim().slice(0, max);
const bool = (v: unknown): boolean => v === true || v === 'true' || v === 1 || v === '1';
const num = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};
const horaStr = (v: unknown, fallback: string): string => {
  if (typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v.trim())) {
    const [h, m] = v.trim().split(':');
    return `${String(Number(h)).padStart(2, '0')}:${m.padStart(2, '0')}`;
  }
  const n = Number(v);
  if (Number.isFinite(n) && n >= 0 && n <= 23) return `${String(n).padStart(2, '0')}:00`;
  return fallback;
};
const amenidadesSanitas = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((a) => str(a, 40).toLowerCase()).filter(Boolean))].slice(0, 20);
};

const CAMPOS_PUBLICOS =
  'id, nombre, slug, tipo, ciudad, direccion, telefono, email_contacto, descripcion, hora_apertura, hora_cierre, cancelacion_minima_horas, descuento_turno_fijo_porcentaje, sena_obligatoria, gym, pileta, precio_mensual_gym, precio_mensual_pileta, ofrece_socios, ofrece_torneos, amenidades, activo';

interface ComplejoRow {
  id: number;
  nombre: string;
  slug: string;
  [k: string]: unknown;
}

interface CanchaPub {
  id: number;
  nombre: string;
  precio_base: number;
  deporte_id: number;
  caracteristicas: string | null;
  deporte: { nombre: string; tipo: string } | null;
}

/** Últimas suscripciones por complejo en una sola query (para catálogos y listados) */
async function ultimasSuscripcionesPorComplejo(ids: number[]): Promise<Map<number, SuscripcionRow>> {
  const mapa = new Map<number, SuscripcionRow>();
  if (ids.length === 0) return mapa;
  const { data, error } = await supabaseAdmin
    .from('suscripciones')
    .select('*')
    .in('complejo_id', ids)
    .order('inicio', { ascending: false })
    .order('id', { ascending: false });
  if (error) {
    console.warn('ultimasSuscripciones:', error.message);
    return mapa;
  }
  for (const fila of (data ?? []) as SuscripcionRow[]) {
    if (!mapa.has(fila.complejo_id)) mapa.set(fila.complejo_id, fila);
  }
  return mapa;
}

/** Carga canchas activas de varios complejos (para catálogo / detalle) */
async function canchasDe(ids: number[]): Promise<Map<number, CanchaPub[]>> {
  const mapa = new Map<number, CanchaPub[]>();
  if (ids.length === 0) return mapa;
  const { data, error } = await supabaseAdmin
    .from('canchas')
    .select('id, nombre, precio_base, deporte_id, caracteristicas, complejo_id, deportes(nombre, tipo)')
    .in('complejo_id', ids)
    .eq('activa', true);
  if (error) {
    console.warn('canchasDe:', error.message);
    return mapa;
  }
  for (const fila of (data ?? []) as unknown as Array<CanchaPub & { complejo_id: number; deportes: { nombre: string; tipo: string } | null }>) {
    const arr = mapa.get(fila.complejo_id) ?? [];
    arr.push({
      id: fila.id,
      nombre: fila.nombre,
      precio_base: Number(fila.precio_base),
      deporte_id: fila.deporte_id,
      caracteristicas: fila.caracteristicas,
      deporte: fila.deportes ?? null,
    });
    mapa.set(fila.complejo_id, arr);
  }
  return mapa;
}

const resumenPublico = (c: ComplejoRow, canchas: CanchaPub[]) => {
  const deportes = [...new Map(
    canchas.map((x) => [x.deporte_id, x.deporte?.nombre ?? 'Otro']),
  ).entries()].map(([id, nombre]) => ({ id, nombre }));
  const precioDesde = canchas.length
    ? Math.min(...canchas.map((x) => x.precio_base))
    : null;
  return {
    id: c.id,
    nombre: c.nombre,
    slug: c.slug,
    tipo: c.tipo,
    ciudad: c.ciudad,
    direccion: c.direccion,
    telefono: c.telefono,
    email_contacto: c.email_contacto,
    descripcion: c.descripcion,
    gym: !!c.gym,
    pileta: !!c.pileta,
    precio_mensual_gym: c.precio_mensual_gym != null ? Number(c.precio_mensual_gym) : null,
    precio_mensual_pileta: c.precio_mensual_pileta != null ? Number(c.precio_mensual_pileta) : null,
    ofrece_torneos: c.ofrece_torneos !== false,
    ofrece_socios: !!c.ofrece_socios,
    amenidades: (c.amenidades as string[]) ?? [],
    deportes,
    canchas: canchas.length,
    precio_desde: precioDesde,
  };
};

// ---------- catálogo público ----------

export interface FiltrosCatalogo {
  q?: string;
  ciudad?: string;
  deporteId?: number;
}

export async function listarCatalogo(filtros: FiltrosCatalogo) {
  const { data, error } = await supabaseAdmin
    .from('complejos')
    .select(CAMPOS_PUBLICOS)
    .eq('activo', true)
    .order('nombre');
  if (error) throw new HttpError(500, error.message);

  const complejos = (data ?? []) as ComplejoRow[];
  const ids = complejos.map((c) => c.id as number);
  const [subs, canchas] = await Promise.all([
    ultimasSuscripcionesPorComplejo(ids),
    canchasDe(ids),
  ]);

  const q = (filtros.q ?? '').trim().toLowerCase();
  const ciudad = (filtros.ciudad ?? '').trim().toLowerCase();

  return complejos
    .filter((c) => esVigente(subs.get(c.id as number) ?? null))
    .filter((c) => {
      if (!ciudad) return true;
      return String(c.ciudad ?? '').toLowerCase().includes(ciudad);
    })
    .filter((c) => {
      if (!q) return true;
      const texto = [c.nombre, c.direccion, c.descripcion, c.ciudad]
        .filter(Boolean).join(' ').toLowerCase();
      return texto.includes(q);
    })
    .filter((c) => {
      if (!filtros.deporteId) return true;
      return (canchas.get(c.id as number) ?? []).some((x) => x.deporte_id === filtros.deporteId);
    })
    .map((c) => resumenPublico(c, canchas.get(c.id as number) ?? []));
}

/** Detalle público por slug (404 si no existe, está inactivo o no está vigente) */
export async function detallePorSlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('complejos')
    .select(CAMPOS_PUBLICOS)
    .eq('slug', slug)
    .eq('activo', true)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Complejo no encontrado');

  const complejo = data as ComplejoRow;
  if (!(await suscripcionVigente(complejo.id as number))) {
    throw new HttpError(404, 'Complejo no disponible por el momento');
  }

  const canchasMap = await canchasDe([complejo.id as number]);
  const canchas = canchasMap.get(complejo.id as number) ?? [];

  return {
    ...resumenPublico(complejo, canchas),
    hora_apertura: String(complejo.hora_apertura).slice(0, 5),
    hora_cierre: String(complejo.hora_cierre).slice(0, 5),
    cancelacion_minima_horas: Number(complejo.cancelacion_minima_horas ?? 2),
    sena_obligatoria: !!complejo.sena_obligatoria,
    descuento_turno_fijo_porcentaje: Number(complejo.descuento_turno_fijo_porcentaje ?? 0),
    canchas: canchas.map((x) => ({ ...x, deporte: x.deporte })),
  };
}

// ---------- self-service: registro de dueños ----------

export interface CrearComplejoInput {
  nombre: string;
  tipo?: string;
  ciudad: string;
  direccion?: string;
  telefono?: string;
  email_contacto?: string;
  descripcion?: string;
  amenidades?: string[];
  gym?: boolean;
  pileta?: boolean;
  precio_mensual_gym?: number | null;
  precio_mensual_pileta?: number | null;
  ofrece_socios?: boolean;
  ofrece_torneos?: boolean;
}

export async function crearComplejo(usuarioId: string, input: CrearComplejoInput) {
  const nombre = str(input.nombre, 120);
  const ciudad = str(input.ciudad, 80);
  if (nombre.length < 2) throw new HttpError(400, 'Poné el nombre del complejo');
  if (ciudad.length < 2) throw new HttpError(400, 'Poné la ciudad del complejo');
  const tipo = input.tipo === 'fraccionado' ? 'fraccionado' : 'complejo_deportivo';

  // Slug único: base + sufijo numérico si ya existe
  const base = slugify(nombre);
  let slug = base;
  for (let i = 2; i < 20; i += 1) {
    const { data: existe } = await supabaseAdmin
      .from('complejos')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existe) break;
    slug = `${base}-${i}`;
  }

  const { data: complejo, error } = await supabaseAdmin
    .from('complejos')
    .insert({
      nombre,
      slug,
      tipo,
      ciudad,
      direccion: str(input.direccion, 160) || null,
      telefono: str(input.telefono, 40) || null,
      email_contacto: str(input.email_contacto, 120).toLowerCase() || null,
      descripcion: str(input.descripcion, 2000) || null,
      amenidades: amenidadesSanitas(input.amenidades),
      gym: bool(input.gym),
      pileta: bool(input.pileta),
      precio_mensual_gym: input.precio_mensual_gym != null ? num(input.precio_mensual_gym, 0, 0, 100_000_000) : null,
      precio_mensual_pileta: input.precio_mensual_pileta != null ? num(input.precio_mensual_pileta, 0, 0, 100_000_000) : null,
      ofrece_socios: bool(input.ofrece_socios),
      ofrece_torneos: input.ofrece_torneos === undefined ? true : bool(input.ofrece_torneos),
    })
    .select('*')
    .single();
  if (error) throw new HttpError(400, error.message);

  const complejoId = (complejo as ComplejoRow).id as number;

  // Membresía de dueño + trial 14 días
  const { error: eMemb } = await supabaseAdmin
    .from('complejo_usuarios')
    .insert({ complejo_id: complejoId, usuario_id: usuarioId, rol: 'dueno' });
  if (eMemb) throw new HttpError(500, `Complejo creado pero no se pudo asignar el dueño: ${eMemb.message}`);

  const fin = new Date();
  fin.setDate(fin.getDate() + 14);
  const { error: eSub } = await supabaseAdmin
    .from('suscripciones')
    .insert({
      complejo_id: complejoId,
      plan: PLAN_COMPLETO,
      estado: 'prueba',
      monto: 0,
      inicio: hoyLocal(),
      fin: fin.toISOString().slice(0, 10),
      metodo_pago: 'otro',
      registrada_por: null,
      notas: 'Trial 14 días — alta self-service',
    });
  if (eSub) console.warn('No se pudo crear la suscripción de trial:', eSub.message);

  // Aviso a la plataforma (mejor esfuerzo)
  try {
    const { data: admins } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('rol', 'super_admin');
    for (const a of admins ?? []) {
      await crearNotificacion({
        usuario_id: a.id,
        tipo: 'sistema',
        titulo: `Nuevo complejo en PlayControl`,
        cuerpo: `${nombre} (${ciudad}) se registró y está en trial de 14 días.`,
      });
    }
  } catch {
    /* la notificación nunca bloquea el alta */
  }

  return { id: complejoId, slug, suscripcion_estado: 'prueba', suscripcion_fin: fin.toISOString().slice(0, 10), monto_plan: MONTO_PLAN_COMPLETO };
}

// ---------- mis complejos (panel del dueño) ----------

export async function misComplejos(usuarioId: string) {
  const { data: membresias, error } = await supabaseAdmin
    .from('complejo_usuarios')
    .select('complejo_id, rol, creado_en')
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: true });
  if (error) throw new HttpError(500, error.message);
  if (!membresias || membresias.length === 0) return [];

  const ids = membresias.map((m) => m.complejo_id);
  const [{ data: complejos, error: e2 }, subs] = await Promise.all([
    supabaseAdmin.from('complejos').select('*').in('id', ids),
    ultimasSuscripcionesPorComplejo(ids),
  ]);
  if (e2) throw new HttpError(500, e2.message);

  const porId = new Map(((complejos ?? []) as ComplejoRow[]).map((c) => [c.id as number, c]));

  return membresias.map((m) => {
    const c = porId.get(m.complejo_id);
    const sub = subs.get(m.complejo_id) ?? null;
    return {
      complejo_id: m.complejo_id,
      rol: m.rol,
      complejo: c ?? null,
      suscripcion: sub,
      vigente: esVigente(sub),
    };
  });
}

// ---------- edición del complejo (dueño) ----------

const TIPOS = new Set(['fraccionado', 'complejo_deportivo']);

export async function editarComplejo(
  actorId: string,
  actorRol: string | undefined,
  complejoId: number,
  input: Record<string, unknown>,
) {
  // Autorización: dueño de ESE complejo o super_admin de plataforma
  if (actorRol !== 'super_admin') {
    const { data: m } = await supabaseAdmin
      .from('complejo_usuarios')
      .select('rol')
      .eq('complejo_id', complejoId)
      .eq('usuario_id', actorId)
      .maybeSingle();
    if (m?.rol !== 'dueno') throw new HttpError(403, 'Requiere ser dueño del complejo');
  }

  const patch: Record<string, unknown> = {};

  if (input.nombre !== undefined) {
    const v = str(input.nombre, 120);
    if (v.length < 2) throw new HttpError(400, 'El nombre debe tener al menos 2 caracteres');
    patch.nombre = v;
  }
  if (input.tipo !== undefined) {
    if (!TIPOS.has(String(input.tipo))) throw new HttpError(400, 'Tipo inválido');
    patch.tipo = String(input.tipo);
  }
  for (const campo of ['ciudad', 'direccion', 'telefono', 'email_contacto'] as const) {
    if (input[campo] !== undefined) patch[campo] = str(input[campo], 160) || null;
  }
  if (input.descripcion !== undefined) patch.descripcion = str(input.descripcion, 2000) || null;
  if (input.hora_apertura !== undefined) patch.hora_apertura = horaStr(input.hora_apertura, '08:00');
  if (input.hora_cierre !== undefined) patch.hora_cierre = horaStr(input.hora_cierre, '23:00');
  if (input.cancelacion_minima_horas !== undefined)
    patch.cancelacion_minima_horas = num(input.cancelacion_minima_horas, 2, 0, 168);
  if (input.descuento_turno_fijo_porcentaje !== undefined)
    patch.descuento_turno_fijo_porcentaje = num(input.descuento_turno_fijo_porcentaje, 0, 0, 100);
  if (input.sena_obligatoria !== undefined) patch.sena_obligatoria = bool(input.sena_obligatoria);
  if (input.gym !== undefined) patch.gym = bool(input.gym);
  if (input.pileta !== undefined) patch.pileta = bool(input.pileta);
  if (input.precio_mensual_gym !== undefined)
    patch.precio_mensual_gym = input.precio_mensual_gym === null || input.precio_mensual_gym === ''
      ? null
      : num(input.precio_mensual_gym, 0, 0, 100_000_000);
  if (input.precio_mensual_pileta !== undefined)
    patch.precio_mensual_pileta = input.precio_mensual_pileta === null || input.precio_mensual_pileta === ''
      ? null
      : num(input.precio_mensual_pileta, 0, 0, 100_000_000);
  for (const campo of ['ofrece_socios', 'ofrece_torneos'] as const) {
    if (input[campo] !== undefined) patch[campo] = bool(input[campo]);
  }
  if (input.amenidades !== undefined) patch.amenidades = amenidadesSanitas(input.amenidades);

  if (Object.keys(patch).length === 0) throw new HttpError(400, 'No hay cambios para guardar');

  patch.actualizado_en = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('complejos')
    .update(patch)
    .eq('id', complejoId)
    .select('*')
    .single();
  if (error) throw new HttpError(400, error.message);

  const { invalidarConfigComplejo } = await import('../../config/complejoConfig.js');
  invalidarConfigComplejo(complejoId);

  return data;
}

// ---------- plataforma (super_admin) ----------

export async function listarPlataforma() {
  const { data: complejos, error } = await supabaseAdmin
    .from('complejos')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw new HttpError(500, error.message);

  const lista = (complejos ?? []) as ComplejoRow[];
  const ids = lista.map((c) => c.id as number);
  const [subs, { data: duenos }] = await Promise.all([
    ultimasSuscripcionesPorComplejo(ids),
    supabaseAdmin
      .from('complejo_usuarios')
      .select('complejo_id, usuario_id, usuarios(nombre, apellido)')
      .in('complejo_id', ids.length ? ids : [-1])
      .eq('rol', 'dueno'),
  ]);

  const duenosPorComplejo = new Map<number, string[]>();
  for (const d of (duenos ?? []) as unknown as Array<{ complejo_id: number; usuarios: { nombre: string; apellido: string } | null }>) {
    const arr = duenosPorComplejo.get(d.complejo_id) ?? [];
    if (d.usuarios) arr.push(`${d.usuarios.nombre} ${d.usuarios.apellido}`.trim());
    duenosPorComplejo.set(d.complejo_id, arr);
  }

  return lista.map((c) => {
    const sub = subs.get(c.id as number) ?? null;
    return {
      complejo: c,
      suscripcion: sub,
      vigente: esVigente(sub),
      duenos: duenosPorComplejo.get(c.id as number) ?? [],
    };
  });
}

export async function resumenPlataforma() {
  const items = await listarPlataforma();
  const hoy = hoyLocal();
  let prueba = 0, activa = 0, suspendida = 0;
  let mrr = 0;
  for (const { suscripcion: sub } of items) {
    if (esVigente(sub)) {
      if (sub?.estado === 'prueba') prueba += 1;
      else activa += 1;
      if (sub?.estado === 'activa') mrr += Number(sub.monto ?? 0);
    } else {
      suspendida += 1;
    }
  }
  return { total: items.length, activos: prueba + activa, en_prueba: prueba, en_activa: activa, suspendidos: suspendida, mrr, hoy };
}
