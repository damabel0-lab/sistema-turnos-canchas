import type { IEstrategiaCalculoTarifa } from './IEstrategiaCalculoTarifa';
import { TarifaNoSocioStrategy } from './TarifaNoSocioStrategy';
import { TarifaSocioStrategy } from './TarifaSocioStrategy';
import { TarifaNocturnaStrategy } from './TarifaNocturnaStrategy';

/**
 * Tipos de tarifa soportados por el complejo.
 */
export enum TipoTarifaComplejo {
  /** Visitante que no está inscripto como socio. */
  NO_SOCIO = 'NO_SOCIO',
  /** Socio activo del complejo deportivo. */
  SOCIO = 'SOCIO',
  /** Reserva en horario nocturno (recargo por luz artificial). */
  TURNO_NOCTURNO = 'TURNO_NOCTURNO',
}

/** Fábrica de estrategias: crea la instancia concreta para cada tipo de tarifa. */
type CreadorEstrategia = () => IEstrategiaCalculoTarifa;

/**
 * Tabla de registro de estrategias.
 * Se usa un mapa en lugar de switch/if: agregar una tarifa nueva consiste
 * en sumar una entrada (OCP), sin tocar código de selección existente.
 */
const ESTRATEGIAS_REGISTRADAS: Record<TipoTarifaComplejo, CreadorEstrategia> = {
  [TipoTarifaComplejo.NO_SOCIO]: () => new TarifaNoSocioStrategy(),
  [TipoTarifaComplejo.SOCIO]: () => new TarifaSocioStrategy(),
  [TipoTarifaComplejo.TURNO_NOCTURNO]: () => new TarifaNocturnaStrategy(),
};

/**
 * FACTORY AUXILIAR.
 * Centraliza la creación de estrategias para que el resto de la aplicación
 * no conozca las clases concretas, sólo el enum y la interfaz (DIP + SRP).
 */
export class TarifaStrategyFactory {
  /** Clase con utilidades estáticas: no debe instanciarse. */
  private constructor() {}

  /**
   * Instancia la estrategia de cálculo correspondiente al tipo de tarifa.
   *
   * @param tipo Tarifa solicitada.
   * @returns Instancia concreta que implementa `IEstrategiaCalculoTarifa`.
   * @throws RangeError si el tipo de tarifa no está registrado.
   */
  public static crear(tipo: TipoTarifaComplejo): IEstrategiaCalculoTarifa {
    const creador: CreadorEstrategia | undefined = ESTRATEGIAS_REGISTRADAS[tipo];

    if (creador === undefined) {
      throw new RangeError(`Tipo de tarifa desconocido: ${String(tipo)}`);
    }

    return creador();
  }
}
