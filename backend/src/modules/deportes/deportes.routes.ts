import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { requireStaff, requireSuperAdmin } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/error.js';

export const deportesRouter = Router();

const h = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

// GET /deportes -> listado completo
deportesRouter.get(
  '/',
  h(async (_req, res) => {
    const { data, error } = await supabaseAdmin.from('deportes').select('*').order('nombre');
    if (error) throw new HttpError(500, error.message);
    res.json(data);
  }),
);

// PATCH /deportes/:id -> editar nombre, tipo, requiere_cancha
deportesRouter.patch(
  '/:id',
  requireSuperAdmin,
  h(async (req, res) => {
    const { nombre, tipo, requiere_cancha } = req.body;
    const cambios: Record<string, unknown> = {};
    if (nombre !== undefined) cambios.nombre = nombre.trim();
    if (tipo !== undefined) cambios.tipo = tipo;
    if (requiere_cancha !== undefined) cambios.requiere_cancha = !!requiere_cancha;

    const { data, error } = await supabaseAdmin
      .from('deportes')
      .update(cambios)
      .eq('id', Number(req.params.id))
      .select()
      .single();
    if (error) throw new HttpError(404, error.message);
    res.json(data);
  }),
);

// DELETE /deportes/:id -> eliminar deporte personalizado
deportesRouter.delete(
  '/:id',
  requireSuperAdmin,
  h(async (req, res) => {
    const { error } = await supabaseAdmin.from('deportes').delete().eq('id', Number(req.params.id));
    if (error) throw new HttpError(404, error.message);
    res.json({ ok: true });
  }),
);

// POST /deportes -> deporte personalizado por staff del complejo activo (o super_admin plataforma)
deportesRouter.post(
  '/',
  requireStaff,
  h(async (req, res) => {
    const { nombre, tipo = 'cancha', requiere_cancha = true } = req.body;
    if (!nombre?.trim()) throw new HttpError(400, 'El nombre es obligatorio');
    if (!['cancha', 'gimnasio', 'pileta', 'otro'].includes(tipo)) {
      throw new HttpError(400, 'tipo debe ser cancha, gimnasio, pileta u otro');
    }

    const { data, error } = await supabaseAdmin
      .from('deportes')
      .insert({ nombre: nombre.trim(), tipo, requiere_cancha })
      .select()
      .single();
    if (error) throw new HttpError(400, error.message);
    res.status(201).json(data);
  }),
);
