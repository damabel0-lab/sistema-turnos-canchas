import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { isoLocal } from '../../lib/fecha';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { Card } from '../../components/ui';
import { CreditCard, Plus, Check, X, RefreshCw, Dumbbell, Waves } from 'lucide-react';

interface UsuarioSimple {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
}

interface Solicitud {
  id: number;
  usuario_id: string;
  servicio: 'gym' | 'pileta';
  monto_pagado: number;
  fecha_vencimiento: string;
  usuarios: { nombre: string; apellido: string | null; telefono: string | null } | null;
}

interface ConfigAmenidades {
  amenidades?: {
    gym?: boolean;
    pileta?: boolean;
    precio_mensual_gym?: number | null;
    precio_mensual_pileta?: number | null;
  };
}

const nombreServicio = (s: 'gym' | 'pileta') => (s === 'gym' ? 'Gimnasio' : 'Pileta');
const precio = (n: number) => `$${n.toLocaleString('es-AR')}`;
const unMesDesdeHoy = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return isoLocal(d);
};

export function VenderAbonoPage() {
  const { toasts, mostrar, cerrar } = useToast();

  const [socios, setSocios] = useState<UsuarioSimple[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [config, setConfig] = useState<ConfigAmenidades | null>(null);
  const [cargando, setCargando] = useState(true);

  const [servicio, setServicio] = useState<'gym' | 'pileta'>('gym');
  const [monto, setMonto] = useState('');
  const [vencimiento, setVencimiento] = useState(unMesDesdeHoy());
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [usuarioId, setUsuarioId] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [soc, sol, cfg] = await Promise.all([
        api<UsuarioSimple[]>('/socios').catch(() => [] as UsuarioSimple[]),
        api<Solicitud[]>('/abonos/solicitudes').catch(() => [] as Solicitud[]),
        api<ConfigAmenidades>('/config').catch(() => null),
      ]);
      setSocios(soc);
      setSolicitudes(sol);
      setConfig(cfg);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Prellenar precio desde la configuración al cambiar de servicio
  useEffect(() => {
    const am = config?.amenidades;
    if (!am) return;
    const p = servicio === 'gym' ? am.precio_mensual_gym : am.precio_mensual_pileta;
    if (p && p > 0) setMonto(String(p));
    else setMonto('');
  }, [servicio, config]);

  const gymHabilitado = config?.amenidades?.gym === true;
  const piletaHabilitado = config?.amenidades?.pileta === true;

  async function vender(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!usuarioId) return;
    try {
      await api('/abonos', {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: usuarioId,
          servicio,
          metodo_pago: metodoPago,
          monto_pagado: monto ? Number(monto) : undefined,
          fecha_vencimiento: vencimiento || undefined,
        }),
      });
      mostrar(`Mensualidad de ${nombreServicio(servicio)} vendida y registrada en caja.`, 'success');
      setUsuarioId('');
      await cargar();
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo vender', 'danger');
    }
  }

  const [aprobando, setAprobando] = useState<number | null>(null);
  const [metodosPorSolicitud, setMetodosPorSolicitud] = useState<Record<number, string>>({});

  async function aprobar(sol: Solicitud) {
    setAprobando(sol.id);
    try {
      const metodo = metodosPorSolicitud[sol.id] ?? 'efectivo';
      await api(`/abonos/solicitudes/${sol.id}/aprobar`, {
        method: 'POST',
        body: JSON.stringify({ metodo_pago: metodo }),
      });
      mostrar(`Mensualidad de ${nombreServicio(sol.servicio)} activada.`, 'success');
      await cargar();
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo activar', 'danger');
    } finally {
      setAprobando(null);
    }
  }

  async function rechazar(sol: Solicitud) {
    setAprobando(sol.id);
    try {
      await api(`/abonos/solicitudes/${sol.id}/rechazar`, { method: 'POST' });
      mostrar('Solicitud rechazada.', 'success');
      await cargar();
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo rechazar', 'danger');
    } finally {
      setAprobando(null);
    }
  }

  return (
    <div className="admin-page">
      <div className="contenedor-ancho">
        <ToastContainer toasts={toasts} onCerrar={cerrar} />

        <div className="fila-entre" style={{ marginBottom: '1.1rem' }}>
          <h1 className="titulo" style={{ marginBottom: 0 }}>
            <span className="fila"><CreditCard size={20} /> Mensualidades — Gym y Pileta</span>
          </h1>
          <button type="button" className="boton boton-outline" onClick={() => void cargar()} disabled={cargando}>
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>

        {/* ===== Solicitudes pendientes ===== */}
        {solicitudes.length > 0 && (
          <>
            <h2 className="titulo" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', marginBottom: '0.5rem' }}>
              Solicitudes pendientes ({solicitudes.length})
            </h2>
            <div className="tarjeta-plana" style={{ padding: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="stack" style={{ gap: '0.5rem' }}>
                {solicitudes.map((sol) => {
                  const Icono = sol.servicio === 'gym' ? Dumbbell : Waves;
                  return (
                    <div key={sol.id} className="fila-entre" style={{ padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radio)', gap: '0.75rem' }}>
                      <div className="fila" style={{ gap: '0.6rem', minWidth: 0 }}>
                        <span className="proximo-icono"><Icono size={18} /></span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700 }}>
                            {sol.usuarios ? `${sol.usuarios.nombre} ${sol.usuarios.apellido}` : 'Cliente'} — {nombreServicio(sol.servicio)}
                          </div>
                          <div className="texto-sec" style={{ fontSize: '0.8rem' }}>
                            {sol.usuarios?.telefono ?? 'sin teléfono'} · {precio(Number(sol.monto_pagado))}
                          </div>
                        </div>
                      </div>
                      <div className="fila" style={{ gap: '0.4rem' }}>
                        <select
                          className="input"
                          style={{ width: 'auto', fontSize: '0.82rem', padding: '0.35rem 0.5rem' }}
                          value={metodosPorSolicitud[sol.id] ?? 'efectivo'}
                          onChange={(e) => setMetodosPorSolicitud({ ...metodosPorSolicitud, [sol.id]: e.target.value })}
                          aria-label="Método de pago"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="debito">Débito</option>
                          <option value="credito">Crédito</option>
                          <option value="qr">QR</option>
                        </select>
                        <button type="button" className="boton boton-primario" disabled={aprobando === sol.id} onClick={() => void aprobar(sol)}>
                          <Check size={15} /> Activar
                        </button>
                        <button type="button" className="boton boton-outline" style={{ color: 'var(--peligro)' }} disabled={aprobando === sol.id} onClick={() => void rechazar(sol)}>
                          <X size={15} /> Rechazar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ===== Venta directa en mostrador ===== */}
        <h2 className="titulo" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', marginBottom: '0.5rem' }}>
          Vender mensualidad (mostrador)
        </h2>
        <Card>
          <form onSubmit={vender} className="stack">
            <label className="label">Socio / cliente
              <select required value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} className="input">
                <option value="">Elegir…</option>
                {socios.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} {u.apellido} ({u.telefono})</option>
                ))}
              </select>
            </label>

            <label className="label">Servicio
              <select required value={servicio} onChange={(e) => setServicio(e.target.value as 'gym' | 'pileta')} className="input">
                {gymHabilitado && <option value="gym">Gimnasio {config?.amenidades?.precio_mensual_gym ? `· ${precio(config.amenidades.precio_mensual_gym)} / mes` : ''}</option>}
                {piletaHabilitado && <option value="pileta">Pileta {config?.amenidades?.precio_mensual_pileta ? `· ${precio(config.amenidades.precio_mensual_pileta)} / mes` : ''}</option>}
                {!gymHabilitado && !piletaHabilitado && <option value="gym">Activá gym o pileta en Configuración</option>}
              </select>
            </label>

            <div className="grid-2" style={{ gap: '0.75rem' }}>
              <label className="label">Monto cobrado ($)
                <input required type="number" min={0} step="1" value={monto} onChange={(e) => setMonto(e.target.value)} className="input" placeholder="0" />
              </label>
              <label className="label">Método de pago
                <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="input">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                  <option value="qr">QR</option>
                </select>
              </label>
            </div>

            <label className="label">Vence (por defecto, 1 mes desde hoy)
              <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} className="input" />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="boton boton-primario" disabled={!gymHabilitado && !piletaHabilitado}>
                <Plus size={16} /> Vender mensualidad
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
