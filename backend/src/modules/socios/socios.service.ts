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

/** Socios con actividad en ESTE complejo (reserva o abono).
 *  es_socio es un flag global del jugador; el listado muestra los que
 *  ya pasaron por tu complejo. Un socio nuevo aparece desde su primera actividad. */
export async function listarSocios(complejoId: number) {
  const [reservas, abonos] = await Promise.all([
    supabaseAdmin
      .from('reservas')
      .select('usuario_id')
      .eq('complejo_id', complejoId)
      .not('usuario_id', 'is', null),
    supabaseAdmin
      .from('abonos')
      .select('usuario_id')
      .eq('complejo_id', complejoId),
  ]);

  const ids = [
    ...new Set([
      ...((reservas.data ?? []) as Array<{ usuario_id: string }>).map((r) => r.usuario_id),
      ...((abonos.data ?? []) as Array<{ usuario_id: string }>).map((a) => a.usuario_id),
    ]),
  ];
  if (ids.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombre, apellido, telefono, es_socio, creado_en')
    .eq('es_socio', true)
    .in('id', ids)
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
