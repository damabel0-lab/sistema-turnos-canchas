import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/ui';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { Dumbbell, Waves, RefreshCw, Info, CalendarDays } from 'lucide-react';

type Servicio = 'gym' | 'pileta';

interface ConfigAbonos {
  amenidades?: {
    gym?: boolean;
    pileta?: boolean;
    precio_mensual_gym?: number | null;
    precio_mensual_pileta?: number | null;
  };
}

interface Abono {
  id: number;
  servicio: Servicio | null;
  clases_totales: number;
  clases_disponibles: number;
  fecha_inicio: string;
  fecha_vencimiento: string;
  monto_pagado: number;
  activo: boolean;
  estado: 'solicitado' | 'activo' | 'cancelado';
}

const nombreServicio = (s: Servicio | null) => (s === 'gym' ? 'Gimnasio' : s === 'pileta' ? 'Pileta' : null);
const iconoServicio = (s: Servicio | null) => (s === 'gym' ? Dumbbell : Waves);
const fechaCorta = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR');
const precio = (n: number) => `$${n.toLocaleString('es-AR')}`;

export function MisAbonosPage() {
  const { session } = useAuth();
  const { toasts, mostrar, cerrar } = useToast();

  const [config, setConfig] = useState<ConfigAbonos | null>(null);
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [solicitando, setSolicitando] = useState<Servicio | null>(null);

  const cargar = useCallback(async () => {
    if (!session) return;
    try {
      const [cfg, misAbonos] = await Promise.all([
        api<ConfigAbonos>('/config').catch(() => null),
        api<Abono[]>('/abonos/mis'),
      ]);
      setConfig(cfg);
      setAbonos(misAbonos);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando abonos');
    }
  }, [session]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function solicitar(servicio: Servicio) {
    setSolicitando(servicio);
    try {
      await api('/abonos/solicitud', {
        method: 'POST',
        body: JSON.stringify({ servicio }),
      });
      mostrar('Solicitud enviada. Acercate al mostrador a pagar y activar tu mensualidad.', 'success');
      await cargar();
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo enviar la solicitud', 'danger');
    } finally {
      setSolicitando(null);
    }
  }

  const gymHabilitado = config?.amenidades?.gym === true;
  const piletaHabilitada = config?.amenidades?.pileta === true;
  const precioGym = config?.amenidades?.precio_mensual_gym ?? null;
  const precioPileta = config?.amenidades?.precio_mensual_pileta ?? null;

  const abonoDe = (s: Servicio) => abonos.find((a) => a.servicio === s && a.estado !== 'cancelado');

  const renderSolicitudCard = (servicio: Servicio, habilitado: boolean, precioMensual: number | null) => {
    if (!habilitado) return null;
    const actual = abonoDe(servicio);
    const Icono = iconoServicio(servicio);
    const nombre = nombreServicio(servicio)!;
    const estado = actual?.estado;

    let boton = (
      <button
        type="button"
        className="boton boton-primario boton-block"
        disabled={solicitando === servicio}
        onClick={() => void solicitar(servicio)}
      >
        {solicitando === servicio ? 'Enviando…' : `Solicitar mensualidad ${precioMensual ? `· ${precio(precioMensual)}` : ''}`}
      </button>
    );
    if (estado === 'activo') {
      boton = <span className="badge badge-exito" style={{ width: '100%', justifyContent: 'center' }}>Activa hasta {fechaCorta(actual!.fecha_vencimiento)}</span>;
    } else if (estado === 'solicitado') {
      boton = <span className="badge badge-advertencia" style={{ width: '100%', justifyContent: 'center' }}>Solicitada · pasá por recepción</span>;
    }

    return (
      <div key={servicio} className="pedido-card">
        <div className="pedido-card-top">
          <span className="pedido-icono"><Icono size={22} /></span>
          <div>
            <div className="pedido-nombre">{nombre}</div>
            <div className="pedido-detalle">Mensualidad · uso libre</div>
          </div>
          <div className="pedido-precio">
            <div className="pedido-precio-valor">{precioMensual ? precio(precioMensual) : 'Consultar'}</div>
            <div className="pedido-precio-sub">por mes</div>
          </div>
        </div>
        {boton}
      </div>
    );
  };

  const abonosVisibles = abonos.filter((a) => a.estado !== 'cancelado');

  return (
    <main className="pagina-cliente">
      <ToastContainer toasts={toasts} onCerrar={cerrar} />

      {/* Encabezado unificado */}
      <header className="pagina-encabezado">
        <div>
          <span className="pagina-eyebrow">Mi cuenta · Mis abonos</span>
          <h1 className="pagina-titulo">Mis abonos</h1>
          <p className="pagina-sub">Mensualidades de gimnasio y pileta — uso libre, sin clases ni cupos.</p>
        </div>
        <button type="button" className="boton boton-outline" onClick={() => void cargar()}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </header>

      {error && (
        <div className="alerta-error" role="alert">
          {error}
          <div style={{ marginTop: '0.6rem' }}>
            <button type="button" className="boton boton-outline" onClick={() => void cargar()}>
              Reintentar
            </button>
          </div>
        </div>
      )}

      <div className="grilla-2-col" style={{ alignItems: 'start' }}>
        {/* ===== Columna 1: pedir mensualidad ===== */}
        <div className="stack">
          <span className="panel-titulo" style={{ padding: '0 0.15rem' }}>Pedir mensualidad</span>
          <div className="pedido-grid">
            {renderSolicitudCard('gym', gymHabilitado, precioGym)}
            {renderSolicitudCard('pileta', piletaHabilitada, precioPileta)}
            {!gymHabilitado && !piletaHabilitada && (
              <div className="panel-vacio" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radio-lg)' }}>
                {!config ? 'Cargando…' : 'El complejo no ofrece mensualidades por ahora.'}
              </div>
            )}
          </div>

          {/* ¿Cómo se activa? */}
          <div className="tarjeta-plana" style={{ padding: '0.8rem 0.95rem' }}>
            <div className="fila" style={{ gap: '0.45rem', marginBottom: '0.35rem' }}>
              <Info size={15} style={{ color: 'var(--primario-2)' }} />
              <span className="panel-titulo">¿Cómo se activa?</span>
            </div>
            <p className="texto-sec" style={{ margin: 0, fontSize: '0.83rem', lineHeight: 1.55 }}>
              Pedila desde acá → pasá por recepción y pagarla → te llega una <strong>notificación</strong> cuando esté activa.
              Desde ese momento tenés uso libre durante el mes.
            </p>
          </div>
        </div>

        {/* ===== Columna 2: tus mensualidades ===== */}
        <section className="panel panel-con-altura" aria-labelledby="mensualidades-titulo">
          <div className="panel-header">
            <span className="panel-titulo" id="mensualidades-titulo">Tus mensualidades</span>
            <span className="texto-debil">{abonosVisibles.length}</span>
          </div>
          <div className="panel-body" style={abonosVisibles.length === 0 ? { alignContent: 'center', height: '100%' } : undefined}>
            {abonosVisibles.length === 0 ? (
              <div className="panel-vacio">
                <CalendarDays size={22} style={{ color: 'var(--primario-2)' }} />
                <p style={{ margin: 0 }}>Todavía no tenés mensualidades.</p>
                <p className="texto-debil" style={{ margin: 0 }}>Pedí una a la izquierda y pasá por recepción a confirmarla.</p>
              </div>
            ) : (
              abonosVisibles.map((a) => {
                const Icono = iconoServicio(a.servicio);
                const nombre = nombreServicio(a.servicio);
                const activa = a.estado === 'activo';
                return (
                  <div key={a.id} className="item-turno">
                    <div className="item-turno-icono">
                      <Icono size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="item-turno-nombre">
                        {nombre ?? 'Mensualidad'}
                        <span className="texto-debil" style={{ fontWeight: 500 }}> · {precio(a.monto_pagado)}</span>
                      </div>
                      <div className="item-turno-meta">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CalendarDays size={12} /> Hasta {fechaCorta(a.fecha_vencimiento)}
                        </span>
                        {!activa && a.estado === 'solicitado' && ' · pendiente de pago en recepción'}
                      </div>
                    </div>
                    <Badge variant={activa ? 'success' : 'warning'}>{activa ? 'Activa' : 'Pendiente'}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
