import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';

export async function listarBeneficiosDeSocio(usuarioId: string) {
  const { data, error } = await supabaseAdmin
    .from('socio_beneficios')
    .select('beneficio_id, beneficios_socios(*)')
    .eq('usuario_id', usuarioId);
  if (error) throw new HttpError(500, error.message);
  return (data ?? []).map((d: any) => d.beneficios_socios);
}

export async function asignarBeneficio(usuarioId: string, beneficioId: number) {
  const { error } = await supabaseAdmin.from('socio_beneficios').insert({
    usuario_id: usuarioId,
    beneficio_id: beneficioId,
  });
  if (error) throw new HttpError(409, 'Ese beneficio ya está asignado o datos inválidos');
  return { ok: true };
}

export async function quitarBeneficio(usuarioId: string, beneficioId: number) {
  const { error } = await supabaseAdmin
    .from('socio_beneficios')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('beneficio_id', beneficioId);
  if (error) throw new HttpError(404, 'Asignación no encontrada');
  return { ok: true };
}

export async function descuentoDelSocio(usuarioId: string, aplicaEn: string) {
  const { data, error } = await supabaseAdmin
    .from('socio_beneficios')
    .select('beneficios_socios(descuento_porcentaje, aplica_en)')
    .eq('usuario_id', usuarioId)
    .eq('beneficios_socios.aplica_en', aplicaEn)
    .order('descuento_porcentaje', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) return 0;
  const fila = data as any;
  return Number(fila.beneficios_socios?.descuento_porcentaje ?? 0);
}
