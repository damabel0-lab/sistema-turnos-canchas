import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/ui';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Calendar, History, RefreshCw } from 'lucide-react';

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

interface Estadisticas {
  veces_jugado: number;
  gasto_total: number;
  disciplina_favorita: string | null;
  cancelaciones: number;
}

const estados: Record<string, { texto: string; variante: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }> = {
  pendiente_seña: { texto: 'Pendiente seña', variante: 'warning' },
  confirmada: { texto: 'Confirmada', variante: 'success' },
  completada: { texto: 'Jugada', variante: 'info' },
  cancelada: { texto: 'Cancelada', variante: 'neutral' },
};

/** Fecha/hora de fin del turno como Date (para comparar si ya pasó) */
function finReserva(r: Reserva): Date {
  return new Date(`${r.fecha}T${r.hora_fin.slice(0, 5)}:00`);
}

function fechaLegible(r: Reserva): string {
  return new Date(`${r.fecha}T00:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function precio(n: number): string {
  return `$${n.toLocaleString('es-AR')}`;
}

/** Reparto defensivo: Próximos = activas y aún no finalizadas; el resto va a historial */
function reparto(reservas: Reserva[]): { proximas: Reserva[]; historial: Reserva[] } {
  const ahora = new Date();
  const proximas: Reserva[] = [];
  const historial: Reserva[] = [];

  for (const r of reservas) {
    const activa = r.estado === 'confirmada' || r.estado === 'pendiente_seña';
    if (activa && finReserva(r) >= ahora) proximas.push(r);
    else historial.push(r);
  }

  proximas.sort((a, b) => `${a.fecha}T${a.hora_inicio}`.localeCompare(`${b.fecha}T${b.hora_inicio}`));
  historial.sort((a, b) => `${b.fecha}T${b.hora_inicio}`.localeCompare(`${a.fecha}T${a.hora_inicio}`));

  return { proximas, historial };
}

export function MisReservasPage() {
  const { session } = useAuth();
  const { toasts, mostrar, cerrar } = useToast();

  const [datos, setDatos] = useState<{ proximas: Reserva[]; historial: Reserva[] } | null>(null);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [cargando, setCargando] = useState(true); // solo primera carga (muestra skeletons)
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<number | null>(null);
  const [confirmarCancelacion, setConfirmarCancelacion] = useState<Reserva | null>(null);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!session) return;
      if (silencioso) setRefrescando(true);
      try {
        // En paralelo; falla parcial tolerada (una parte rota no tira la otra)
        const [reservasRes, statsRes] = await Promise.allSettled([
          api<{ proximas: Reserva[]; historial: Reserva[] }>('/reservas/mias'),
          api<Estadisticas>('/reservas/mias/estadisticas'),
        ]);

        if (reservasRes.status === 'fulfilled') {
          // Combinamos ambas listas y reparto yo (defensivo ante cualquier vuelta del backend)
          const todas = new Map<number, Reserva>();
          for (const r of reservasRes.value.proximas ?? []) todas.set(r.id, r);
          for (const r of reservasRes.value.historial ?? []) todas.set(r.id, r);
          setDatos(reparto([...todas.values()]));
        } else {
          throw reservasRes.reason instanceof Error ? reservasRes.reason : new Error('Error cargando reservas');
        }

        if (statsRes.status === 'fulfilled') {
          setEstadisticas(statsRes.value);
        } else {
          setEstadisticas(null); // las estadísticas son accesorias: no bloquean la página
        }
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error cargando reservas');
      } finally {
        setCargando(false);
        setRefrescando(false);
      }
    },
    [session],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function confirmarCancelacionReserva() {
    const r = confirmarCancelacion;
    if (!r) return;
    setCancelando(r.id);
    try {
      await api(`/reservas/${r.id}/mia`, { method: 'DELETE' });
      setConfirmarCancelacion(null);
      mostrar(`Reserva en ${r.cancha} cancelada.`, 'success');
      await cargar(true);
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo cancelar', 'danger');
    } finally {
      setCancelando(null);
    }
  }

  const sinSesion = !session;

  if (sinSesion) {
    return (
      <main className="pagina-cliente">
        <div className="tarjeta caja-vacia" style={{ maxWidth: '30rem', margin: '3rem auto' }}>
          <h1 className="titulo">Mis reservas</h1>
          <p className="texto-sec">Iniciá sesión para ver tus reservas.</p>
          <Link to="/login" state={{ desde: '/mis-reservas' }} className="boton boton-primario" style={{ marginTop: '0.75rem' }}>
            Iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  const Tarjeta = ({ r, cancelable }: { r: Reserva; cancelable: boolean }) => (
    <div className="item-turno">
      <div className="item-turno-icono">
        <Calendar size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="item-turno-nombre">{r.cancha}</div>
        <div className="item-turno-meta">
          {r.deporte} · {fechaLegible(r)} · {r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)} · {precio(r.precio_total)}
          {r.monto_seña > 0 && ` · seña ${precio(r.monto_seña)}`}
        </div>
      </div>
      <Badge variant={estados[r.estado]?.variante ?? 'neutral'}>
        {estados[r.estado]?.texto ?? r.estado}
      </Badge>
      {cancelable && (
        <button
          type="button"
          disabled={cancelando === r.id}
          onClick={() => setConfirmarCancelacion(r)}
          className="boton boton-ghost"
          style={{ color: 'var(--peligro)', padding: '0.35rem 0.7rem' }}
        >
          {cancelando === r.id ? 'Cancelando…' : 'Cancelar'}
        </button>
      )}
    </div>
  );

  const cancelandoReserva = confirmarCancelacion
    ? `${confirmarCancelacion.cancha} · ${fechaLegible(confirmarCancelacion)} · ${confirmarCancelacion.hora_inicio.slice(0, 5)}–${confirmarCancelacion.hora_fin.slice(0, 5)}`
    : undefined;

  return (
    <main className="pagina-cliente">
      <ToastContainer toasts={toasts} onCerrar={cerrar} />
      <ConfirmDialog
        open={!!confirmarCancelacion}
        titulo="Cancelar reserva"
        descripcion={
          cancelandoReserva
            ? `${cancelandoReserva}. Perdés el turno y no se puede deshacer. ¿Confirmás?`
            : undefined
        }
        confirmarTexto="Sí, cancelarla"
        onConfirmar={() => void confirmarCancelacionReserva()}
        onCancelar={() => setConfirmarCancelacion(null)}
        peligro
      />

      {/* Encabezado unificado */}
      <header className="pagina-encabezado">
        <div>
          <span className="pagina-eyebrow">Mi cuenta · Mis reservas</span>
          <h1 className="pagina-titulo">Mis reservas</h1>
          <p className="pagina-sub">Tus próximos turnos y tu historial, de un vistazo.</p>
        </div>
        <button type="button" className="boton boton-outline" onClick={() => void cargar(true)} disabled={refrescando}>
          <RefreshCw size={15} /> {refrescando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

        {error && (
          <div className="alerta-error" role="alert">
            {error}
            <div style={{ marginTop: '0.6rem' }}>
              <button type="button" className="boton boton-outline" onClick={() => void cargar(true)}>
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* ===== Primera carga: skeletons ===== */}
        {cargando && !datos && (
          <>
            <div className="grilla-stats-4" style={{ marginBottom: '0.9rem' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="stat-card">
                  <div className="skeleton skeleton-texto" style={{ width: '60%' }} />
                  <div className="skeleton" style={{ height: '1.6rem', width: '45%' }} />
                </div>
              ))}
            </div>
            <div className="grilla-2-col">
              {[0, 1].map((col) => (
                <div key={col} className="panel" aria-hidden>
                  <div className="panel-header">
                    <div className="skeleton skeleton-texto" style={{ width: '40%', marginBottom: 0 }} />
                  </div>
                  <div className="panel-body">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="skeleton" style={{ height: '3.5rem' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ===== Estadísticas ===== */}
        {estadisticas && (
          <div className="grilla-stats-4" style={{ marginBottom: '0.9rem' }}>
            <div className="stat-card">
              <div className="stat-label">Veces jugado</div>
              <div className="stat-valor">{estadisticas.veces_jugado}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Gasto total</div>
              <div className="stat-valor">{precio(estadisticas.gasto_total)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Disciplina favorita</div>
              <div className="stat-valor-chico">{estadisticas.disciplina_favorita ?? '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Cancelaciones</div>
              <div className="stat-valor">{estadisticas.cancelaciones}</div>
            </div>
          </div>
        )}

        {/* ===== Próximos turnos + Historial (2 paneles) ===== */}
        {datos && (
          <div className="grilla-2-col">
            <section className="panel panel-con-altura" aria-labelledby="proximos-titulo">
              <div className="panel-header">
                <span className="panel-titulo" id="proximos-titulo">Próximos turnos</span>
                <Link to="/reservar" className="boton boton-ghost" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                  + Reservar
                </Link>
              </div>
              <div className="panel-body" style={datos.proximas.length === 0 ? { alignContent: 'center', height: '100%' } : undefined}>
                {datos.proximas.length === 0 ? (
                  <div className="panel-vacio">
                    <Calendar size={22} style={{ color: 'var(--primario-2)' }} />
                    <p style={{ margin: 0 }}>No tenés turnos próximos.</p>
                    <Link to="/reservar" className="boton boton-primario" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}>
                      Reservar uno
                    </Link>
                  </div>
                ) : (
                  datos.proximas.map((r) => <Tarjeta key={r.id} r={r} cancelable />)
                )}
              </div>
            </section>

            <section className="panel panel-con-altura" aria-labelledby="historial-titulo">
              <div className="panel-header">
                <span className="panel-titulo" id="historial-titulo">Historial</span>
                <span className="texto-debil">{datos.historial.length} turno{datos.historial.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="panel-body" style={datos.historial.length === 0 ? { alignContent: 'center', height: '100%' } : undefined}>
                {datos.historial.length === 0 ? (
                  <div className="panel-vacio">
                    <History size={22} style={{ color: 'var(--primario-2)' }} />
                    <p style={{ margin: 0 }}>Todavía no jugaste ningún turno.</p>
                  </div>
                ) : (
                  datos.historial.map((r) => <Tarjeta key={r.id} r={r} cancelable={false} />)
                )}
              </div>
            </section>
          </div>
        )}
      </main>
  );
}
