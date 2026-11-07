import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

export interface AuthedRequest extends Request {
  userId?: string;
  rol?: string;
}

/** Valida el JWT de Supabase enviado en Authorization: Bearer <token> */
export async function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token faltante' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  req.userId = data.user.id;

  const { data: perfil } = await supabaseAdmin
    .from('usuarios')
    .select('rol')
    .eq('id', data.user.id)
    .single();
  req.rol = perfil?.rol;

  next();
}

/** Requiere rol super_admin (finanzas, precios, configuración) */
export function requireSuperAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.rol !== 'super_admin') {
    return res.status(403).json({ error: 'Requiere rol super_admin' });
  }
  next();
}

/** Recepcionista o super_admin (grilla, reservas, cobros) */
export function requireStaff(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.rol !== 'super_admin' && req.rol !== 'recepcionista') {
    return res.status(403).json({ error: 'Requiere rol de staff' });
  }
  next();
}
