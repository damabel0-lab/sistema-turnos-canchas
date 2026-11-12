import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';

export interface Beneficio {
  id: number;
  nombre_beneficio: string;
  descuento_porcentaje: number;
  aplica_en: string;
  complejo_id: number | null;
}

export interface NuevoBeneficio {
  nombre_beneficio: string;
  descuento_porcentaje: number;
  aplica_en: string;
}

export async function listarBeneficios(complejoId: number) {
  const { data, error } = await supabaseAdmin
    .from('beneficios_socios')
    .select('*')
    .eq('complejo_id', complejoId)
    .order('nombre_beneficio');
  if (error) throw new HttpError(500, error.message);
  return data ?? [];
}

export async function crearBeneficio(datos: NuevoBeneficio, complejoId: number) {
  if (!datos.nombre_beneficio?.trim()) throw new HttpError(400, 'El nombre es obligatorio');
  if (!(datos.descuento_porcentaje >= 0) || datos.descuento_porcentaje > 100) {
    throw new HttpError(400, 'El descuento debe estar entre 0 y 100');
  }

  const { data, error } = await supabaseAdmin
    .from('beneficios_socios')
    .insert({
      nombre_beneficio: datos.nombre_beneficio.trim(),
      descuento_porcentaje: datos.descuento_porcentaje,
      aplica_en: datos.aplica_en,
      complejo_id: complejoId,
    })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return data;
}

export async function eliminarBeneficio(id: number, complejoId: number) {
  const { data, error } = await supabaseAdmin
    .from('beneficios_socios')
    .delete()
    .eq('id', id)
    .eq('complejo_id', complejoId)
    .select('id');
  if (error) throw new HttpError(400, error.message);
  if (!data || data.length === 0) throw new HttpError(404, 'Beneficio no encontrado');
  return { ok: true };
}
