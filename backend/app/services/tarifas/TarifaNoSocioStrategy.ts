import type { IEstrategiaCalculoTarifa } from './IEstrategiaCalculoTarifa';

/**
 * Estrategia: Tarifa No Socio.
 * Regla de negocio: el no socio abona el precio base sin modificaciones.
 */
export class TarifaNoSocioStrategy implements IEstrategiaCalculoTarifa {
  /**
   * @param precioBase Precio de lista de la cancha.
   * @returns El precio base sin descuentos ni recargos.
   */
  public calcularTarifaFinal(precioBase: number): number {
    return precioBase;
  }

  /**
   * @returns Descripción legible de la tarifa aplicada.
   */
  public obtenerDetalle(): string {
    return 'Tarifa No Socio: precio base sin descuentos ni recargos.';
  }
}
