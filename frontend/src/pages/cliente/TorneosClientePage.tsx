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
  const [ofreceTorneos, setOfreceTorneos] = useState(true);

  useEffect(() => {
    api<{ ofrece_torneos?: boolean }>('/config')
      .then((d) => setOfreceTorneos(d.ofrece_torneos !== false))
      .catch(() => { /* sin config, mostramos torneos */ });
  }, []);

  const cargarTorneos = useCallback(async () => {
    if (!ofreceTorneos) return;
    try {
      setTorneos(await api<Torneo[]>('/torneos/activos'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando torneos');
    }
  }, [ofreceTorneos]);

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

  // Tabla de posiciones simple (3-1-0)
  const posiciones = equipos
    .map((e) => {
      const favor = partidos.filter(
        (p) => p.jugado && (p.equipo_local_id === e.id || p.equipo_visitante_id === e.id)
      );
      let puntos = 0,
        gf = 0,
        gc = 0,
        pj = 0,
        pg = 0,
        pe = 0,
        pp = 0;

      for (const p of favor) {
        pj++;
        const esLocal = p.equipo_local_id === e.id;
        const gfP = esLocal ? p.goles_local ?? 0 : p.goles_visitante ?? 0;
        const gcP = esLocal ? p.goles_visitante ?? 0 : p.goles_local ?? 0;
        gf += gfP;
        gc += gcP;
        if (gfP > gcP) {
          puntos += 3;
          pg++;
        } else if (gfP === gcP) {
          puntos += 1;
          pe++;
        } else {
          pp++;
        }
      }

      return { equipo: e.nombre_equipo, puntos, pj, pg, pe, pp, gf, gc, dg: gf - gc };
    })
    .sort((a, b) => b.puntos - a.puntos || b.dg - a.dg || b.gf - a.gf);

  if (!ofreceTorneos) {
    return (
      <main className="pantalla">
        <div className="contenedor">
          <Card className="caja-vacia">
            <Trophy size={28} style={{ margin: '0 auto 0.75rem', color: 'var(--texto-3)' }} />
            <h1 className="titulo">Torneos</h1>
            <p className="texto-sec" style={{ margin: 0 }}>Este complejo no ofrece torneos por ahora.</p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="pantalla">
      <div className="contenedor">
        <h1 className="titulo">Torneos</h1>
        {error && <div className="alerta-error" role="alert">{error}</div>}

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 className="titulo" style={{ fontSize: '1.1rem' }}>Torneos activos</h2>
          {torneos.length === 0 ? (
            <Card className="caja-vacia"><p className="texto-sec">No hay torneos en curso.</p></Card>
          ) : (
            <div className="fila">
              {torneos.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTorneoSeleccionado(t.id);
                    void cargarDetalle(t.id);
                  }}
                  className="boton"
                  style={{
                    background: torneoSeleccionado === t.id ? 'var(--primario)' : 'var(--bg-surface-2)',
                    color: torneoSeleccionado === t.id ? 'var(--primario-contrast)' : 'var(--texto)',
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
            <h2 className="titulo" style={{ fontSize: '1.1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Trophy size={18} />
              {torneos.find((t) => t.id === torneoSeleccionado)?.nombre}
            </h2>

            <div className="stack" style={{ gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              <div>
                <h3 className="titulo" style={{ fontSize: '0.95rem' }}>Fixture</h3>
                {partidos.length === 0 ? (
                  <Card className="caja-vacia"><p className="texto-sec">Sin partidos cargados.</p></Card>
                ) : (
                  <div className="stack">
                    {partidos.map((p) => {
                      const local = equipos.find((e) => e.id === p.equipo_local_id)?.nombre_equipo ?? 'Local';
                      const visitante = equipos.find((e) => e.id === p.equipo_visitante_id)?.nombre_equipo ?? 'Visitante';
                      const resultado = p.jugado ? `${p.goles_local}-${p.goles_visitante}` : '—';
                      return (
                        <Card key={p.id} className="fila-entre">
                          <span className="fila"><Users size={14} /> {local}</span>
                          <span style={{ fontWeight: 700 }}>{resultado}</span>
                          <span className="fila">{visitante} <Users size={14} /></span>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="titulo" style={{ fontSize: '0.95rem' }}>Tabla de posiciones</h3>
                {posiciones.length === 0 ? (
                  <Card className="caja-vacia"><p className="texto-sec">Sin equipos cargados.</p></Card>
                ) : (
                  <div className="tarjeta-plana" style={{ overflowX: 'auto', padding: '0.5rem' }}>
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posiciones.map((pos) => (
                          <tr key={pos.equipo}>
                            <td style={{ fontWeight: 600 }}>{pos.equipo}</td>
                            <td>{pos.pj}</td>
                            <td>{pos.pg}</td>
                            <td>{pos.pe}</td>
                            <td>{pos.pp}</td>
                            <td>{pos.gf}</td>
                            <td>{pos.gc}</td>
                            <td>{pos.dg}</td>
                            <td style={{ fontWeight: 700 }}>{pos.puntos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
