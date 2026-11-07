import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button } from '../../components/ui';
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

export function TorneosPage() {
  const { session } = useAuth();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [nuevoTorneo, setNuevoTorneo] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    premio: '',
  });

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
      <main className="min-h-screen bg-gray-50 px-6 py-12">
        <Card padded={false}>
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Torneos</h1>
            <p className="text-gray-600 mb-6">Iniciá sesión para administrar torneos.</p>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Torneos
          </h1>
          <Button variant="outline" onClick={() => void cargarTorneos()} className="px-4 py-2">
            Actualizar
          </Button>
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {mensaje && <p className="text-emerald-600 text-sm mb-4">{mensaje}</p>}

        <section>
          <h2 className="font-bold text-gray-900 mb-4">Crear torneo</h2>
          <Card padded={false}>
            <div className="p-6">
              <form onSubmit={crearTorneo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    required
                    name="nombre"
                    value={nuevoTorneo.nombre}
                    onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, nombre: e.target.value })}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Fecha de inicio</label>
                  <input
                    required
                    name="fecha_inicio"
                    type="date"
                    value={nuevoTorneo.fecha_inicio}
                    onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, fecha_inicio: e.target.value })}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Fecha de fin</label>
                  <input
                    name="fecha_fin"
                    type="date"
                    value={nuevoTorneo.fecha_fin}
                    onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, fecha_fin: e.target.value })}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Premio</label>
                  <input
                    name="premio"
                    value={nuevoTorneo.premio}
                    onChange={(e) => setNuevoTorneo({ ...nuevoTorneo, premio: e.target.value })}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col items-end">
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                    Crear torneo
                  </button>
                </div>
              </form>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 mb-4">Torneos creados</h2>
          {torneos.length === 0 ? (
            <Card padded={false}>
              <div className="p-8 text-center text-gray-600">
                No hay torneos todavía.
              </div>
            </Card>
          ) : (
            <div className="flex flex-wrap gap-3">
              {torneos.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => void cargarDetalle(t.id)}
                  className={`px-5 py-3 rounded-xl border transition-all ${
                    torneoId === t.id
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

        {torneoId && (
          <section>
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Equipos y partidos
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-bold text-gray-900 mb-3">Equipos</h3>
                <form onSubmit={crearEquipo} className="flex gap-2 mb-4">
                  <input
                    required
                    name="nombre_equipo"
                    placeholder="Nombre del equipo"
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    name="capitan_id"
                    placeholder="ID del capitán (opcional)"
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                    Agregar
                  </button>
                </form>
                {equipos.length === 0 ? (
                  <p className="text-gray-500 text-sm">Sin equipos todavía.</p>
                ) : (
                  <ul className="space-y-2">
                    {equipos.map((e) => (
                      <li key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white">
                        <span>{e.nombre_equipo}</span>
                        <span className="text-xs text-gray-400">{e.capitan_id ?? 'Sin capitán'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-3">Partidos</h3>
                {partidos.length === 0 ? (
                  <p className="text-gray-500 text-sm">Sin partidos cargados todavía.</p>
                ) : (
                  <form onSubmit={cargarResultado} className="space-y-3">
                    {partidos.map((p) => (
                      <div key={p.id} className="p-3 rounded-xl border border-gray-200 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold">{equipos.find((e) => e.id === p.equipo_local_id)?.nombre_equipo ?? 'Local'}</div>
                          <div className="font-bold">{equipos.find((e) => e.id === p.equipo_visitante_id)?.nombre_equipo ?? 'Visitante'}</div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            name={`goles_local_${p.id}`}
                            defaultValue={p.goles_local ?? 0}
                            min={0}
                            className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 w-16"
                          />
                          <span className="text-gray-400">–</span>
                          <input
                            type="number"
                            name={`goles_visitante_${p.id}`}
                            defaultValue={p.goles_visitante ?? 0}
                            min={0}
                            className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 w-16"
                          />
                          <input type="hidden" name="partido_id" value={String(p.id)} />
                          <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
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
      </div>
    </main>
  );
}
