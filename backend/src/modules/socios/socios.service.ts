import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';

export interface Socio {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  es_socio: boolean;
  creado_en: string;
}

export interface NuevoSocio {
  nombre: string;
  apellido: string;
  telefono: string;
}

export async function listarSocios() {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombre, apellido, telefono, es_socio, creado_en')
    .eq('es_socio', true)
    .order('apellido')
    .order('nombre');
  if (error) throw new HttpError(500, error.message);
  return (data ?? []).map((u: any) => ({
    id: u.id,
    nombre: u.nombre,
    apellido: u.apellido,
    telefono: u.telefono,
    es_socio: u.es_socio,
    creado_en: u.creado_en,
  }));
}

export async function buscarSocio(telefono: string) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombre, apellido, telefono, es_socio')
    .eq('telefono', telefono)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  return data;
}

export async function darDeAltaSocio(datos: NuevoSocio) {
  if (!datos.nombre?.trim()) throw new HttpError(400, 'El nombre es obligatorio');
  if (!datos.apellido?.trim()) throw new HttpError(400, 'El apellido es obligatorio');
  if (!datos.telefono?.trim()) throw new HttpError(400, 'El teléfono es obligatorio');

  const existente = await buscarSocio(datos.telefono);
  if (existente) {
    if (existente.es_socio) throw new HttpError(409, 'Ese teléfono ya es socio');
    // Dar de alta como socio a un cliente existente
    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .update({ es_socio: true })
      .eq('id', existente.id)
      .select()
      .single();
    if (error) throw new HttpError(500, error.message);
    return data;
  }

  // Cliente nuevo: crear usuario de auth + perfil como socio
  const email = `${datos.telefono.replace(/\D/g, '')}@socios.playcontrol.local`;
  const { data: creado, error: eAuth } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
  });
  if (eAuth || !creado.user) {
    throw new HttpError(500, `No se pudo crear el usuario: ${eAuth?.message ?? 'error desconocido'}`);
  }

  const { error: ePerfil } = await supabaseAdmin.from('usuarios').insert({
    id: creado.user.id,
    nombre: datos.nombre.trim(),
    apellido: datos.apellido.trim(),
    telefono: datos.telefono.trim(),
    rol: 'cliente',
    es_socio: true,
  });
  if (ePerfil) throw new HttpError(500, `No se pudo crear el perfil: ${ePerfil.message}`);

  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .eq('id', creado.user.id)
    .single();
  if (error) throw new HttpError(500, error.message);
  return data;
}

export async function bajaSocio(id: string) {
  const { error } = await supabaseAdmin
    .from('usuarios')
    .update({ es_socio: false })
    .eq('id', id);
  if (error) throw new HttpError(404, 'Socio no encontrado');
  return { ok: true };
}
