import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';
import { descuentoDelSocio } from '../socio-beneficios/socio-beneficios.service.js';

export interface Abono {
  id: number;
  usuario_id: string;
  disciplina_id: number | null;
  clases_totales: number;
  clases_disponibles: number;
  fecha_inicio: string;
  fecha_vencimiento: string;
  monto_pagado: number;
  activo: boolean;
}

export interface VenderAbono {
  usuario_id: string;
  disciplina_id?: number | null;
  clases_totales: number;
  fecha_vencimiento: string;
  monto_pagado: number;
}

export async function listarAbonos() {
  const { data, error } = await supabaseAdmin
    .from('abonos')
    .select('*')
    .order('fecha_vencimiento');
  if (error) throw new HttpError(500, error.message);
  return data ?? [];
}

export async function listarAbonosDelUsuario(usuarioId: string) {
  const { data, error } = await supabaseAdmin
    .from('abonos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('fecha_vencimiento');
  if (error) throw new HttpError(500, error.message);
  return data ?? [];
}

export async function venderAbono(datos: VenderAbono) {
  if (!(datos.clases_totales > 0)) throw new HttpError(400, 'Las clases totales deben ser > 0');
  if (!(datos.monto_pagado >= 0)) throw new HttpError(400, 'El monto debe ser >= 0');

  const { data, error } = await supabaseAdmin
    .from('abonos')
    .insert({
      usuario_id: datos.usuario_id,
      disciplina_id: datos.disciplina_id ?? null,
      clases_totales: datos.clases_totales,
      clases_disponibles: datos.clases_totales,
      fecha_inicio: new Date().toISOString().slice(0, 10),
      fecha_vencimiento: datos.fecha_vencimiento,
      monto_pagado: datos.monto_pagado,
      activo: true,
    })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
}

/** Consumir 1 clase de un abono activo. Devuelve cuántas quedan. */
export async function consumirClase(usuarioId: string, disciplinaId?: number | null) {
  const { data: abonos, error } = await supabaseAdmin
    .from('abonos')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('activo', true)
    .order('fecha_vencimiento', { ascending: true });
  if (error) throw new HttpError(500, error.message);

  const apto = (abonos ?? []).find((a: any) => {
    const venc = new Date(a.fecha_vencimiento);
    if (venc < new Date()) return false; // vencido
    if (disciplinaId !== undefined && a.disciplina_id !== null && a.disciplina_id !== disciplinaId) return false;
    return a.clases_disponibles > 0;
  });

  if (!apto) throw new HttpError(409, 'No quedan clases disponibles en ningún abono activo');

  const { data, error: eUpd } = await supabaseAdmin
    .from('abonos')
    .update({ clases_disponibles: apto.clases_disponibles - 1 })
    .eq('id', apto.id)
    .select()
    .single();
  if (eUpd) throw new HttpError(500, eUpd.message);

  return {
    abono_id: data.id,
    clases_disponibles: data.clases_disponibles,
    clases_totales: data.clases_totales,
    fecha_vencimiento: data.fecha_vencimiento,
  };
}

export async function listarAbonosVencidos() {
  const hoy = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from('abonos')
    .select('*')
    .eq('activo', true)
    .lt('fecha_vencimiento', hoy);
  if (error) throw new HttpError(500, error.message);
  return data ?? [];
}

/** Marcar como inactivo los abonos vencidos (cron o manual) */
export async function cerrarAbonosVencidos() {
  const hoy = new Date().toISOString().slice(0, 10);
  const { error } = await supabaseAdmin
    .from('abonos')
    .update({ activo: false })
    .eq('activo', true)
    .lt('fecha_vencimiento', hoy);
  if (error) throw new HttpError(500, error.message);
  return { ok: true };
}
