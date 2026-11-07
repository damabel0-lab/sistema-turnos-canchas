import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Card, Badge } from '../../components/ui';
import { Calendar } from 'lucide-react';

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

const estados: Record<string, { texto: string; variante: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }> = {
  pendiente_seña: { texto: '⏳ Pendiente seña', variante: 'warning' },
  confirmada: { texto: '✅ Confirmada', variante: 'success' },
  completada: { texto: '🏁 Jugada', variante: 'info' },
  cancelada: { texto: '✕ Cancelada', variante: 'neutral' },
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

  const Tarjeta = ({ r, cancelarPropia }: { r: Reserva; cancelarPropia: boolean }) => (
    <div className="tarjeta-plana" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div className="icono-circulo" style={{ width: '2.5rem', height: '2.5rem' }}>
        <Calendar size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{r.cancha}</div>
        <div className="texto-sec" style={{ fontSize: '0.8rem' }}>
          {r.deporte} · {r.fecha.slice(5).replace('-', '/')} · {r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)}
        </div>
        <div className="texto-sec" style={{ fontSize: '0.8rem' }}>
          ${r.precio_total}
          {r.monto_seña > 0 && ` · seña $${r.monto_seña}`}
        </div>
      </div>
      <Badge variant={estados[r.estado]?.variante ?? 'neutral'}>
        {estados[r.estado]?.texto ?? r.estado}
      </Badge>
      {cancelarPropia && r.estado !== 'cancelada' && r.estado !== 'completada' && (
        <button
          type="button"
          disabled={cancelando === r.id}
          onClick={() => void cancelar(r.id)}
          className="boton boton-ghost"
          style={{ color: '#dc2626' }}
        >
          {cancelando === r.id ? 'Cancelando…' : 'Cancelar'}
        </button>
      )}
    </div>
  );

  if (!session) {
    return (
      <main className="pantalla">
        <div className="contenedor">
          <Card className="caja-vacia">
            <h1 className="titulo">Mis Reservas</h1>
            <p className="texto-sec">Iniciá sesión para ver tus reservas.</p>
            <Link to="/login" className="boton boton-primario" style={{ marginTop: '0.75rem' }}>
              Iniciar sesión
            </Link>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="pantalla">
      <div className="contenedor">
        <h1 className="titulo">Mis Reservas</h1>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 className="titulo" style={{ fontSize: '1.1rem' }}>Próximos turnos</h2>
          {!datos || datos.proximas.length === 0 ? (
            <Card className="caja-vacia">
              <p className="texto-sec">No tenés turnos próximos.</p>
              <Link to="/reservar" className="boton boton-primario" style={{ marginTop: '0.75rem' }}>
                Reservar uno
              </Link>
            </Card>
          ) : (
            <div className="stack">
              {datos.proximas.map((r) => (
                <Tarjeta key={r.id} r={r} cancelarPropia />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="titulo" style={{ fontSize: '1.1rem' }}>Historial</h2>
          {!datos || datos.historial.length === 0 ? (
            <Card className="caja-vacia">
              <p className="texto-sec">Todavía no jugaste nada.</p>
            </Card>
          ) : (
            <div className="stack">
              {datos.historial.map((r) => (
                <Tarjeta key={r.id} r={r} cancelarPropia={false} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
