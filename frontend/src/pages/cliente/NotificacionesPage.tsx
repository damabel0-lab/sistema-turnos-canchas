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
      <main className="pantalla">
        <div className="contenedor">
          <Card className="caja-vacia">
            <h1 className="titulo">Notificaciones</h1>
            <p className="texto-sec">Iniciá sesión para ver tus notificaciones.</p>
          </Card>
        </div>
      </main>
    );
  }

  const noLeidas = notificaciones.filter((n) => !n.leida);

  return (
    <main className="pantalla">
      <div className="contenedor-estrecho">
        <div className="fila-entre" style={{ marginBottom: '1rem' }}>
          <h1 className="titulo" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Bell size={22} /> Notificaciones
          </h1>
          {noLeidas.length > 0 && (
            <span className="badge badge-peligro">{noLeidas.length} nueva{noLeidas.length > 1 ? 's' : ''}</span>
          )}
        </div>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}

        {notificaciones.length === 0 ? (
          <Card className="caja-vacia">
            <div className="icono-circulo" style={{ margin: '0 auto 0.75rem' }}>
              <Clock size={28} />
            </div>
            <h3 style={{ margin: '0 0 0.25rem' }}>No tenés notificaciones todavía</h3>
            <p className="texto-sec">Te avisaremos cuando tengas turnos próximos o suspensiones.</p>
          </Card>
        ) : (
          <div className="stack">
            {notificaciones.map((n) => (
              <div
                key={n.id}
                onClick={() => void leer(n.id)}
                className="tarjeta-plana"
                style={{
                  cursor: 'pointer',
                  padding: '0.75rem 1rem',
                  background: n.leida ? '#ffffff' : '#eef2ff',
                  border: n.leida ? '1px solid var(--color-borde)' : '1px solid #c7d2fe',
                }}
              >
                <div className="fila-entre">
                  <div style={{ fontWeight: 700 }}>{n.titulo}</div>
                  {!n.leida && <span className="badge badge-info">Nueva</span>}
                </div>
                <div className="texto-sec" style={{ marginTop: '0.25rem' }}>{n.cuerpo}</div>
                <div className="texto-sec" style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>
                  {new Date(n.creada_en).toLocaleString('es-AR')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
