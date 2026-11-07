import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card, Button } from '../../components/ui';
import { Users } from 'lucide-react';

interface Beneficio {
  id: number;
  nombre_beneficio: string;
  descuento_porcentaje: number;
  aplica_en: string;
}

export function BeneficiosPage() {
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({
    nombre_beneficio: '',
    descuento_porcentaje: '',
    aplica_en: 'cancha',
  });

  const cargar = useCallback(async () => {
    try {
      setBeneficios(await api<Beneficio[]>('/beneficios'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando beneficios');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function crear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await api('/beneficios', {
        method: 'POST',
        body: JSON.stringify({
          nombre_beneficio: nuevo.nombre_beneficio,
          descuento_porcentaje: Number(nuevo.descuento_porcentaje),
          aplica_en: nuevo.aplica_en,
        }),
      });
      setMensaje('Beneficio creado ✅');
      setNuevo({ nombre_beneficio: '', descuento_porcentaje: '', aplica_en: 'cancha' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
    }
  }

  async function borrar(id: number) {
    if (!confirm('¿Eliminar este beneficio?')) return;
    try {
      await api(`/beneficios/${id}`, { method: 'DELETE' });
      setMensaje('Beneficio eliminado ✅');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Beneficios de socios
          </h1>
          <Button variant="outline" onClick={() => void cargar()} className="px-4 py-2">
            Actualizar
          </Button>
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {mensaje && <p className="text-emerald-600 text-sm mb-4">{mensaje}</p>}

        <section className="mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Catálogo de beneficios</h2>
          <Card padded={false}>
            <div className="p-6">
              <form onSubmit={crear} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Nombre del beneficio</label>
                  <input
                    required
                    value={nuevo.nombre_beneficio}
                    onChange={(e) => setNuevo({ ...nuevo, nombre_beneficio: e.target.value })}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Descuento (%)</label>
                  <input
                    required
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={nuevo.descuento_porcentaje}
                    onChange={(e) => setNuevo({ ...nuevo, descuento_porcentaje: e.target.value })}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-gray-700 mb-1">Aplica en</label>
                  <select
                    value={nuevo.aplica_en}
                    onChange={(e) => setNuevo({ ...nuevo, aplica_en: e.target.value })}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cancha">Cancha</option>
                    <option value="gimnasio">Gimnasio</option>
                    <option value="pileta">Pileta</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="flex flex-col items-end">
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                    Crear beneficio
                  </button>
                </div>
              </form>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="font-bold text-gray-900 mb-4">Beneficios activos</h2>
          {beneficios.length === 0 ? (
            <Card padded={false}>
              <div className="p-8 text-center text-gray-600">
                No hay beneficios cargados todavía.
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {beneficios.map((b) => (
                <Card key={b.id} padded={false}>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{b.nombre_beneficio}</div>
                      <div className="text-sm text-gray-500">
                        {b.descuento_porcentaje}% de descuento en {b.aplica_en}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void borrar(b.id)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Borrar
                    </button>
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
