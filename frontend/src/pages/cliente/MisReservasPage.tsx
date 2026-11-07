import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Badge } from '../../components/ui';
import { Link } from 'react-router-dom';
import { Clock, Calendar } from 'lucide-react';

interface Reserva {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  precio_total: number;
  monto_seña: number;
  estado: string;
  metodo_pago: string | null;
  es_turno_fijo: boolean;
  cancha: string;
  deporte: string | null;
}

const estados: Record<string, { texto: string; fondo: string; textoColor: string }> = {
  pendiente_seña: { texto: '⏳ Pendiente seña', fondo: '#fffbeb', textoColor: '#92400e' },
  confirmada: { texto: '✅ Confirmada', fondo: '#dcfce7', textoColor: '#166534' },
  completada: { texto: '🏁 Jugada', fondo: '#e0f2fe', textoColor: '#0369a1' },
  cancelada: { texto: '✕ Cancelada', fondo: '#f1f5f9', textoColor: '#475569' },
};

export function MisReservasPage() {
  const { session } = useAuth();
  const [datos, setDatos] = useState<{ proximas: Reserva[]; historial: Reserva[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    if (!session) return;
    try {
      setDatos(await api<{ proximas: Reserva[]; historial: Reserva[] }>('/reservas/mias'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando reservas');
    }
  }, [session]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cancelar(id: number) {
    if (!confirm('¿Cancelás esta reserva?')) return;
    setCancelando(id);
    try {
      await api(`/reservas/${id}/mia`, { method: 'DELETE' });
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar');
    } finally {
      setCancelando(null);
    }
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-12">
        <Card padded={false}>
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Mis Reservas</h1>
            <p className="text-gray-600 mb-6">Iniciá sesión para ver tus reservas.</p>
            <Button variant="primary" asChild className="px-6 py-2">
              <a href="/login">Iniciar sesión</a>
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Mis Reservas</h1>
        {error && (
          <Card padded={false}>
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </Card>
        )}

        <section className="mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Próximos turnos</h2>
          {!datos || datos.proximas.length === 0 ? (
            <Card padded={false}>
              <div className="p-8 text-center text-gray-600">
                No tenés turnos próximos. <Button variant="ghost" asChild className="mt-4 inline-block">
                  <Link to="/reservar">Reservar uno</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {datos.proximas.map((r) => (
                <Card key={r.id} padded={false}>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{r.cancha}</div>
                        <div className="text-sm text-gray-500">
                          {r.deporte} · {r.fecha.slice(5).replace('-', '/')}
                        </div>
                        <div className="text-sm text-gray-500">{r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.estado === 'confirmada' ? 'success' : r.estado === 'cancelada' ? 'danger' : 'warning'} className="text-xs">
                        {estados[r.estado]?.texto ?? r.estado}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900">${r.precio_total}</span>
                      {r.estado === 'pendiente_seña' || r.estado === 'confirmada' ? (
                        <button
                          type="button"
                          disabled={cancelando === r.id}
                          onClick={() => void cancelar(r.id)}
                          className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          {cancelando === r.id ? 'Cancelando…' : 'Cancelar'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-bold text-gray-900 mb-4">Historial</h2>
          {!datos || datos.historial.length === 0 ? (
            <Card padded={false}>
              <div className="p-8 text-center text-gray-600">Todavía no jugaste nada.</div>
            </Card>
          ) : (
            <div className="space-y-3">
              {datos.historial.map((r) => (
                <Card key={r.id} padded={false}>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
                        <Clock size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{r.cancha}</div>
                        <div className="text-sm text-gray-500">
                          {r.deporte} · {r.fecha.slice(5).replace('-', '/')}
                        </div>
                        <div className="text-sm text-gray-500">{r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="danger" className="text-xs">
                        {estados[r.estado]?.texto ?? r.estado}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900">${r.precio_total}</span>
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
