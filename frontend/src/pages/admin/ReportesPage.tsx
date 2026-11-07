import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card, Button } from '../../components/ui';
import { Calendar, DollarSign } from 'lucide-react';

interface IngresoPorDisciplina {
  origen: string;
  total: number;
  movimientos: number;
}

interface Reporte {
  desde: string;
  hasta: string;
  total_general: number;
  por_disciplina: IngresoPorDisciplina[];
}

export function ReportesPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setReporte(await api<Reporte>(`/caja/reporte-disciplina?fecha=${fecha}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando reporte');
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Reportes y estadísticas
          </h1>
          <div className="flex gap-2">
            <label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
            <Button variant="outline" onClick={() => void cargar()} className="px-4 py-2">
              Actualizar
            </Button>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {reporte && (
          <Card padded={false}>
            <div className="p-6">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="font-bold text-gray-900">Recaudación del día</h2>
                  <p className="text-sm text-gray-500">
                    {new Date(reporte.desde).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ${reporte.total_general}
                </div>
              </div>

              <h3 className="font-bold text-gray-900 mb-3">Por disciplina / origen</h3>
              {reporte.por_disciplina.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin movimientos en esta fecha.</p>
              ) : (
                <div className="space-y-2">
                  {reporte.por_disciplina.map((d) => (
                    <div key={d.origen} className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100">
                      <div>
                        <div className="font-medium text-gray-900">{d.origen}</div>
                        <div className="text-xs text-gray-500">{d.movimientos} movimiento{d.movimientos !== 1 ? 's' : ''}</div>
                      </div>
                      <div className="font-bold text-right">${d.total}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
