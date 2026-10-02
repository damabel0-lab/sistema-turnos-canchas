/**
 * PATRÓN: Strategy (Comportamiento)
 * ---------------------------------
 * Contrato común a todas las estrategias de cálculo de tarifa del
 * "Complejo Deportivo Cerro Alto".
 *
 * Cada variante de cobro (No Socio, Socio, Turno Nocturno) implementa esta
 * interfaz, de modo que el contexto (el servicio de reservas) pueda calcular
 * el importe final SIN conocer las reglas concretas de cada tarifa y SIN
 * condicionales if/else o switch.
 *
 * Principios aplicados:
 *  - DIP: el consumidor depende de la abstracción, nunca de las clases concretas.
 *  - OCP: para agregar una nueva tarifa basta con crear una clase que implemente
 *         esta interfaz; no se modifica ninguna clase existente.
 */
export interface IEstrategiaCalculoTarifa {
  /**
   * Calcula el costo final de la reserva a partir del precio base.
   *
   * @param precioBase - Precio de lista de la cancha (en pesos).
   * @returns Importe final a cobrar.
   */
  calcularTarifaFinal(precioBase: number): number;

  /**
   * Devuelve una descripción legible de la regla de negocio aplicada.
   * Se usa para armar el resumen de la reserva y para trazabilidad en facturación.
   */
  obtenerDetalle(): string;
}
