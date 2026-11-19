import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireSuperAdmin, type AuthedRequest } from '../../middleware/auth.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';

export const configuracionPlataformaRouter = Router();

const h = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthedRequest, res).catch(next);

const bool = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';
const num = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

// POST /admin/platform-config/reset -> siembra fila inicial si no existe (super_admin idempotente)
configuracionPlataformaRouter.post(
  '/reset',
  requireSuperAdmin,
  h(async () => {
    const { data: existente } = await supabaseAdmin.from('configuracion_plataforma').select('id').maybeSingle();
    if (existente) return fetchActual();
    const { error } = await supabaseAdmin.from('configuracion_plataforma').insert({});
    if (error) throw new HttpError(500, error.message);
    return fetchActual();
  }),
);

// GET /admin/platform-config/actual -> único registro de configuración de la plataforma
async function fetchActual() {
  const { data, error } = await supabaseAdmin.from('configuracion_plataforma').select('*').maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'No hay configuración de plataforma. Ejecutá docs/plataforma_config.sql');
  return data;
}
configuracionPlataformaRouter.get(
  '/actual',
  requireSuperAdmin,
  h(async (_req, res) => {
    res.json(await fetchActual());
  }),
);

// GET /config/publico -> mínimo de info pública para footer/contacto (cualquier usuario logueado)
configuracionPlataformaRouter.get(
  '/publico',
  h(async (_req, res) => {
    const { data } = await supabaseAdmin
      .from('configuracion_plataforma')
      .select('nombre_plataforma, email_soporte, telefono_soporte, registro_habilitado, trial_dias, precio_plan_mensual')
      .maybeSingle();
    res.json(data ?? {});
  }),
);

// PATCH /admin/platform-config/ -> editar campos de la plataforma (super_admin only)
configuracionPlataformaRouter.patch(
  '/',
  requireSuperAdmin,
  h(async (req, res) => {
    const body = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (body.precio_plan_mensual !== undefined) patch.precio_plan_mensual = num(body.precio_plan_mensual, 50000, 0, 100_000_000);
    if (body.trial_dias !== undefined) patch.trial_dias = num(body.trial_dias, 14, 0, 365);
    if (body.registro_habilitado !== undefined) patch.registro_habilitado = bool(body.registro_habilitado);
    if (body.emails_reales !== undefined) patch.emails_reales = bool(body.emails_reales);
    if (body.nombre_plataforma !== undefined) patch.nombre_plataforma = str(body.nombre_plataforma, 120);
    if (body.email_soporte !== undefined) patch.email_soporte = str(body.email_soporte, 120).toLowerCase();
    if (body.telefono_soporte !== undefined) patch.telefono_soporte = str(body.telefono_soporte, 40) || null;
    if (body.smtp_host !== undefined) patch.smtp_host = str(body.smtp_host, 120) || null;
    if (body.smtp_puerto !== undefined) patch.smtp_puerto = num(body.smtp_puerto, 0, 0, 65535);
    if (body.smtp_usuario !== undefined) patch.smtp_usuario = str(body.smtp_usuario, 120) || null;
    if (body.smtp_password !== undefined) patch.smtp_password = str(body.smtp_password, 200) || null;
    if (Object.keys(patch).length === 0) throw new HttpError(400, 'No hay cambios para guardar');
    patch.actualizado_en = new Date().toISOString();
    const { error } = await supabaseAdmin.from('configuracion_plataforma').update(patch).eq('id', 1);
    if (error) throw new HttpError(400, error.message);
    res.json(await fetchActual());
  }),
);
