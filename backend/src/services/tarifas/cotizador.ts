import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';
import { suscripcionVigente } from '../../modules/suscripciones/suscripciones.service.js';

/**
 * Cálculo de precio final de un turno.
 *
 * Reglas (definidas con el cliente):
 * - El precio_base de la cancha y el precio de cada tarifa se interpretan POR HORA.
 * - El precio final se resuelve hora por hora: para cada hora del turno se busca
 *   una tarifa que cubra esa hora (día de la semana específico tiene prioridad
 *   sobre dia_semana NULL = "todos los días"). Si no hay, se usa precio_base.
 * - Descuento de socio: porcentaje del beneficio que tenga el usuario para esa
 *   disciplina (beneficios_socios.aplica_en = tipo del deporte).
 * - Descuento de turno fijo: parámetro opcional que pasa el caller.
 * - La seña es el porcentaje_seña de la tarifa que cubre la hora de inicio
 *   aplicado sobre el total.
 */

export interface CotizacionEntrada {
  cancha_id: number;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string; // HH:MM o HH:MM:SS
  hora_fin: string;
  usuario_id?: string | null;
  descuento_turno_fijo?: number; // 0..100
}

export interface Cotizacion {
  precio_total: number;
  monto_seña: number;
  descuento_socio: number;
  descuento_turno_fijo: number;
  precio_por_hora: Array<{ hora: string; precio: number; tarifa_id: number | null }>;
  desglose: {
    precio_base_cancha: number;
    tarifa_aplicada: boolean;
  };
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function aHoras(hora: string): number {
  const [h] = hora.split(':');
  return Number(h);
}

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':');
  return Number(h) * 60 + Number(m ?? 0);
}

interface TarifaFila {
  id: number;
  dia_semana: number | null;
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  porcentaje_seña: number;
}

/** Elegir la tarifa que cubre un minuto puntual. Prioridad: día específico > NULL. */
function tarifaParaMinuto(tarifas: TarifaFila[], dia: number, minutos: number): TarifaFila | null {
  const candidatas = tarifas.filter(
    (t) => minutos >= aMinutos(t.hora_inicio) && minutos < aMinutos(t.hora_fin),
  );
  const especifica = candidatas.find((t) => t.dia_semana === dia);
  return especifica ?? candidatas.find((t) => t.dia_semana === null) ?? null;
}

export async function cotizar(entrada: CotizacionEntrada): Promise<Cotizacion> {
  const { cancha_id, fecha, hora_inicio, hora_fin, usuario_id } = entrada;

  if (aMinutos(hora_fin) <= aMinutos(hora_inicio)) {
    throw new HttpError(400, 'hora_fin debe ser posterior a hora_inicio');
  }

  const { data: cancha, error: eCancha } = await supabaseAdmin
    .from('canchas')
    .select('id, precio_base, activa, complejo_id, deportes(nombre, tipo)')
    .eq('id', cancha_id)
    .single();
  if (eCancha || !cancha) throw new HttpError(404, 'Cancha no encontrada');
  if (!cancha.activa) throw new HttpError(400, 'La cancha no está activa');
  const complejoId = Number(cancha.complejo_id);
  if (!(await suscripcionVigente(complejoId))) {
    throw new HttpError(403, 'Este complejo no está disponible por el momento');
  }

  const { data: tarifas, error: eTarifas } = await supabaseAdmin
    .from('tarifas')
    .select('id, dia_semana, hora_inicio, hora_fin, precio, porcentaje_seña')
    .eq('cancha_id', cancha_id);
  if (eTarifas) throw new HttpError(500, eTarifas.message);
  const filasTarifa = (tarifas ?? []) as unknown as TarifaFila[];

  const [anio, mes, diaMes] = fecha.split('-').map(Number);
  const dia = new Date(anio, mes - 1, diaMes).getDay(); // 0 = domingo

  // Recorrer hora por hora (turnos en bloques de 1 hora)
  const inicio = aMinutos(hora_inicio);
  const fin = aMinutos(hora_fin);
  const precioPorHora: Cotizacion['precio_por_hora'] = [];
  let subtotal = 0;
  let señaBase = 0;
  let usoTarifa = false;

  for (let m = inicio; m < fin; m += 60) {
    const etiqueta = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const tarifa = tarifaParaMinuto(filasTarifa, dia, m);
    const precio = tarifa ? Number(tarifa.precio) : Number(cancha.precio_base);
    subtotal += precio;
    if (m === inicio) señaBase = tarifa ? Number(tarifa.porcentaje_seña) : 0;
    if (tarifa) usoTarifa = true;
    precioPorHora.push({ hora: etiqueta, precio, tarifa_id: tarifa?.id ?? null });
  }

  const tipoDisciplina = (cancha.deportes as unknown as { nombre: string; tipo: string }).tipo;

  // Descuento de socio (beneficio aplicable a la disciplina Y al complejo donde se juega)
  let descuentoSocio = 0;
  if (usuario_id) {
    const { data: beneficio } = await supabaseAdmin
      .from('socio_beneficios')
      .select('beneficios_socios(descuento_porcentaje, aplica_en, complejo_id)')
      .eq('usuario_id', usuario_id)
      .eq('beneficios_socios.aplica_en', tipoDisciplina)
      .eq('beneficios_socios.complejo_id', complejoId)
      .maybeSingle();

    const fila = beneficio as unknown as
      | { beneficios_socios: { descuento_porcentaje: number; aplica_en: string; complejo_id: number } | null }
      | null;
    const pct = fila?.beneficios_socios?.descuento_porcentaje;
    if (pct && Number(pct) > 0) descuentoSocio = Math.round(subtotal * (Number(pct) / 100));
  }

  // Descuento de turno fijo (parámetro del caller o del entorno)
  const pctTurnoFijoEnv = process.env.DESCUENTO_TURNO_FIJO_PORCENTAJE
    ? Number(process.env.DESCUENTO_TURNO_FIJO_PORCENTAJE)
    : 0;
  const pctTurnoFijo = Math.min(
    Math.max(entrada.descuento_turno_fijo ?? pctTurnoFijoEnv, 0),
    100,
  );
  const descuentoTurnoFijo = Math.round((subtotal - descuentoSocio) * (pctTurnoFijo / 100));

  const precioTotal = subtotal - descuentoSocio - descuentoTurnoFijo;
  const montoSeña = Math.round(precioTotal * (señaBase / 100));

  return {
    precio_total: precioTotal,
    monto_seña: montoSeña,
    descuento_socio: descuentoSocio,
    descuento_turno_fijo: descuentoTurnoFijo,
    precio_por_hora: precioPorHora,
    desglose: {
      precio_base_cancha: Number(cancha.precio_base),
      tarifa_aplicada: usoTarifa,
    },
  };
}

/** Resumen humano de las reglas de precio de una cancha (para el admin) */
export function resumenTarifas(tarifas: TarifaFila[]): string[] {
  return tarifas.map((t) =>
    `${t.dia_semana == null ? 'Todos los días' : DIAS[t.dia_semana]} ` +
    `${t.hora_inicio.slice(0, 5)}-${t.hora_fin.slice(0, 5)}: $${t.precio}/h ` +
    `(seña ${t.porcentaje_seña}%)`,
  );
}
