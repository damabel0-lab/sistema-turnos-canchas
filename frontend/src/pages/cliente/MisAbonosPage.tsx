import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Card, Badge } from '../../components/ui';
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
      <Card key={servicio}>
        <div className="fila" style={{ gap: '0.6rem', marginBottom: '0.5rem' }}>
          <span className="metrica-icono verde"><Icono size={19} /></span>
          <h2 className="titulo" style={{ fontSize: '1.05rem', margin: 0 }}>{nombre}</h2>
        </div>
        <p className="subtitulo" style={{ margin: '0 0 0.85rem', fontSize: '0.88rem' }}>
          Mensualidad, uso libre de horarios.
        </p>
        <div style={{ fontSize: '1.5rem', fontWeight: 850, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
          {precioMensual ? precio(precioMensual) : 'Consultar'}
          <span className="texto-debil" style={{ fontSize: '0.75rem', fontWeight: 600 }}> / mes</span>
        </div>
        {boton}
      </Card>
    );
  };

  const abonosVisibles = abonos.filter((a) => a.estado !== 'cancelado');

  return (
    <main className="pantalla" style={{ paddingTop: '1.25rem' }}>
      <div className="contenedor">
        <ToastContainer toasts={toasts} onCerrar={cerrar} />

        <div className="fila-entre" style={{ marginBottom: '1.1rem' }}>
          <div>
            <h1 className="titulo" style={{ marginBottom: '0.1rem' }}>Mis abonos</h1>
            <p className="subtitulo" style={{ margin: 0 }}>Mensualidades de gimnasio y pileta — uso libre.</p>
          </div>
          <button type="button" className="boton boton-outline" onClick={() => void cargar()}>
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>

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

        {/* Pedir mensualidad */}
        <h2 className="titulo" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', marginBottom: '0.5rem' }}>
          Pedir mensualidad
        </h2>
        <div className="metricas" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {renderSolicitudCard('gym', gymHabilitado, precioGym)}
          {renderSolicitudCard('pileta', piletaHabilitada, precioPileta)}
          {!gymHabilitado && !piletaHabilitada && !config && (
            <Card className="caja-vacia"><p className="texto-sec" style={{ margin: 0 }}>Cargando…</p></Card>
          )}
          {!gymHabilitado && !piletaHabilitada && config && (
            <Card className="caja-vacia"><p className="texto-sec" style={{ margin: 0 }}>El complejo no ofrece mensualidades por ahora.</p></Card>
          )}
        </div>

        {/* Tus mensualidades */}
        <h2 className="titulo" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', marginBottom: '0.5rem' }}>
          Tus mensualidades
        </h2>
        {abonosVisibles.length === 0 ? (
          <Card className="caja-vacia">
            <p className="texto-sec" style={{ margin: 0 }}>Todavía no tenés mensualidades.</p>
            <p className="texto-debil" style={{ marginTop: '0.5rem' }}>Pedí una arriba y pasá por recepción a confirmarla.</p>
          </Card>
        ) : (
          <div className="stack">
            {abonosVisibles.map((a) => {
              const Icono = iconoServicio(a.servicio);
              const nombre = nombreServicio(a.servicio);
              const activa = a.estado === 'activo';
              return (
                <div key={a.id} className="tarjeta-plana" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="icono-circulo" style={{ width: '2.5rem', height: '2.5rem', flexShrink: 0 }}>
                    <Icono size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{nombre ?? 'Mensualidad'}</div>
                    <div className="texto-sec" style={{ fontSize: '0.8rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CalendarDays size={12} /> Hasta {fechaCorta(a.fecha_vencimiento)}
                      </span>
                      {' · '}{precio(a.monto_pagado)}
                    </div>
                    {!activa && a.estado === 'solicitado' && (
                      <div className="texto-debil" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                        <Info size={12} /> Pendiente de pago — pasá por recepción a activarla
                      </div>
                    )}
                  </div>
                  <Badge variant={activa ? 'success' : 'warning'}>{activa ? 'Activa' : 'Pendiente'}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
