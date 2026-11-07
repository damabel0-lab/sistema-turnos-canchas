import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card, Button, Badge } from '../../components/ui';
import { Clock, Search } from 'lucide-react';

interface Cancha {
  id: number;
  nombre: string;
  deporte_id: number | null;
  precio_base: number;
  activa: boolean;
  caracteristicas: string | null;
  deportes?: { nombre: string; tipo: string } | null;
}

interface Deporte {
  id: number;
  nombre: string;
  tipo: string;
  requiere_cancha: boolean;
}

export function CanchasPage() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [c, d] = await Promise.all([
        api<Cancha[]>('/canchas'),
        api<Deporte[]>('/deportes'),
      ]);
      setCanchas(c);
      setDeportes(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function crearCancha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    const form = new FormData(e.currentTarget);
    try {
      await api('/canchas', {
        method: 'POST',
        body: JSON.stringify({
          nombre: String(form.get('nombre')),
          deporte_id: form.get('deporte_id') ? Number(form.get('deporte_id')) : null,
          precio_base: Number(form.get('precio_base')),
          caracteristicas: String(form.get('caracteristicas') ?? '') || null,
        }),
      });
      e.currentTarget.reset();
      setMensaje('Cancha creada ✅');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear');
    }
  }

  async function alternarActiva(cancha: Cancha) {
    try {
      await api(`/canchas/${cancha.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activa: !cancha.activa }),
      });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Canchas y tarifas
          </h1>
          <Button variant="outline" onClick={() => void cargar()} className="px-4 py-2">
            Actualizar
          </Button>
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {mensaje && <p className="text-emerald-600 text-sm mb-4">{mensaje}</p>}

        <section>
          <h2 className="font-bold text-gray-900 mb-4">Listado</h2>
          {canchas.length === 0 ? (
            <Card padded={false}>
              <div className="p-8 text-center text-gray-600">
                No hay canchas cargadas todavía.
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {canchas.map((c) => (
                <Card key={c.id} padded={false}>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Search className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{c.nombre}</div>
                        <div className="text-sm text-gray-500">
                          {c.deportes?.nombre ?? 'Sin deporte'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">${c.precio_base}/h</span>
                      <Badge variant={c.activa ? 'success' : 'danger'} className="text-xs">
                        {c.activa ? 'Activa' : 'Inactiva'}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => void alternarActiva(c)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {c.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="font-bold text-gray-900 mb-4">Agregar cancha</h2>
          <Card padded={false}>
            <div className="p-6">
              <form onSubmit={crearCancha} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    name="nombre"
                    required
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Deporte</label>
                  <select
                    name="deporte_id"
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sin deporte</option>
                    {deportes.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Precio base ($/h)</label>
                  <input
                    name="precio_base"
                    type="number"
                    min={0}
                    step={0.01}
                    required
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Características</label>
                  <input
                    name="caracteristicas"
                    placeholder="Ej: Iluminada, techada"
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col items-end">
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                    Crear cancha
                  </button>
                </div>
              </form>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
