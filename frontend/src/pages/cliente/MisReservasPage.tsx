import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

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

interface MisReservas {
  proximas: Reserva[];
  historial: Reserva[];
}

const estados: Record<string, { texto: string; fondo: string }> = {
  pendiente_seña: { texto: '⏳ Pendiente seña', fondo: '#fff3cd' },
  confirmada: { texto: '✅ Confirmada', fondo: '#d4edda' },
  completada: { texto: '🏁 Jugada', fondo: '#cce5ff' },
  cancelada: { texto: '✕ Cancelada', fondo: '#e2e3e5' },
};

export function MisReservasPage() {
  const { session } = useAuth();
  const [datos, setDatos] = useState<MisReservas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    if (!session) return;
    try {
      setDatos(await api<MisReservas>('/reservas/mias'));
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
      <main style={{ padding: 16 }}>
        <h1>Mis Reservas</h1>
        <p>
          <Link to="/login">Iniciá sesión</Link> para ver tus reservas.
        </p>
      </main>
    );
  }

  const Tarjeta = ({ r, accion }: { r: Reserva; accion?: boolean }) => (
    <li
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        listStyle: 'none',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 90 }}>
        <strong>{r.fecha.slice(5).replace('-', '/')}</strong>
        <div style={{ fontSize: 13, color: '#555' }}>
          {r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div>
          {r.cancha} {r.deporte && <span style={{ color: '#666' }}>· {r.deporte}</span>}
        </div>
        <div style={{ fontSize: 13, color: '#555' }}>
          ${r.precio_total}
          {r.monto_seña > 0 && ` · seña $${r.monto_seña}`}
          {r.es_turno_fijo && ' · 🔁 turno fijo'}
        </div>
      </div>
      <span
        style={{
          background: estados[r.estado]?.fondo ?? '#eee',
          padding: '4px 10px',
          borderRadius: 12,
          fontSize: 13,
        }}
      >
        {estados[r.estado]?.texto ?? r.estado}
      </span>
      {accion && (r.estado === 'pendiente_seña' || r.estado === 'confirmada') && (
        <button
          type="button"
          disabled={cancelando === r.id}
          onClick={() => void cancelar(r.id)}
          style={{ color: 'crimson' }}
        >
          {cancelando === r.id ? 'Cancelando…' : 'Cancelar'}
        </button>
      )}
    </li>
  );

  return (
    <main style={{ padding: 16, display: 'grid', gap: 24, maxWidth: 720 }}>
      <h1>Mis Reservas</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <section>
        <h2>Próximos turnos</h2>
        {!datos || datos.proximas.length === 0 ? (
          <p>
            No tenés turnos. <Link to="/reservar">Reservá uno</Link>.
          </p>
        ) : (
          <ul style={{ padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {datos.proximas.map((r) => (
              <Tarjeta key={r.id} r={r} accion />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Historial</h2>
        {!datos || datos.historial.length === 0 ? (
          <p>Todavía no jugaste nada.</p>
        ) : (
          <ul style={{ padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {datos.historial.map((r) => (
              <Tarjeta key={r.id} r={r} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
