import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase.js';
import { requireStaff, complejoIdRequerido, type AuthedRequest } from '../../middleware/auth.js';
import { HttpError } from '../../middleware/error.js';

export const bloqueosRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req as AuthedRequest, res).catch(next);

// POST /bloqueos -> bloquear horarios (mantenimiento, lluvia, evento privado)
// staff del complejo activo: recepcionista también puede bloquear (ej. lluvia en el momento)
bloqueosRouter.post(
  '/',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    const { cancha_id, fecha_inicio, fecha_fin, motivo } = req.body ?? {};
    if (!cancha_id) throw new HttpError(400, 'cancha_id es obligatorio');
    if (!fecha_inicio || !fecha_fin) throw new HttpError(400, 'fecha_inicio y fecha_fin son obligatorias');
    if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
      throw new HttpError(400, 'fecha_fin debe ser posterior a fecha_inicio');
    }
    if (!motivo?.trim()) throw new HttpError(400, 'El motivo es obligatorio');

    // La cancha tiene que ser de ESTE complejo
    const { data: cancha } = await supabaseAdmin
      .from('canchas')
      .select('id, complejo_id')
      .eq('id', Number(cancha_id))
      .maybeSingle();
    if (!cancha || cancha.complejo_id !== cid) throw new HttpError(404, 'Cancha no encontrada');

    const { data, error } = await supabaseAdmin
      .from('bloqueos_horarios')
      .insert({ cancha_id: Number(cancha_id), fecha_inicio, fecha_fin, motivo: motivo.trim(), complejo_id: cid })
      .select()
      .single();
    if (error) throw new HttpError(400, error.message);
    res.status(201).json(data);
  }),
);

// DELETE /bloqueos/:id -> levantar un bloqueo
bloqueosRouter.delete(
  '/:id',
  requireStaff,
  h(async (req, res) => {
    const cid = complejoIdRequerido(req);
    const { data, error } = await supabaseAdmin
      .from('bloqueos_horarios')
      .delete()
      .eq('id', Number(req.params.id))
      .eq('complejo_id', cid)
      .select('id');
    if (error) throw new HttpError(400, error.message);
    if (!data || data.length === 0) throw new HttpError(404, 'Bloqueo no encontrado');
    res.json({ ok: true });
  }),
);
