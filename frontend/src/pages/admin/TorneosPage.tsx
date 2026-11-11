import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui';
import { Trophy, RefreshCw } from 'lucide-react';

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
  const { toasts, mostrar, cerrar } = useToast();

  const [nuevoTorneo, setNuevoTorneo] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '', premio: '' });
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
      mostrar('Torneo creado ', 'success');
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
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    try {
      await api(`/torneos/${torneoId}/equipos`, {
        method: 'POST',
        body: JSON.stringify({
          nombre_equipo: String(form.get('nombre_equipo')),
          capitan_id: String(form.get('capitan_id') || null),
        }),
      });
      formEl.reset();
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
      mostrar('Resultado cargado ', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el resultado');
    }
  }

  if (!session) {
    return (
      <div className="admin-page">
        <div className="contenedor">
          <Card className="caja-vacia"><p className="texto-sec">Iniciá sesión.</p></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="contenedor-ancho">
        <div className="fila-entre" style={{ marginBottom: '1rem' }}>
          <h1 className="titulo"><span className="fila"><Trophy size={20} /> Torneos</span></h1>
          <button className="boton boton-outline" onClick={() => void cargarTorneos()}>
            <RefreshCw size={16} /> Actualizar
          </button>
        </div>
        {error && <p style={{ color: 'var(--peligro)' }}>{error}</p>}
        <ToastContainer toasts={toasts} onCerrar={cerrar} />

        <h2 className="titulo" style={{ fontSize: '1.1rem' }}>Crear torneo</h2>
        <Card>
          <form onSubmit={crearTorneo} className="stack">
            <label className="label">Nombre<input required value={nuevoTorneo.nombre} onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, nombre: e.target.value })} className="input" /></label>
            <label className="label">Fecha de inicio<input required type="date" value={nuevoTorneo.fecha_inicio} onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, fecha_inicio: e.target.value })} className="input" /></label>
            <label className="label">Fecha de fin<input type="date" value={nuevoTorneo.fecha_fin} onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, fecha_fin: e.target.value })} className="input" /></label>
            <label className="label">Premio<input value={nuevoTorneo.premio} onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, premio: e.target.value })} className="input" /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="boton boton-primario">Crear torneo</button>
            </div>
          </form>
        </Card>

        <h2 className="titulo" style={{ fontSize: '1.1rem', marginTop: '1rem' }}>Torneos creados</h2>
        {torneos.length === 0 ? (
          <Card className="caja-vacia"><p className="texto-sec">No hay torneos todavía.</p></Card>
        ) : (
          <div className="fila" style={{ flexWrap: 'wrap' }}>
            {torneos.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => void cargarDetalle(t.id)}
                className="boton"
                style={{
                  background: torneoId === t.id ? 'var(--primario)' : 'var(--bg-surface-2)',
                  color: torneoId === t.id ? 'var(--primario-contrast)' : 'var(--texto)',
                }}
              >
                {t.nombre}
              </button>
            ))}
          </div>
        )}

        {torneoId && (
          <div className="stack" style={{ marginTop: '1rem' }}>
            <h3 className="titulo" style={{ fontSize: '0.95rem' }}>Equipos y partidos</h3>
            <div className="grilla-tarjetas">
              <Card>
                <h4 style={{ marginTop: 0 }}>Equipos</h4>
                <form onSubmit={crearEquipo} className="fila">
                  <input required name="nombre_equipo" placeholder="Nombre del equipo" className="input" style={{ flex: 1 }} />
                  <input name="capitan_id" placeholder="ID capitán" className="input" style={{ width: '120px' }} />
                  <button type="submit" className="boton boton-primario">Agregar</button>
                </form>
                {equipos.length === 0 ? (
                  <p className="texto-sec" style={{ marginTop: '0.5rem' }}>Sin equipos.</p>
                ) : (
                  <ul className="stack" style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem' }}>
                    {equipos.map((e) => (
                      <li key={e.id} className="tarjeta-plana" style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-surface-2)' }}>
                        {e.nombre_equipo}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card>
                <h4 style={{ marginTop: 0 }}>Partidos</h4>
                {partidos.length === 0 ? (
                  <p className="texto-sec">Sin partidos cargados.</p>
                ) : (
                  <form onSubmit={cargarResultado} className="stack">
                    {partidos.map((p) => {
                      const local = equipos.find((e) => e.id === p.equipo_local_id)?.nombre_equipo ?? 'Local';
                      const visitante = equipos.find((e) => e.id === p.equipo_visitante_id)?.nombre_equipo ?? 'Visitante';
                      return (
                        <div key={p.id} className="tarjeta-plana" style={{ padding: '0.5rem 0.75rem' }}>
                          <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>{local} vs {visitante}</div>
                          <div className="fila">
                            <input name={`goles_local_${p.id}`} type="number" min={0} defaultValue={p.goles_local ?? 0} className="input" style={{ width: '60px' }} />
                            <span>–</span>
                            <input name={`goles_visitante_${p.id}`} type="number" min={0} defaultValue={p.goles_visitante ?? 0} className="input" style={{ width: '60px' }} />
                            <input type="hidden" name="partido_id" value={String(p.id)} />
                            <button type="submit" className="boton boton-primario">Guardar</button>
                          </div>
                        </div>
                      );
                    })}
                  </form>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
