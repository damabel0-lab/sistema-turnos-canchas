import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { requireSuperAdmin } from '../../middleware/auth.js';
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

// POST /deportes -> deporte personalizado (predeterminados ya vienen de la DB)
deportesRouter.post(
  '/',
  requireSuperAdmin,
  h(async (req, res) => {
    const { nombre, tipo = 'cancha', requiere_cancha = true } = req.body;
    if (!nombre?.trim()) throw new HttpError(400, 'El nombre es obligatorio');

    const { data, error } = await supabaseAdmin
      .from('deportes')
      .insert({ nombre: nombre.trim(), tipo, requiere_cancha })
      .select()
      .single();
    if (error) throw new HttpError(400, error.message);
    res.status(201).json(data);
  }),
);
