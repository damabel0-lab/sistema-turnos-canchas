import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { Trophy, Users } from 'lucide-react';

interface Torneo {
  id: number;
  nombre: string;
  deporte_id: number | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  premio: string | null;
  activo: boolean;
}

interface Equipo {
  id: number;
  nombre_equipo: string;
  capitan_id: string | null;
}

interface Partido {
  id: number;
  equipo_local_id: number | null;
  equipo_visitante_id: number | null;
  fecha_hora: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
  jugado: boolean;
  fase: string;
}

export function TorneosClientePage() {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [torneoSeleccionado, setTorneoSeleccionado] = useState<number | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);

  const cargarTorneos = useCallback(async () => {
    try {
      setTorneos(await api<Torneo[]>('/torneos/activos'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando torneos');
    }
  }, []);

  useEffect(() => {
    void cargarTorneos();
  }, [cargarTorneos]);

  const cargarDetalle = useCallback(async (torneoId: number) => {
    try {
      const [eq, pt] = await Promise.all([
        api<Equipo[]>(`/torneos/${torneoId}/equipos`),
        api<Partido[]>(`/torneos/${torneoId}/partidos`),
      ]);
      setEquipos(eq);
      setPartidos(pt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando el torneo');
    }
  }, []);

  const posiciones = equipos.map((e) => {
    const partidosEquipo = partidos.filter(
      (p) => p.jugado && (p.equipo_local_id === e.id || p.equipo_visitante_id === e.id),
    );
    let puntos = 0;
    let gf = 0;
    let gc = 0;
    let jugados = 0;
    let ganados = 0;
    let empatados = 0;
    let perdidos = 0;

    for (const p of partidosEquipo) {
      jugados++;
      const esLocal = p.equipo_local_id === e.id;
      const golesFavor = esLocal ? (p.goles_local ?? 0) : (p.goles_visitante ?? 0);
      const golesContra = esLocal ? (p.goles_visitante ?? 0) : (p.goles_local ?? 0);
      gf += golesFavor;
      gc += golesContra;
      if (golesFavor > golesContra) {
        puntos += 3;
        ganados++;
      } else if (golesFavor === golesContra) {
        puntos += 1;
        empatados++;
      } else {
        perdidos++;
      }
    }

    return {
      equipo: e.nombre_equipo,
      puntos,
      jugados,
      ganados,
      empatados,
      perdidos,
      gf,
      gc,
      dg: gf - gc,
    };
  }).sort((a, b) => b.puntos - a.puntos || b.dg - a.dg || b.gf - a.gf);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Torneos</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <section className="mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Torneos activos</h2>
          {torneos.length === 0 ? (
            <Card padded={false}>
              <div className="p-8 text-center text-gray-600">
                No hay torneos en curso.
              </div>
            </Card>
          ) : (
            <div className="flex flex-wrap gap-3">
              {torneos.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTorneoSeleccionado(t.id);
                    void cargarDetalle(t.id);
                  }}
                  className={`px-5 py-3 rounded-xl border transition-all ${
                    torneoSeleccionado === t.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t.nombre}
                </button>
              ))}
            </div>
          )}
        </section>

        {torneoSeleccionado && (
          <section>
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              {torneos.find((t) => t.id === torneoSeleccionado)?.nombre}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-bold text-gray-900 mb-3">Fixture</h3>
                {partidos.length === 0 ? (
                  <Card padded={false}>
                    <div className="p-6 text-center text-gray-600">
                      Sin partidos cargados todavía.
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {partidos.map((p) => {
                      const local = equipos.find((e) => e.id === p.equipo_local_id)?.nombre_equipo ?? 'Local';
                      const visitante = equipos.find((e) => e.id === p.equipo_visitante_id)?.nombre_equipo ?? 'Visitante';
                      const resultado = p.jugado ? `${p.goles_local}-${p.goles_visitante}` : '—';
                      return (
                        <Card key={p.id} padded={false}>
                          <div className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{local}</span>
                            </div>
                            <span className="font-mono font-bold">{resultado}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-400">{visitante}</span>
                              <Users className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-3">Tabla de posiciones</h3>
                {posiciones.length === 0 ? (
                  <Card padded={false}>
                    <div className="p-6 text-center text-gray-600">
                      Sin equipos cargados.
                    </div>
                  </Card>
                ) : (
                  <Card padded={false}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            {['Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Pts'].map((h) => (
                              <th key={h} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {posiciones.map((pos) => (
                            <tr key={pos.equipo} className="border-b border-gray-50/50">
                              <td className="px-4 py-3 font-medium text-gray-900">{pos.equipo}</td>
                              <td className="px-4 py-3 text-center">{pos.jugados}</td>
                              <td className="px-4 py-3 text-center">{pos.ganados}</td>
                              <td className="px-4 py-3 text-center">{pos.empatados}</td>
                              <td className="px-4 py-3 text-center">{pos.perdidos}</td>
                              <td className="px-4 py-3 text-center">{pos.gf}</td>
                              <td className="px-4 py-3 text-center">{pos.gc}</td>
                              <td className="px-4 py-3 text-center">{pos.dg}</td>
                              <td className="px-4 py-3 text-center font-bold">{pos.puntos}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
