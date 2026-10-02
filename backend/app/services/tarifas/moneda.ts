/**
 * Utilidades de formato monetario compartidas por las estrategias de tarifa.
 * Se mantienen fuera de las clases para no duplicar lógica (DRY) y para que
 * cualquier nueva estrategia pueda reutilizarlas.
 */

/**
 * Redondea un importe a 2 decimales para evitar artefactos de coma flotante
 * (ej: 6800.000000000001) en los cálculos de descuentos y recargos.
 */
export function redondearImporte(importe: number): number {
  return Math.round((importe + Number.EPSILON) * 100) / 100;
}

/**
 * Formatea un importe en pesos argentinos para su presentación.
 */
export function formatearPesos(importe: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(importe);
}
