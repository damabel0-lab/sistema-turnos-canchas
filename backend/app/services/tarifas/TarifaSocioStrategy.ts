import type { IEstrategiaCalculoTarifa } from './IEstrategiaCalculoTarifa';
import { redondearImporte } from './moneda';

/**
 * Estrategia: Tarifa Socio.
 * Regla de negocio: los socios del complejo tienen un 15% de descuento
 * sobre el precio base de la cancha.
 */
export class TarifaSocioStrategy implements IEstrategiaCalculoTarifa {
  /** Descuento permanente para socios (15%). */
  private static readonly PORCENTAJE_DESCUENTO: number = 0.15;

  /**
   * @param precioBase Precio de lista de la cancha.
   * @returns Precio base menos el 15% de descuento, redondeado a 2 decimales.
   */
  public calcularTarifaFinal(precioBase: number): number {
    const descuento = precioBase * TarifaSocioStrategy.PORCENTAJE_DESCUENTO;
    return redondearImporte(precioBase - descuento);
  }

  /**
   * @returns Descripción legible de la tarifa aplicada.
   */
  public obtenerDetalle(): string {
    return 'Tarifa Socio: 15% de descuento sobre el precio base.';
  }
}
