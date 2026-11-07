import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card, Button } from '../../components/ui';
import { Users } from 'lucide-react';

interface Socio {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  es_socio: boolean;
  creado_en: string;
}

export function SociosPage() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: '', apellido: '', telefono: '' });

  const cargar = useCallback(async () => {
    try {
      setSocios(await api<Socio[]>('/socios'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando socios');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function darDeAlta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await api('/socios', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nuevo.nombre,
          apellido: nuevo.apellido,
          telefono: nuevo.telefono,
        }),
      });
      setMensaje('Socio dado de alta ✅');
      setNuevo({ nombre: '', apellido: '', telefono: '' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dar de alta');
    }
  }

  async function darDeBaja(id: string) {
    if (!confirm('¿Quedar sin el beneficio de socio?')) return;
    try {
      await api(`/socios/${id}`, { method: 'DELETE' });
      setMensaje('Socio dado de baja ✅');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dar de baja');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Socios
          </h1>
          <Button variant="outline" onClick={() => void cargar()} className="px-4 py-2">
            Actualizar
          </Button>
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {mensaje && <p className="text-emerald-600 text-sm mb-4">{mensaje}</p>}

        <section className="mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Dar de alta socio</h2>
          <Card padded={false}>
            <div className="p-6">
              <form onSubmit={darDeAlta} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    required
                    value={nuevo.nombre}
                    onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    required
                    value={nuevo.apellido}
                    onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    required
                    value={nuevo.telefono}
                    onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col items-end">
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                    Dar de alta
                  </button>
                </div>
              </form>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 mb-4">Directorio de socios</h2>
          {socios.length === 0 ? (
            <Card padded={false}>
              <div className="p-8 text-center text-gray-600">
                No hay socios todavía.
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {socios.map((s) => (
                <Card key={s.id} padded={false}>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{s.nombre} {s.apellido}</div>
                        <div className="text-sm text-gray-500">{s.telefono ?? '—'}</div>
                        <div className="text-xs text-gray-400">{s.creado_en?.slice(0, 10) ?? '—'}</div>
                      </div>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => void darDeBaja(s.id)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Baja
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
