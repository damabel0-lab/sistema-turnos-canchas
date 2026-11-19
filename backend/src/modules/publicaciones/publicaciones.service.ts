import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';

const BUCKET = 'publicaciones';
const MIME_PERMITIDOS = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_IMAGENES = 4;
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB por imagen

export interface AutorPublicacion {
  id: string;
  nombre: string;
  apellido: string;
  es_dueno: boolean;
}

export interface PublicacionSalida {
  id: number;
  texto: string | null;
  creado_en: string;
  autor: AutorPublicacion;
  imagenes: { id: number; url: string }[];
  reacciones: number;
  me_gusta: boolean;
  comentarios: number;
}

export interface ComentarioSalida {
  id: number;
  texto: string;
  creado_en: string;
  autor: AutorPublicacion;
}

interface ImagenEntrada {
  data?: string;
  mime?: string;
}

/* ================= Helpers ================= */

async function complejoPorSlug(slug: string) {
  const { data } = await supabaseAdmin
    .from('complejos')
    .select('id, nombre, activo')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) throw new HttpError(404, 'Complejo no encontrado');
  return data as { id: number; nombre: string; activo: boolean };
}

/** Perfiles de autores + si son dueños de ESTE complejo (para el badge) */
async function autoresDe(ids: string[], complejoId: number): Promise<Map<string, AutorPublicacion>> {
  const mapa = new Map<string, AutorPublicacion>();
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return mapa;

  const [{ data: usuarios }, { data: duenos }] = await Promise.all([
    supabaseAdmin.from('usuarios').select('id, nombre, apellido').in('id', unicos),
    supabaseAdmin
      .from('complejo_usuarios')
      .select('usuario_id')
      .eq('complejo_id', complejoId)
      .eq('rol', 'dueno'),
  ]);
  const setDuenos = new Set((duenos ?? []).map((d) => d.usuario_id as string));
  for (const u of usuarios ?? []) {
    mapa.set(u.id, {
      id: u.id,
      nombre: u.nombre ?? '',
      apellido: u.apellido ?? '',
      es_dueno: setDuenos.has(u.id),
    });
  }
  return mapa;
}

function decodificarImagen(img: ImagenEntrada): { buf: Buffer; mime: string; ext: string } {
  if (typeof img?.data !== 'string' || !img.data.includes(',')) {
    throw new HttpError(400, 'Imagen inválida');
  }
  const corte = img.data.indexOf(',');
  const cabecera = img.data.slice(0, corte);
  const mime = cabecera.match(/data:([^;]+)/)?.[1] ?? img.mime ?? '';
  if (!MIME_PERMITIDOS.has(mime)) {
    throw new HttpError(400, 'Formato no permitido (PNG, JPEG o WebP)');
  }
  const buf = Buffer.from(img.data.slice(corte + 1), 'base64');
  if (buf.length === 0) throw new HttpError(400, 'Imagen vacía');
  if (buf.length > MAX_BYTES) throw new HttpError(400, 'La imagen supera los 6 MB');
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return { buf, mime, ext };
}

async function subirImagen(rutaBase: string, img: ImagenEntrada): Promise<string> {
  const { buf, mime, ext } = decodificarImagen(img);
  const ruta = `${rutaBase}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(ruta, buf, { contentType: mime, upsert: true });
  if (error) throw new HttpError(500, `No se pudo subir la imagen: ${error.message}`);
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(ruta);
  return data.publicUrl;
}

/* ================= Listado ================= */

export async function listarPublicaciones(
  complejoId: number,
  usuarioId: string | null,
): Promise<PublicacionSalida[]> {
  const { data: pubs, error } = await supabaseAdmin
    .from('publicaciones')
    .select('id, texto, creado_en, usuario_id')
    .eq('complejo_id', complejoId)
    .eq('eliminado', false)
    .order('creado_en', { ascending: false })
    .limit(50);
  if (error) throw new HttpError(400, error.message);

  const ids = (pubs ?? []).map((p) => p.id as number);
  if (ids.length === 0) return [];

  const [imgs, reacc, coments] = await Promise.all([
    supabaseAdmin
      .from('publicacion_imagenes')
      .select('id, publicacion_id, url, posicion')
      .in('publicacion_id', ids)
      .order('posicion', { ascending: true }),
    supabaseAdmin
      .from('publicacion_reacciones')
      .select('publicacion_id, usuario_id')
      .in('publicacion_id', ids),
    supabaseAdmin
      .from('publicacion_comentarios')
      .select('id, publicacion_id')
      .in('publicacion_id', ids)
      .eq('eliminado', false),
  ]);

  const autores = await autoresDe((pubs ?? []).map((p) => p.usuario_id as string), complejoId);

  const imgsPor = new Map<number, { id: number; url: string }[]>();
  for (const i of imgs.data ?? []) {
    const arr = imgsPor.get(i.publicacion_id as number) ?? [];
    arr.push({ id: i.id as number, url: i.url as string });
    imgsPor.set(i.publicacion_id as number, arr);
  }
  const reaccPor = new Map<number, number>();
  const misGustos = new Set<number>();
  for (const r of reacc.data ?? []) {
    const pid = r.publicacion_id as number;
    reaccPor.set(pid, (reaccPor.get(pid) ?? 0) + 1);
    if (usuarioId && r.usuario_id === usuarioId) misGustos.add(pid);
  }
  const comPor = new Map<number, number>();
  for (const c of coments.data ?? []) {
    const pid = c.publicacion_id as number;
    comPor.set(pid, (comPor.get(pid) ?? 0) + 1);
  }

  return (pubs ?? []).map((p) => {
    const pid = p.id as number;
    return {
      id: pid,
      texto: p.texto as string | null,
      creado_en: p.creado_en as string,
      autor:
        autores.get(p.usuario_id as string) ?? {
          id: p.usuario_id as string,
          nombre: 'Usuario',
          apellido: '',
          es_dueno: false,
        },
      imagenes: imgsPor.get(pid) ?? [],
      reacciones: reaccPor.get(pid) ?? 0,
      me_gusta: misGustos.has(pid),
      comentarios: comPor.get(pid) ?? 0,
    };
  });
}

/* ================= Crear publicación ================= */

export async function crearPublicacion(
  complejoId: number,
  usuarioId: string,
  body: { texto?: unknown; imagenes?: unknown },
): Promise<PublicacionSalida> {
  const texto = typeof body?.texto === 'string' ? body.texto.trim() : '';
  const imagenes = Array.isArray(body?.imagenes) ? (body.imagenes as ImagenEntrada[]) : [];
  if (!texto && imagenes.length === 0) {
    throw new HttpError(400, 'Escribí algo o agregá una foto');
  }
  if (texto.length > 2000) throw new HttpError(400, 'El texto no puede superar 2000 caracteres');
  if (imagenes.length > MAX_IMAGENES) {
    throw new HttpError(400, `Hasta ${MAX_IMAGENES} fotos por publicación`);
  }

  const { data: pub, error } = await supabaseAdmin
    .from('publicaciones')
    .insert({ complejo_id: complejoId, usuario_id: usuarioId, texto: texto || null })
    .select('id')
    .single();
  if (error) throw new HttpError(400, error.message);

  if (imagenes.length > 0) {
    const filas: { publicacion_id: number; url: string; posicion: number }[] = [];
    for (let i = 0; i < imagenes.length; i++) {
      const url = await subirImagen(`${complejoId}/${pub.id}-${i}-${randomUUID().slice(0, 8)}`, imagenes[i]);
      filas.push({ publicacion_id: pub.id as number, url, posicion: i });
    }
    const { error: eImgs } = await supabaseAdmin.from('publicacion_imagenes').insert(filas);
    if (eImgs) throw new HttpError(400, eImgs.message);
  }

  const lista = await listarPublicaciones(complejoId, usuarioId);
  const creada = lista.find((p) => p.id === (pub.id as number));
  if (!creada) throw new HttpError(500, 'No se pudo leer la publicación creada');
  return creada;
}

/* ================= Reacciones (like) ================= */

export async function alternarReaccion(
  publicacionId: number,
  usuarioId: string,
): Promise<{ me_gusta: boolean; reacciones: number }> {
  const { data: pub } = await supabaseAdmin
    .from('publicaciones')
    .select('id')
    .eq('id', publicacionId)
    .eq('eliminado', false)
    .maybeSingle();
  if (!pub) throw new HttpError(404, 'Publicación no encontrada');

  const { data: existente } = await supabaseAdmin
    .from('publicacion_reacciones')
    .select('id')
    .eq('publicacion_id', publicacionId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (existente) {
    await supabaseAdmin.from('publicacion_reacciones').delete().eq('id', existente.id);
  } else {
    const { error } = await supabaseAdmin
      .from('publicacion_reacciones')
      .insert({ publicacion_id: publicacionId, usuario_id: usuarioId });
    // carrera posible con el unique: si otro request ya lo insertó, lo tomamos como dado
    if (error && !error.message.includes('duplicate')) throw new HttpError(400, error.message);
  }

  const { count } = await supabaseAdmin
    .from('publicacion_reacciones')
    .select('id', { count: 'exact', head: true })
    .eq('publicacion_id', publicacionId);
  return { me_gusta: !existente, reacciones: count ?? 0 };
}

/* ================= Comentarios ================= */

export async function listarComentarios(publicacionId: number): Promise<ComentarioSalida[]> {
  const { data, error } = await supabaseAdmin
    .from('publicacion_comentarios')
    .select('id, texto, creado_en, usuario_id, publicacion(complejo_id)')
    .eq('publicacion_id', publicacionId)
    .eq('eliminado', false)
    .order('creado_en', { ascending: true });
  if (error) throw new HttpError(400, error.message);

  const complejoId =
    ((data?.[0] as { publicacion?: { complejo_id?: number } } | null)?.publicacion?.complejo_id as number) ?? 0;
  const autores = await autoresDe((data ?? []).map((c) => c.usuario_id as string), complejoId);

  return (data ?? []).map((c) => ({
    id: c.id as number,
    texto: c.texto as string,
    creado_en: c.creado_en as string,
    autor:
      autores.get(c.usuario_id as string) ?? {
        id: c.usuario_id as string,
        nombre: 'Usuario',
        apellido: '',
        es_dueno: false,
      },
  }));
}

export async function crearComentario(
  publicacionId: number,
  usuarioId: string,
  textoEntrada: unknown,
): Promise<ComentarioSalida> {
  const texto = typeof textoEntrada === 'string' ? textoEntrada.trim() : '';
  if (!texto) throw new HttpError(400, 'El comentario no puede estar vacío');
  if (texto.length > 1000) throw new HttpError(400, 'El comentario no puede superar 1000 caracteres');

  const { data: pub } = await supabaseAdmin
    .from('publicaciones')
    .select('id, complejo_id')
    .eq('id', publicacionId)
    .eq('eliminado', false)
    .maybeSingle();
  if (!pub) throw new HttpError(404, 'Publicación no encontrada');

  const { data: creado, error } = await supabaseAdmin
    .from('publicacion_comentarios')
    .insert({ publicacion_id: publicacionId, usuario_id: usuarioId, texto })
    .select('id, texto, creado_en, usuario_id')
    .single();
  if (error) throw new HttpError(400, error.message);

  const autores = await autoresDe([usuarioId], pub.complejo_id as number);
  return {
    id: creado.id as number,
    texto: creado.texto as string,
    creado_en: creado.creado_en as string,
    autor: autores.get(usuarioId) ?? { id: usuarioId, nombre: 'Usuario', apellido: '', es_dueno: false },
  };
}

/* ================= Eliminar (borrado lógico) ================= */

async function puedeModerar(
  usuarioId: string,
  rol: string | undefined,
  membresias: { complejo_id: number; rol: string }[] | undefined,
  complejoId: number,
): Promise<boolean> {
  if (rol === 'super_admin') return true;
  return (membresias ?? []).some(
    (m) => m.complejo_id === complejoId && (m.rol === 'dueno' || m.rol === 'recepcionista'),
  );
}

export async function eliminarPublicacion(
  publicacionId: number,
  usuarioId: string,
  rol: string | undefined,
  membresias: { complejo_id: number; rol: string }[] | undefined,
): Promise<void> {
  const { data: pub } = await supabaseAdmin
    .from('publicaciones')
    .select('id, usuario_id, complejo_id')
    .eq('id', publicacionId)
    .eq('eliminado', false)
    .maybeSingle();
  if (!pub) throw new HttpError(404, 'Publicación no encontrada');

  const esAutor = pub.usuario_id === usuarioId;
  const moderador = await puedeModerar(usuarioId, rol, membresias, pub.complejo_id as number);
  if (!esAutor && !moderador) throw new HttpError(403, 'No podés borrar esta publicación');

  const { error } = await supabaseAdmin
    .from('publicaciones')
    .update({ eliminado: true })
    .eq('id', publicacionId);
  if (error) throw new HttpError(400, error.message);
}

export async function eliminarComentario(
  comentarioId: number,
  usuarioId: string,
  rol: string | undefined,
  membresias: { complejo_id: number; rol: string }[] | undefined,
): Promise<void> {
  const { data: com } = await supabaseAdmin
    .from('publicacion_comentarios')
    .select('id, usuario_id, publicacion(complejo_id)')
    .eq('id', comentarioId)
    .eq('eliminado', false)
    .maybeSingle();
  if (!com) throw new HttpError(404, 'Comentario no encontrado');

  const rel = com.publicacion as unknown;
  const primero = Array.isArray(rel) ? rel[0] : rel;
  const complejoId = primero ? (primero as { complejo_id: number }).complejo_id : undefined;
  if (!complejoId) throw new HttpError(404, 'Publicación no encontrada');

  const esAutor = com.usuario_id === usuarioId;
  const moderador = await puedeModerar(usuarioId, rol, membresias, complejoId);
  if (!esAutor && !moderador) throw new HttpError(403, 'No podés borrar este comentario');

  const { error } = await supabaseAdmin
    .from('publicacion_comentarios')
    .update({ eliminado: true })
    .eq('id', comentarioId);
  if (error) throw new HttpError(400, error.message);
}

/* ================= Fotos de perfil / portada del complejo ================= */

export async function subirFotoComplejo(
  complejoId: number,
  campo: unknown,
  imagen: ImagenEntrada | undefined,
): Promise<{ campo: string; url: string }> {
  const campoLimpio = campo === 'foto_perfil' || campo === 'foto_portada' ? campo : null;
  if (!campoLimpio) throw new HttpError(400, "campo debe ser 'foto_perfil' o 'foto_portada'");
  if (!imagen) throw new HttpError(400, 'Falta la imagen');

  const url = await subirImagen(`complejos/${complejoId}/${campoLimpio}-${randomUUID().slice(0, 8)}`, imagen);

  const { error } = await supabaseAdmin
    .from('complejos')
    .update({ [campoLimpio]: url })
    .eq('id', complejoId);
  if (error) throw new HttpError(400, error.message);

  return { campo: campoLimpio, url };
}
