import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  Goal,
  BadgeDollarSign,
  Ticket,
  Wallet,
  XCircle,
  CloudRain,
  Clock,
  CheckCircle2,
  Bell,
  Trash2,
  RefreshCw,
  Filter,
  type LucideIcon,
} from 'lucide-react';

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  leida: boolean;
  creado_en: string;
}

type GrupoFecha = 'hoy' | 'ayer' | 'semana' | 'viejas';

const GrupoFechas: { id: GrupoFecha; titulo: string }[] = [
  { id: 'hoy', titulo: 'Hoy' },
  { id: 'ayer', titulo: 'Ayer' },
  { id: 'semana', titulo: 'Esta semana' },
  { id: 'viejas', titulo: 'Más viejas' },
];

function bucketDe(iso: string): GrupoFecha {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'viejas';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dia = new Date(d);
  dia.setHours(0, 0, 0, 0);
  const diff = Math.floor((hoy.getTime() - dia.getTime()) / (24 * 3600 * 1000));
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'ayer';
  if (diff <= 7) return 'semana';
  return 'viejas';
}
function tiempoDesde(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'recién';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `hace ${mins} min`;
  const hs = Math.floor(mins / 60);
  if (hs < 24) return `hace ${hs} h`;
  const dias = Math.floor(hs / 24);
  if (dias === 1) return `ayer · ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
  return `hace ${dias} d · ${d.toLocaleString('es-AR', { day: '2-digit', month: 'short' })}`;
}

const TIPO_CONFIG: Record<string, { icon: LucideIcon; label: string; clase: string }> = {
  reserva: { icon: Goal, label: 'Reservas', clase: 'notif-tipo-reserva' },
  pago: { icon: BadgeDollarSign, label: 'Pagos', clase: 'notif-tipo-pago' },
  abono: { icon: Ticket, label: 'Abonos', clase: 'notif-tipo-abono' },
  caja: { icon: Wallet, label: 'Caja', clase: 'notif-tipo-caja' },
  cancelacion: { icon: XCircle, label: 'Cancelaciones', clase: 'notif-tipo-cancelar' },
  recordatorio: { icon: Clock, label: 'Recordatorios', clase: 'notif-tipo-recordar' },
  suspension: { icon: CloudRain, label: 'Suspensiones', clase: 'notif-tipo-alerta' },
  default: { icon: Bell, label: 'Otras', clase: 'notif-tipo-otras' },
};

export function NotificacionesPage() {
  const { session } = useAuth();
  const { toasts, mostrar, cerrar } = useToast();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string>('todas');
  const [armarLimpiar, setArmarLimpiar] = useState(false);

  const cargar = useCallback(async () => {
    if (!session) return;
    setCargando(true);
    try {
      setNotificaciones(await api<Notificacion[]>('/notificaciones'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando notificaciones');
    } finally {
      setCargando(false);
    }
  }, [session]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function leer(id: string) {
    // Optimistic
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    try {
      await api(`/notificaciones/${id}/leer`, { method: 'PATCH' });
    } catch {
      /* si falla, recargamos */
      await cargar();
    }
  }

  async function borrarUna(id: string) {
    try {
      await api(`/notificaciones/${id}`, { method: 'DELETE' });
      setNotificaciones((prev) => prev.filter((n) => n.id !== id));
      mostrar('Notificación eliminada.', 'success');
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo borrar', 'danger');
    }
  }

  async function marcarTodas() {
    try {
      await api('/notificaciones/leer-todas', { method: 'PATCH' });
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      mostrar('Todas marcadas como leídas.', 'success');
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo marcar todo', 'danger');
    }
  }

  async function limpiarTodas() {
    try {
      await api('/notificaciones', { method: 'DELETE' });
      setNotificaciones([]);
      setArmarLimpiar(false);
      mostrar('Historial borrado.', 'success');
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo borrar', 'danger');
    }
  }

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const contadorPorTipo = useMemo(() => {
    const map = new Map<string, { total: number; sinLeer: number }>();
    for (const n of notificaciones) {
      const k = TIPO_CONFIG[n.tipo] ? n.tipo : 'default';
      const acc = map.get(k) ?? { total: 0, sinLeer: 0 };
      acc.total += 1;
      if (!n.leida) acc.sinLeer += 1;
      map.set(k, acc);
    }
    return [...map.entries()].map(([k, v]) => ({ tipo: k, ...v, label: TIPO_CONFIG[k]?.label ?? k }));
  }, [notificaciones]);

  const filtroActivo = filtroTipo !== 'todas' ? filtroTipo : null;
  const filtradas = filtroActivo
    ? notificaciones.filter((n) => (TIPO_CONFIG[n.tipo] ? n.tipo : 'default') === filtroActivo)
    : notificaciones;

  const agrupadas = useMemo(() => {
    const map = new Map<GrupoFecha, Notificacion[]>();
    for (const n of filtradas) {
      const g = bucketDe(n.creado_en);
      const arr = map.get(g) ?? [];
      arr.push(n);
      map.set(g, arr);
    }
    return GrupoFechas.map((g) => ({ ...g, items: map.get(g.id) ?? [] }));
  }, [filtradas]);

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

  return (
    <main className="pantalla notif-pantalla">
      <div className="contenedor-ancho" style={{ maxWidth: '1200px' }}>
        <ToastContainer toasts={toasts} onCerrar={cerrar} />
        <ConfirmDialog
          open={armarLimpiar}
          titulo="Borrar todo el historial"
          descripcion="Se eliminarán TODAS tus notificaciones. Esta acción es irreversible. ¿Continuás?"
          confirmarTexto="Borrar todo"
          onConfirmar={() => void limpiarTodas()}
          onCancelar={() => setArmarLimpiar(false)}
          peligro
        />

        <header className="pagina-encabezado">
          <div>
            <span className="pagina-eyebrow">Mi cuenta · Notificaciones</span>
            <h1 className="pagina-titulo">Notificaciones</h1>
            <p className="pagina-sub">Reservas, pagos, abonos y eventos del complejo — todo en un solo lugar.</p>
          </div>
          <div className="fila" style={{ gap: '0.5rem' }}>
            <button type="button" className="boton boton-outline" onClick={() => void cargar()} disabled={cargando} aria-label="Refrescar">
              <RefreshCw size={15} /> Actualizar
            </button>
            {notificaciones.length > 0 && (
              <>
                <button type="button" className="boton boton-outline" onClick={() => void marcarTodas()}>
                  <CheckCircle2 size={15} /> Marcar todas leídas
                </button>
                <button type="button" className="boton boton-ghost" style={{ color: 'var(--peligro)' }} onClick={() => setArmarLimpiar(true)}>
                  <Trash2 size={15} /> Limpiar
                </button>
              </>
            )}
          </div>
        </header>

        {error && (
          <div className="alerta-error" role="alert">
            {error}
            <div style={{ marginTop: '0.5rem' }}>
              <button type="button" className="boton boton-outline" onClick={() => void cargar()}>
                Reintentar
              </button>
            </div>
          </div>
        )}

        {cargando && notificaciones.length === 0 ? (
          <div className="stack">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: '4.5rem' }} />)}</div>
        ) : notificaciones.length === 0 ? (
          <Card className="caja-vacia">
            <Bell size={28} style={{ color: 'var(--texto-3)', margin: '0 auto 0.75rem', display: 'block' }} />
            <h3 style={{ margin: '0 0 0.25rem' }}>Todo en paz por acá</h3>
            <p className="texto-sec">Te avisaremos cuando se confirmen turnos, pagos o abonos.</p>
          </Card>
        ) : (
          <div className="notif-layout">
            {/* ===== Rail izquierdo: filtros ===== */}
            <aside className="notif-rail" aria-label="Filtrar por tipo">
              <div className="notif-rail-header">
                <Filter size={14} /> <span>Filtrar</span>
                {noLeidas > 0 && <span className="notif-rail-badge">{noLeidas} sin leer</span>}
              </div>
              <button type="button" className={`notif-rail-item${filtroActivo === null ? ' activo' : ''}`} onClick={() => setFiltroTipo('todas')}>
                <Bell size={14} /> Todas <span className="notif-rail-count">{notificaciones.length}</span>
              </button>
              {contadorPorTipo.map(({ tipo, label, total, sinLeer }) => {
                const cfg = TIPO_CONFIG[tipo] ?? TIPO_CONFIG.default;
                const Icono = cfg.icon;
                return (
                  <button
                    key={tipo}
                    type="button"
                    className={`notif-rail-item${filtroActivo === tipo ? ' activo' : ''}`}
                    onClick={() => setFiltroTipo(tipo === filtroActivo ? 'todas' : tipo)}
                  >
                    <Icono size={14} /> {label}
                    <span className="notif-rail-count">{total}{sinLeer > 0 ? ` · ${sinLeer}` : ''}</span>
                  </button>
                );
              })}
            </aside>

            {/* ===== Lista principal, agrupada por fecha ===== */}
            <div className="notif-lista">
              {agrupadas.map((g) =>
                g.items.length > 0 ? (
                  <section key={g.id} className="notif-grupo" aria-label={`Del ${g.titulo}`}>
                    <header className="notif-grupo-titulo">{g.titulo}<span className="notif-grupo-count">{g.items.length}</span></header>
                    <div className="stack" style={{ gap: '0.4rem' }}>
                      {g.items.map((n) => {
                        const cfg = TIPO_CONFIG[n.tipo] ?? TIPO_CONFIG.default;
                        const Icono = cfg.icon;
                        return (
                          <div key={n.id} className={`notif-item ${cfg.clase}${n.leida ? ' leida' : ''}`} onClick={() => void leer(n.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && void leer(n.id)}>
                            <span className="notif-icono"><Icono size={18} /></span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div className="fila-entre" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
                                <div className="notif-titulo">{n.titulo}</div>
                                {!n.leida && <span className="notif-punto" aria-label="Sin leer" />}
                              </div>
                              <p className="notif-cuerpo">{n.cuerpo}</p>
                              <div className="notif-meta">{tiempoDesde(n.creado_en)}</div>
                            </div>
                            <button
                              type="button"
                              className="notif-borrar"
                              onClick={(e) => { e.stopPropagation(); void borrarUna(n.id); }}
                              aria-label="Borrar notificación"
                              title="Borrar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null,
              )}
              {filtradas.length === 0 && (<p className="texto-sec" style={{ padding: '1rem' }}>Nada por acá con ese filtro.</p>)}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
