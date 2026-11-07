import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

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

export function TorneosPage() {
  const { session } = useAuth();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // form crear torneo
  const [nuevoTorneo, setNuevoTorneo] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    premio: '',
  });

  // seleccionar torneo para ver equipos/partidos
  const [torneoId, setTorneoId] = useState<number | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);

  const cargarTorneos = useCallback(async () => {
    try {
      setTorneos(await api<Torneo[]>('/torneos'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando torneos');
    }
  }, []);

  useEffect(() => {
    void cargarTorneos();
  }, [cargarTorneos]);

  async function crearTorneo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await api('/torneos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nuevoTorneo.nombre,
          fecha_inicio: nuevoTorneo.fecha_inicio,
          fecha_fin: nuevoTorneo.fecha_fin || null,
          premio: nuevoTorneo.premio || null,
        }),
      });
      setMensaje('Torneo creado ✅');
      setNuevoTorneo({ nombre: '', fecha_inicio: '', fecha_fin: '', premio: '' });
      await cargarTorneos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el torneo');
    }
  }

  async function cargarDetalle(id: number) {
    setTorneoId(id);
    setError(null);
    try {
      const [eq, pt] = await Promise.all([
        api<Equipo[]>(`/torneos/${id}/equipos`),
        api<Partido[]>(`/torneos/${id}/partidos`),
      ]);
      setEquipos(eq);
      setPartidos(pt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando detalle');
    }
  }

  async function crearEquipo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api(`/torneos/${torneoId}/equipos`, {
        method: 'POST',
        body: JSON.stringify({
          nombre_equipo: String(form.get('nombre_equipo')),
          capitan_id: String(form.get('capitan_id') || null),
        }),
      });
      e.currentTarget.reset();
      const eq = await api<Equipo[]>(`/torneos/${torneoId}/equipos`);
      setEquipos(eq);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el equipo');
    }
  }

  async function cargarResultado(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const partidoId = Number(String(form.get('partido_id')));
    try {
      await api(`/torneos/partidos/${partidoId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          goles_local: Number(form.get('goles_local')),
          goles_visitante: Number(form.get('goles_visitante')),
          jugado: true,
        }),
      });
      const pt = await api<Partido[]>(`/torneos/${torneoId}/partidos`);
      setPartidos(pt);
      setMensaje('Resultado cargado ✅');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el resultado');
    }
  }

  if (!session) {
    return (
      <main style={{ padding: 16 }}>
        <h1>Torneos</h1>
        <p>Iniciá sesión para administrar torneos.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, display: 'grid', gap: 24, maxWidth: 900 }}>
      <h1>Torneos</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {mensaje && <p style={{ color: 'green' }}>{mensaje}</p>}

      <section>
        <h2>Crear torneo</h2>
        <form onSubmit={crearTorneo} style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
          <label>
            Nombre
            <br />
            <input
              required
              name="nombre"
              value={nuevoTorneo.nombre}
              onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, nombre: e.target.value })}
            />
          </label>
          <label>
            Fecha de inicio
            <br />
            <input
              required
              name="fecha_inicio"
              type="date"
              value={nuevoTorneo.fecha_inicio}
              onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, fecha_inicio: e.target.value })}
            />
          </label>
          <label>
            Fecha de fin
            <br />
            <input
              name="fecha_fin"
              type="date"
              value={nuevoTorneo.fecha_fin}
              onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, fecha_fin: e.target.value })}
            />
          </label>
          <label>
            Premio
            <br />
            <input
              name="premio"
              value={nuevoTorneo.premio}
              onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, premio: e.target.value })}
            />
          </label>
          <button type="submit">Crear torneo</button>
        </form>
      </section>

      <section>
        <h2>Torneos creados</h2>
        {torneos.length === 0 ? (
          <p>No hay torneos todavía.</p>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {torneos.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => void cargarDetalle(t.id)}
                style={{
                  padding: '10px 14px',
                  background: torneoId === t.id ? '#1a73e8' : '#eee',
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

      {torneoId && (
        <section>
          <h2>Equipos y partidos</h2>
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <h3>Equipos</h3>
              <form onSubmit={crearEquipo} style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                <input
                  required
                  name="nombre_equipo"
                  placeholder="Nombre del equipo"
                  style={{ flex: 1 }}
                />
                <input name="capitan_id" placeholder="ID del capitán (opcional)" />
                <button type="submit">Agregar equipo</button>
              </form>
              {equipos.length === 0 ? (
                <p style={{ color: '#666' }}>Sin equipos todavía.</p>
              ) : (
                <ul style={{ padding: 0 }}>
                  {equipos.map((e) => (
                    <li key={e.id}>{e.nombre_equipo}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3>Partidos</h3>
              {partidos.length === 0 ? (
                <p style={{ color: '#666' }}>Sin partidos cargados todavía.</p>
              ) : (
                <form onSubmit={cargarResultado} style={{ display: 'grid', gap: 8 }}>
                  {partidos.map((p) => (
                    <div
                      key={p.id}
                      style={{ border: '1px solid #ccc', padding: 8, borderRadius: 6 }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: 6 }}>
                        {equipos.find((e) => e.id === p.equipo_local_id)?.nombre_equipo ?? 'Local'}
                        vs{' '}
                        {equipos.find((e) => e.id === p.equipo_visitante_id)?.nombre_equipo ??
                          'Visitante'}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="number"
                          name={`goles_local_${p.id}`}
                          defaultValue={p.goles_local ?? 0}
                          min={0}
                          style={{ width: 50 }}
                        />
                        -
                        <input
                          type="number"
                          name={`goles_visitante_${p.id}`}
                          defaultValue={p.goles_visitante ?? 0}
                          min={0}
                          style={{ width: 50 }}
                        />
                        <input type="hidden" name="partido_id" value={String(p.id)} />
                        <button type="submit" style={{ marginLeft: 8 }}>
                          Guardar
                        </button>
                      </div>
                    </div>
                  ))}
                </form>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
