import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { AuthedRequest } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/error.js';
import {
  listarPublicaciones,
  crearPublicacion,
  alternarReaccion,
  listarComentarios,
  crearComentario,
  eliminarPublicacion,
  eliminarComentario,
  subirFotoComplejo,
} from './publicaciones.service.js';
import { supabaseAdmin } from '../../config/supabase.js';

export const publicacionesRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthedRequest, res).catch(next);

/** Slug → id de complejo (404 si no existe) */
async function complejoIdPorSlug(slug: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('complejos')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) throw new HttpError(404, 'Complejo no encontrado');
  return data.id as number;
}

// GET /publicaciones/complejo/:slug -> muro del complejo (con "me_gusta" del usuario)
publicacionesRouter.get(
  '/complejo/:slug',
  h(async (req, res) => {
    const cid = await complejoIdPorSlug(String(req.params.slug));
    res.json(await listarPublicaciones(cid, req.userId ?? null));
  }),
);

// POST /publicaciones/complejo/:slug -> publicar (cualquier usuario logueado: cliente o dueño de otro complejo)
publicacionesRouter.post(
  '/complejo/:slug',
  h(async (req, res) => {
    if (!req.userId) throw new HttpError(401, 'Iniciá sesión para publicar');
    const cid = await complejoIdPorSlug(String(req.params.slug));
    res.status(201).json(await crearPublicacion(cid, req.userId, req.body ?? {}));
  }),
);

// POST /publicaciones/complejo/:slug/imagenes -> foto de perfil o portada (solo DUEÑO de ese complejo)
publicacionesRouter.post(
  '/complejo/:slug/imagenes',
  h(async (req, res) => {
    if (!req.userId) throw new HttpError(401, 'Iniciá sesión');
    const cid = await complejoIdPorSlug(String(req.params.slug));
    const esDueno = (req.membresias ?? []).some((m) => m.complejo_id === cid && m.rol === 'dueno');
    if (!esDueno) throw new HttpError(403, 'Solo el dueño del complejo puede cambiar sus fotos');
    const { campo, imagen } = req.body ?? {};
    res.json(await subirFotoComplejo(cid, campo, imagen));
  }),
);

// POST /publicaciones/:id/reaccion -> like on/off
publicacionesRouter.post(
  '/:id/reaccion',
  h(async (req, res) => {
    if (!req.userId) throw new HttpError(401, 'Iniciá sesión para reaccionar');
    res.json(await alternarReaccion(Number(req.params.id), req.userId));
  }),
);

// GET /publicaciones/:id/comentarios
publicacionesRouter.get(
  '/:id/comentarios',
  h(async (req, res) => {
    res.json(await listarComentarios(Number(req.params.id)));
  }),
);

// POST /publicaciones/:id/comentarios
publicacionesRouter.post(
  '/:id/comentarios',
  h(async (req, res) => {
    if (!req.userId) throw new HttpError(401, 'Iniciá sesión para comentar');
    res.status(201).json(await crearComentario(Number(req.params.id), req.userId, req.body?.texto));
  }),
);

// DELETE /publicaciones/comentarios/:id -> borrar comentario (autor o staff del complejo)
publicacionesRouter.delete(
  '/comentarios/:id',
  h(async (req, res) => {
    if (!req.userId) throw new HttpError(401, 'Iniciá sesión');
    await eliminarComentario(Number(req.params.id), req.userId, req.rol, req.membresias);
    res.json({ ok: true });
  }),
);

// DELETE /publicaciones/:id -> borrar publicación (autor o staff del complejo)
publicacionesRouter.delete(
  '/:id',
  h(async (req, res) => {
    if (!req.userId) throw new HttpError(401, 'Iniciá sesión');
    await eliminarPublicacion(Number(req.params.id), req.userId, req.rol, req.membresias);
    res.json({ ok: true });
  }),
);
