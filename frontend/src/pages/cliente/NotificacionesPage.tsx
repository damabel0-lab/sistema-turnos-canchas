import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui';
import { Bell, Clock } from 'lucide-react';

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  leida: boolean;
  creada_en: string;
}

export function NotificacionesPage() {
  const { session } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!session) return;
    try {
      setNotificaciones(await api<Notificacion[]>('/notificaciones'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando notificaciones');
    }
  }, [session]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function leer(id: string) {
    try {
      await api(`/notificaciones/${id}/leer`, { method: 'PATCH' });
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo marcar como leída');
    }
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-12">
        <Card padded={false}>
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Notificaciones</h1>
            <p className="text-gray-600 mb-6">Iniciá sesión para ver tus notificaciones.</p>
          </div>
        </Card>
      </main>
    );
  }

  const noLeidas = notificaciones.filter((n) => !n.leida);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            <Bell className="w-5 h-5 mr-2" />
            Notificaciones
          </h1>
          {noLeidas.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
              {noLeidas.length} nueva{noLeidas.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {notificaciones.length === 0 ? (
          <Card padded={false}>
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
                <Clock size={32} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">No tenés notificaciones todavía</h3>
              <p className="text-gray-600">
                Te avisaremos cuando tengas turnos próximos o suspensiones.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {notificaciones.map((n) => (
              <Card
                key={n.id}
                padded={false}
                className={!n.leida ? 'border-indigo-200 bg-indigo-50' : undefined}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => void leer(n.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{n.titulo}</h3>
                        {!n.leida && (
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs">
                            Nueva
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{n.cuerpo}</div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(n.creada_en).toLocaleString('es-AR')}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
