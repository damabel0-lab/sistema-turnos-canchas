import type { IEstrategiaCalculoTarifa } from './IEstrategiaCalculoTarifa';
import type { ResumenReserva } from './ResumenReserva';

/**
 * CONTEXTO del patrón Strategy.
 * --------------------------------
 * Servicio de reservas del "Complejo Deportivo Cerro Alto".
 *
 * Responsabilidad única (SRP): orquestar el proceso de cobro delegando el
 * cálculo del importe en la estrategia activa. No contiene condicionales
 * if/else ni switch para determinar montos: la decisión de cómo se calcula
 * la tarifa vive exclusivamente dentro de cada estrategia.
 *
 * El usuario (o el Factory) inyecta la estrategia, cumpliendo el DIP.
 */
export class GestorReservaCanchaContext {
  /** Estrategia de cálculo vigente. Cambiable en tiempo de ejecución. */
  private estrategiaActiva: IEstrategiaCalculoTarifa;

  /** Nombre del establecimiento, empleado en el resumen de cada reserva. */
  private readonly complejo: string;

  /**
   * Inyección de la estrategia inicial vía constructor.
   *
   * @param estrategiaInicial Estrategia de cálculo a utilizar desde el arranque.
   * @param complejo Nombre del complejo (opcional, con valor por defecto).
   */
  public constructor(estrategiaInicial: IEstrategiaCalculoTarifa, complejo: string = 'Complejo Deportivo Cerro Alto') {
    this.estrategiaActiva = estrategiaInicial;
    this.complejo = complejo;
  }

  /**
   * Cambia dinámicamente el algoritmo de cobro en tiempo de ejecución
   * (ej: al detectar que la reserva corresponde a un turno nocturno).
   *
   * @param nuevaEstrategia Estrategia que pasará a ser la activa.
   */
  public setEstrategia(nuevaEstrategia: IEstrategiaCalculoTarifa): void {
    this.estrategiaActiva = nuevaEstrategia;
  }

  /**
   * Expone la estrategia activa (solo lectura del enlace, no de su estado interno).
   */
  public getEstrategia(): IEstrategiaCalculoTarifa {
    return this.estrategiaActiva;
  }

  /**
   * Procesa el cobro de una reserva delegando el cálculo en la estrategia activa.
   *
   * Nota: la única validación presente no participa del cálculo del monto;
   * es una guarda de integridad de datos, no un condicional de negocio.
   *
   * @param deporte Deporte reservado (ej: "Fútbol 5").
   * @param precioBase Precio de lista de la cancha.
   * @returns Resumen completo de la reserva con el importe final.
   * @throws RangeError si el precio base no es un número válido.
   */
  public procesarCobro(deporte: string, precioBase: number): ResumenReserva {
    if (!Number.isFinite(precioBase) || precioBase < 0) {
      throw new RangeError(`Precio base inválido: ${precioBase}`);
    }

    // Toda la lógica de cálculo queda encapsulada en la estrategia inyectada.
    const tarifaFinal: number = this.estrategiaActiva.calcularTarifaFinal(precioBase);

    return {
      complejo: this.complejo,
      deporte,
      precioBase,
      tarifaFinal,
      ajuste: tarifaFinal - precioBase,
      detalleTarifa: this.estrategiaActiva.obtenerDetalle(),
    };
  }
}
