/**
 * Modelo de salida del proceso de cobro.
 * Objeto inmutable por convención: lo construye únicamente el contexto
 * `GestorReservaCanchaContext` y se devuelve completo al llamador.
 */
export interface ResumenReserva {
  /** Nombre del establecimiento que emite la reserva. */
  readonly complejo: string;
  /** Deporte reservado (ej: "Fútbol 5", "Pádel"). */
  readonly deporte: string;
  /** Precio de lista de la cancha. */
  readonly precioBase: number;
  /** Importe final a cobrar, calculado por la estrategia activa. */
  readonly tarifaFinal: number;
  /** Diferencia aplicada sobre la base (negativa = descuento, positiva = recargo). */
  readonly ajuste: number;
  /** Descripción de la tarifa aplicada, aportada por la estrategia activa. */
  readonly detalleTarifa: string;
}
