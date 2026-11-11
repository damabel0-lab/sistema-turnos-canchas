import { supabaseAdmin } from '../../config/supabase.js';
import { HttpError } from '../../middleware/error.js';

/** Próxima potencia de 2 >= n */
function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** Nombre de fase según cuántos partidos tiene la ronda */
function fasePorPartidos(nPartidosEnRonda: number): string {
  const mapa: Record<number, string> = {
    1: 'Final',
    2: 'Semifinal',
    4: 'Cuartos de Final',
    8: 'Octavos de Final',
    16: 'Dieciseisavos de Final',
  };
  return mapa[nPartidosEnRonda] ?? `Ronda de ${nPartidosEnRonda}`;
}

interface PartidoSlot {
  fase: string;
  local_id: number | null;
  visitante_id: number | null;
}

/**
 * Genera el cuadro de eliminatoria directa (sólo 2, 4, 8 o 16 participantes).
 * Devuelve los partidos de la primera fase; los siguientes se crean solos al adjudicar resultados.
 */
export async function construirBracketLocal(
  participantes: Array<{ id: number; nombre_equipo: string }>,
): Promise<PartidoSlot[]> {
  const P = participantes.length;
  if (![2, 4, 8, 16].includes(P)) {
    throw new HttpError(400, `Eliminación directa sólo para 2, 4, 8 o 16 participantes. El torneo actual tiene ${P}.`);
  }
  const power = nextPowerOf2(P);

  const result: PartidoSlot[] = [];
  const faseR1 = fasePorPartidos(power / 2);
  for (let i = 0; i < power / 2; i++) {
    result.push({
      fase: faseR1,
      local_id: participantes[i].id,
      visitante_id: participantes[power - 1 - i].id,
    });
  }
  return result;
}

/** Avance automático: cuando una fase eliminatoria se completa, crea la siguiente. */
export async function autoAvanzarBracket(torneoId: number, faseRecienTerminada: string) {
  const { data: torneo } = await supabaseAdmin
    .from('torneos')
    .select('formato')
    .eq('id', torneoId)
    .single();
  if (!torneo || torneo.formato !== 'eliminacion_directa') return;

  const { data: partidosFase, error } = await supabaseAdmin
    .from('partidos_torneo')
    .select('id, equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, jugado')
    .eq('torneo_id', torneoId)
    .eq('fase', faseRecienTerminada);
  if (error || !partidosFase || partidosFase.length === 0) return;
  if (partidosFase.some((p) => !p.jugado)) return;

  const ganadores = partidosFase.map((p) =>
    (p.goles_local ?? 0) >= (p.goles_visitante ?? 0) ? p.equipo_local_id : p.equipo_visitante_id,
  );
  if (ganadores.length <= 1) {
    await supabaseAdmin.from('torneos').update({ estado: 'finalizado' }).eq('id', torneoId);
    return;
  }

  const nextFase = fasePorPartidos(ganadores.length / 2);
  const nuevas = [];
  for (let i = 0; i < ganadores.length; i += 2) {
    nuevas.push({
      torneo_id: torneoId,
      equipo_local_id: ganadores[i]!,
      equipo_visitante_id: ganadores[i + 1]!,
      fase: nextFase,
    });
  }
  if (nuevas.length > 0) {
    await supabaseAdmin.from('partidos_torneo').insert(nuevas);
  }
}
