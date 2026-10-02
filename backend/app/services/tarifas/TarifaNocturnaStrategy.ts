import type { IEstrategiaCalculoTarifa } from './IEstrategiaCalculoTarifa';
import { redondearImporte } from './moneda';

/**
 * Estrategia: Turno Nocturno.
 * Regla de negocio: los turnos nocturnos aplican un recargo del 20% sobre
 * el precio base por el consumo de la iluminación LED de las canchas.
 */
export class TarifaNocturnaStrategy implements IEstrategiaCalculoTarifa {
  /** Recargo por iluminación artificial (20%). */
  private static readonly PORCENTAJE_RECARGO: number = 0.2;

  /**
   * @param precioBase Precio de lista de la cancha.
   * @returns Precio base más el 20% de recargo, redondeado a 2 decimales.
   */
  public calcularTarifaFinal(precioBase: number): number {
    const recargo = precioBase * TarifaNocturnaStrategy.PORCENTAJE_RECARGO;
    return redondearImporte(precioBase + recargo);
  }

  /**
   * @returns Descripción legible de la tarifa aplicada.
   */
  public obtenerDetalle(): string {
    return 'Turno Nocturno: 20% de recargo sobre el precio base por iluminación LED.';
  }
}
