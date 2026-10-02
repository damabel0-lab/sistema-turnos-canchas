/**
 * Punto de entrada público del módulo de cálculo de tarifas.
 * Permite importar todo el módulo con una sola línea:
 *
 *   import { GestorReservaCanchaContext, TarifaStrategyFactory, TipoTarifaComplejo } from './services/tarifas';
 */
export type { IEstrategiaCalculoTarifa } from './IEstrategiaCalculoTarifa';
export type { ResumenReserva } from './ResumenReserva';
export { TarifaNoSocioStrategy } from './TarifaNoSocioStrategy';
export { TarifaSocioStrategy } from './TarifaSocioStrategy';
export { TarifaNocturnaStrategy } from './TarifaNocturnaStrategy';
export { GestorReservaCanchaContext } from './GestorReservaCanchaContext';
export { TarifaStrategyFactory, TipoTarifaComplejo } from './TarifaStrategyFactory';
export { formatearPesos, redondearImporte } from './moneda';
