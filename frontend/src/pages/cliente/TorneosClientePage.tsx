import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';

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

  // Tabla de posiciones simple (por puntos: 3 victoria, 1 empate, 0 derrota)
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
    <main style={{ padding: 16, display: 'grid', gap: 20, maxWidth: 800 }}>
      <h1>Torneos</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <section>
        <h2>Torneos activos</h2>
        {torneos.length === 0 ? (
          <p>No hay torneos en curso.</p>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {torneos.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTorneoSeleccionado(t.id);
                  void cargarDetalle(t.id);
                }}
                style={{
                  padding: '10px 14px',
                  background: torneoSeleccionado === t.id ? '#1a73e8' : '#eee',
                  color: torneoSeleccionado === t.id ? '#fff' : '#000',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {t.nombre}
              </button>
            ))}
          </div>
        )}
      </section>

      {torneoSeleccionado && (
        <section>
          <h2>{torneos.find((t) => t.id === torneoSeleccionado)?.nombre}</h2>
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <h3>Fixture</h3>
              {partidos.length === 0 ? (
                <p>Sin partidos cargados todavía.</p>
              ) : (
                <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Local</th>
                      <th>Resultado</th>
                      <th>Visitante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partidos.map((p) => {
                      const local = equipos.find((e) => e.id === p.equipo_local_id)?.nombre_equipo ?? 'Local';
                      const visitante = equipos.find((e) => e.id === p.equipo_visitante_id)?.nombre_equipo ?? 'Visitante';
                      const resultado = p.jugado ? `${p.goles_local}-${p.goles_visitante}` : '—';
                      return (
                        <tr key={p.id}>
                          <td>{local}</td>
                          <td>{resultado}</td>
                          <td>{visitante}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <h3>Tabla de posiciones</h3>
              {posiciones.length === 0 ? (
                <p>Sin equipos cargados.</p>
              ) : (
                <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Equipo</th>
                      <th>PJ</th>
                      <th>PG</th>
                      <th>PE</th>
                      <th>PP</th>
                      <th>GF</th>
                      <th>GC</th>
                      <th>DG</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posiciones.map((pos, i) => (
                      <tr key={pos.equipo}>
                        <td style={{ fontWeight: i < 3 ? 'bold' : 'normal' }}>{pos.equipo}</td>
                        <td>{pos.jugados}</td>
                        <td>{pos.ganados}</td>
                        <td>{pos.empatados}</td>
                        <td>{pos.perdidos}</td>
                        <td>{pos.gf}</td>
                        <td>{pos.gc}</td>
                        <td>{pos.dg}</td>
                        <td>{pos.puntos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
