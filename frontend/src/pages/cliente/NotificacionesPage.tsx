import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

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
      <main style={{ padding: 16 }}>
        <h1>Notificaciones</h1>
        <p>Iniciá sesión para ver tus notificaciones.</p>
      </main>
    );
  }

  const noLeidas = notificaciones.filter((n) => !n.leida);

  return (
    <main style={{ padding: 16, display: 'grid', gap: 20, maxWidth: 700 }}>
      <h1>Notificaciones</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {noLeidas.length > 0 && (
        <p style={{ color: '#b8860b', fontWeight: 'bold' }}>
          Tenés {noLeidas.length} notificación nueva.
        </p>
      )}

      {notificaciones.length === 0 ? (
        <p>No tenés notificaciones todavía.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {notificaciones.map((n) => (
            <div
              key={n.id}
              style={{
                border: '1px solid #ccc',
                borderRadius: 8,
                padding: 12,
                background: n.leida ? '#fff' : '#fff9c4',
                cursor: 'pointer',
              }}
              onClick={() => void leer(n.id)}
            >
              <div style={{ fontWeight: 'bold' }}>{n.titulo}</div>
              <div style={{ fontSize: 13, color: '#555' }}>{n.cuerpo}</div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                {new Date(n.creada_en).toLocaleString('es-AR')} —{' '}
                {n.leida ? 'Leída' : 'Nueva'}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
