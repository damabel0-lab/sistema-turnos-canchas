/**
 * Ejemplo práctico del módulo de tarifas (patrón Strategy).
 *
 * Simula reservas del "Complejo Deportivo Cerro Alto" para:
 *   - Fútbol 5: $12.000
 *   - Pádel:    $8.000
 *
 * Ejecución:  npm run ejemplo:tarifas
 */
import { GestorReservaCanchaContext } from './GestorReservaCanchaContext';
import { TarifaStrategyFactory, TipoTarifaComplejo } from './TarifaStrategyFactory';
import type { ResumenReserva } from './ResumenReserva';
import { formatearPesos } from './moneda';

/** Precios de lista del complejo. */
const PRECIO_BASE_FUTBOL_5: number = 12_000;
const PRECIO_BASE_PADEL: number = 8_000;

/** Imprime un resumen de reserva en consola. */
function imprimirResumen(resumen: ResumenReserva): void {
  const ajusteTexto: string = resumen.ajuste === 0 ? 'sin ajuste' : formatearPesos(resumen.ajuste);

  console.log(`  Deporte : ${resumen.deporte}`);
  console.log(`  Base    : ${formatearPesos(resumen.precioBase)}`);
  console.log(`  Ajuste  : ${ajusteTexto}`);
  console.log(`  TOTAL   : ${formatearPesos(resumen.tarifaFinal)}`);
  console.log(`  Detalle : ${resumen.detalleTarifa}`);
  console.log('  --------------------------------------------');
}

console.log('=== Complejo Deportivo Cerro Alto - Simulación de cobros ===\n');

// -----------------------------------------------------------------------------
// 1) Gestor creado con inyección de estrategia desde el constructor.
// -----------------------------------------------------------------------------
const gestor = new GestorReservaCanchaContext(TarifaStrategyFactory.crear(TipoTarifaComplejo.NO_SOCIO));

console.log('Reserva 1 - Turno de día, no socio');
imprimirResumen(gestor.procesarCobro('Fútbol 5', PRECIO_BASE_FUTBOL_5)); // $12.000

// -----------------------------------------------------------------------------
// 2) Cambio dinámico de estrategia en tiempo de ejecución con setEstrategia().
// -----------------------------------------------------------------------------
console.log('Reserva 2 - El mismo cliente resulta ser socio');
gestor.setEstrategia(TarifaStrategyFactory.crear(TipoTarifaComplejo.SOCIO));
imprimirResumen(gestor.procesarCobro('Pádel', PRECIO_BASE_PADEL)); // $8.000 - 15% = $6.800

// -----------------------------------------------------------------------------
// 3) Reserva nocturna: se cambia la estrategia sin modificar el gestor.
// -----------------------------------------------------------------------------
console.log('Reserva 3 - Turno nocturno (recargo por iluminación LED)');
gestor.setEstrategia(TarifaStrategyFactory.crear(TipoTarifaComplejo.TURNO_NOCTURNO));
imprimirResumen(gestor.procesarCobro('Fútbol 5', PRECIO_BASE_FUTBOL_5)); // $12.000 + 20% = $14.400

// -----------------------------------------------------------------------------
// 4) Otro gestor: la estrategia también puede inyectarse directamente al construir.
// -----------------------------------------------------------------------------
console.log('Reserva 4 - Socio, turno de día');
const gestorSocio = new GestorReservaCanchaContext(TarifaStrategyFactory.crear(TipoTarifaComplejo.SOCIO));
imprimirResumen(gestorSocio.procesarCobro('Fútbol 5', PRECIO_BASE_FUTBOL_5)); // $12.000 - 15% = $10.200

console.log('Reserva 5 - Pádel nocturno');
gestorSocio.setEstrategia(TarifaStrategyFactory.crear(TipoTarifaComplejo.TURNO_NOCTURNO));
imprimirResumen(gestorSocio.procesarCobro('Pádel', PRECIO_BASE_PADEL)); // $8.000 + 20% = $9.600

console.log('=== Fin de la simulación ===');
