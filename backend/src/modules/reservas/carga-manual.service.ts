import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';
import { crearReserva, type NuevaReserva } from '../reservas/reservas.service.js';

/**
 * Carga manual del admin: anotar un turno en segundos para alguien que
 * llama por teléfono o llega al complejo, sin que el cliente tenga cuenta.
 *
 * - Si el teléfono ya está en el directorio, asigna la reserva a ese cliente.
 * - Si no existe, se da de alta automáticamente como cliente (cuenta interna
 *   con email generado; el cliente luego puede registrarse con su email real
 *   y vincular su teléfono en el perfil).
 */
export interface CargaManual extends Omit<NuevaReserva, 'usuario_id'> {
  cliente_nombre: string;
  cliente_apellido?: string;
  cliente_telefono: string;
}

export async function cargaManual(entrada: CargaManual) {
  const telefono = (entrada.cliente_telefono ?? '').trim();
  const nombre = (entrada.cliente_nombre ?? '').trim();

  if (!nombre) throw new HttpError(400, 'El nombre del cliente es obligatorio');
  if (!telefono) throw new HttpError(400, 'El teléfono del cliente es obligatorio');

  // 1. buscar en el directorio por teléfono
  let usuarioId: string;
  const { data: existente } = await supabaseAdmin
    .from('usuarios')
    .select('id, nombre, apellido')
    .eq('telefono', telefono)
    .maybeSingle();

  if (existente) {
    usuarioId = existente.id;
  } else {
    // 2. alta automática: usuario de auth + perfil
    const email = `${telefono.replace(/\D/g, '')}@clientes.playcontrol.local`;
    const { data: creado, error: eAuth } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
    });
    if (eAuth || !creado.user) {
      throw new HttpError(500, `No se pudo crear el cliente: ${eAuth?.message ?? 'error desconocido'}`);
    }

    const { error: ePerfil } = await supabaseAdmin.from('usuarios').insert({
      id: creado.user.id,
      nombre,
      apellido: (entrada.cliente_apellido ?? '').trim() || '—',
      telefono,
      rol: 'cliente',
      es_socio: false,
    });
    if (ePerfil) throw new HttpError(500, `No se pudo crear el perfil: ${ePerfil.message}`);

    usuarioId = creado.user.id;
  }

  return crearReserva({ ...entrada, usuario_id: usuarioId });
}
