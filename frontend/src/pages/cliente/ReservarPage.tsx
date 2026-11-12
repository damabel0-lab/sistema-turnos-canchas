import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { hoyISOLocal } from '../../lib/fecha';
import { useAuth } from '../../hooks/useAuth';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { Card, Button, Input } from '../../components/ui';
import { MapPin, Loader2, CheckCircle2 } from 'lucide-react';

interface Deporte {
  id: number;
  nombre: string;
  tipo: string;
  requiere_cancha: boolean;
}

interface Cancha {
  id: number;
  nombre: string;
  deporte_id: number | null;
  precio_base: number;
  activa: boolean;
  caracteristicas?: string | null;
  deportes?: { nombre: string; tipo: string } | null;
}

interface EstadoHora {
  hora: string;
  estado: 'libre' | 'ocupada' | 'bloqueada';
}

interface Cotizacion {
  precio_total: number;
  monto_seña: number;
  descuento_socio: number;
  descuento_turno_fijo: number;
}

const hoy = () => hoyISOLocal();

/** '20:15' + 1h -> '21:15' */
function sumarUnaHora(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + 60;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function ReservarPage() {
  const { session } = useAuth();
  const { toasts, mostrar, cerrar } = useToast();

  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [deporteId, setDeporteId] = useState<number | null>(null);
  const [canchaId, setCancaId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(hoy());
  const [horas, setHoras] = useState<EstadoHora[]>([]);
  const [horaSel, setHoraSel] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [confirmada, setConfirmada] = useState<{ id: number } | null>(null);

  const canchasDelDeporte = canchas.filter((c) => c.activa && c.deporte_id === deporteId);

  useEffect(() => {
    api<Deporte[]>('/deportes').then(setDeportes).catch((e) => setError(e.message));
    api<Cancha[]>('/canchas').then(setCanchas).catch((e) => setError(e.message));
  }, []);

  /** true si el turno ya empezó (solo aplica cuando la fecha es hoy) */
  const turnoYaPaso = (hora: string): boolean => {
    if (fecha !== hoy()) return false;
    const ahora = new Date();
    const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m <= ahoraMin;
  };

  // Cargar disponibilidad cuando cambia cancha o fecha
  useEffect(() => {
    setHoraSel(null);
    setCotizacion(null);
    if (!canchaId) {
      setHoras([]);
      return;
    }
    api<EstadoHora[]>(`/reservas/disponibilidad?cancha_id=${canchaId}&fecha=${fecha}`)
      .then(setHoras)
      .catch((e) => setError(e.message));
  }, [canchaId, fecha]);

  // Cotizar al elegir hora (turno de exactamente 60 minutos)
  useEffect(() => {
    setCotizacion(null);
    if (!canchaId || !horaSel) return;

    const [h, m] = horaSel.split(':').map(Number);
    const base = new Date();
    base.setHours(h, m, 0, 0);
    const finDate = new Date(base.getTime() + 60 * 60 * 1000);
    const fin = `${String(finDate.getHours()).padStart(2, '0')}:${String(finDate.getMinutes()).padStart(2, '0')}`;

    api<Cotizacion>('/canchas/cotizar', {
      method: 'POST',
      body: JSON.stringify({
        cancha_id: canchaId,
        fecha,
        hora_inicio: horaSel,
        hora_fin: fin,
        usuario_id: session?.user.id ?? null,
      }),
    })
      .then(setCotizacion)
      .catch((e) => setError(e.message));
  }, [canchaId, horaSel, fecha, session?.user.id]);

  async function confirmar() {
    if (!canchaId || !horaSel || !cotizacion) return;
    setCreando(true);
    setError(null);
    try {
      const [h, m] = horaSel.split(':').map(Number);
      const base = new Date();
      base.setHours(h, m, 0, 0);
      const finDate = new Date(base.getTime() + 60 * 60 * 1000);
      const fin = `${String(finDate.getHours()).padStart(2, '0')}:${String(finDate.getMinutes()).padStart(2, '0')}`;
      const reserva = await api<{ id: number }>('/reservas', {
        method: 'POST',
        body: JSON.stringify({
          cancha_id: canchaId,
          fecha,
          hora_inicio: horaSel,
          hora_fin: fin,
          precio_total: cotizacion.precio_total,
          monto_seña: cotizacion.monto_seña,
          metodo_pago: cotizacion.monto_seña > 0 ? null : 'efectivo',
          estado: cotizacion.monto_seña > 0 ? 'pendiente_seña' : 'confirmada',
        }),
      });
      setConfirmada(reserva);
      setHoras((prev) =>
        prev.map((h) => (h.hora === horaSel ? { ...h, estado: 'ocupada' as const } : h))
      );
      mostrar('¡Reserva confirmada!', 'success');
      setHoraSel(null);
      setCotizacion(null);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo crear la reserva';
      const esOcupada = /reservado|ocupada|bloquead/i.test(mensaje);
      setError(mensaje);
      if (esOcupada) {
        mostrar('Ese horario ya fue reservado o bloqueado. Elegí otro horario.', 'danger');
        setHoraSel(null);
        setCotizacion(null);
      }
      // Refrescar la grilla: marcar slots tomados correctamente aunque la página estuviera vieja
      if (canchaId) {
        api<EstadoHora[]>(`/reservas/disponibilidad?cancha_id=${canchaId}&fecha=${fecha}`)
          .then(setHoras)
          .catch(() => {});
      }
    } finally {
      setCreando(false);
    }
  }

  const deporteSel = deportes.find((d) => d.id === deporteId);
  const canchaSel = canchas.find((c) => c.id === canchaId);
  const fechaLegible = new Date(`${fecha}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main className="pagina-cliente">
      <ToastContainer toasts={toasts} onCerrar={cerrar} />
      {/* Encabezado unificado */}
      <header className="pagina-encabezado">
        <div>
          <span className="pagina-eyebrow">Mi cuenta · Reservar</span>
          <h1 className="pagina-titulo">Reservá tu cancha</h1>
          <p className="pagina-sub">Disciplina, cancha y horario — todo en un solo vistazo.</p>
        </div>
      </header>

      {error && <div className="alerta-error" role="alert">{error}</div>}

      {confirmada ? (
        <Card className="caja-vacia">
          <div className="icono-circulo" style={{ margin: '0 auto 0.75rem' }}>
            <CheckCircle2 size={28} />
          </div>
          <h3 style={{ margin: '0 0 0.25rem' }}>¡Reserva #{confirmada.id} confirmada!</h3>
          <p className="texto-sec">
            {canchaSel ? `${canchaSel.nombre} · ` : ''}Si la reserva tiene seña, abonala en el complejo para dejarla confirmada.
          </p>
          <div className="fila" style={{ justifyContent: 'center', marginTop: '0.85rem' }}>
            <Link to="/mis-reservas" className="boton boton-primario">
              Ver mis reservas
            </Link>
            <button type="button" className="boton boton-outline" onClick={() => setConfirmada(null)}>
              Hacer otra reserva
            </button>
          </div>
        </Card>
      ) : (
        <div className="grilla-reserva">
          {/* ===== Columna de contenido: disciplina/cancha + fecha ===== */}
          <div className="stack">
            <div className="grilla-2-eq">
              <Card className="paso-card">
                <div className="paso-header">
                  <span className="paso-num">1</span>
                  <h2 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>Disciplina</h2>
                </div>
                <div className="fila" style={{ gap: '0.45rem' }}>
                  {deportes.length === 0 && <p className="texto-debil">Cargando disciplinas…</p>}
                  {deportes.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`opcion-chip${deporteId === d.id ? ' activo' : ''}`}
                      onClick={() => {
                        setDeporteId(d.id);
                        setCancaId(null);
                      }}
                    >
                      {d.nombre}
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="paso-card">
                <div className="paso-header">
                  <span className="paso-num">2</span>
                  <h2 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>Cancha</h2>
                </div>
                {!deporteId ? (
                  <p className="texto-debil">Elegí una disciplina para ver sus canchas disponibles.</p>
                ) : canchasDelDeporte.length === 0 ? (
                  <p className="texto-sec">No hay canchas activas para esta disciplina.</p>
                ) : (
                  <div className="stack" style={{ gap: '0.5rem' }}>
                    {canchasDelDeporte.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`cancha-opcion${canchaId === c.id ? ' activo' : ''}`}
                        onClick={() => setCancaId(c.id)}
                        aria-pressed={canchaId === c.id}
                      >
                        <span className="cancha-opcion-icono"><MapPin size={16} /></span>
                        <span className="cancha-opcion-info">
                          <span className="cancha-opcion-nombre">{c.nombre}</span>
                          {c.caracteristicas && <span className="cancha-opcion-meta">{c.caracteristicas}</span>}
                        </span>
                        <span className="cancha-opcion-precio">
                          ${c.precio_base}
                          <small>/h</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* ===== Columna 2: Fecha y horario ===== */}
            <Card className="paso-card paso-card-fecha">
              <div className="paso-header">
                <span className="paso-num">3</span>
                <h2 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>Fecha y horario</h2>
                <span className="texto-debil" style={{ marginLeft: 'auto' }}>turnos de 1 h · :15 a :15</span>
              </div>

              <div className="fila-entre" style={{ marginBottom: '0.75rem', gap: '0.75rem' }}>
                <div style={{ flex: '1 1 180px' }}>
                  <label className="label" htmlFor="fecha-reserva">Fecha</label>
                  <Input
                    id="fecha-reserva"
                    type="date"
                    value={fecha}
                    min={hoy()}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </div>
                <div className="leyenda">
                  <span className="leyenda-item"><span className="leyenda-punto libre" /> Libre</span>
                  <span className="leyenda-item"><span className="leyenda-punto ocupado" /> Ocupada</span>
                  <span className="leyenda-item"><span className="leyenda-punto pasado" /> Pasado</span>
                </div>
              </div>

              {!canchaId ? (
                <p className="texto-debil">Elegí una cancha para ver los horarios disponibles.</p>
              ) : (
                <div className="slots-grid">
                  {horas.map((h) => {
                    const pasado = turnoYaPaso(h.hora);
                    const libre = h.estado === 'libre' && !pasado;
                    const seleccionado = horaSel === h.hora;
                    const estadoClase = seleccionado
                      ? 'slot-seleccionado'
                      : libre
                        ? 'slot-libre'
                        : pasado
                          ? 'slot-pasado'
                          : h.estado === 'bloqueada'
                            ? 'slot-bloqueado'
                            : 'slot-ocupado';
                    return (
                      <button
                        key={h.hora}
                        type="button"
                        disabled={!libre}
                        onClick={() => setHoraSel(h.hora)}
                        aria-pressed={seleccionado}
                        title={
                          pasado
                            ? 'Ese turno ya pasó'
                            : libre
                              ? `${h.hora} a ${sumarUnaHora(h.hora)}`
                              : h.estado === 'ocupada'
                                ? 'Ocupada'
                                : 'Bloqueada'
                        }
                        className={`slot ${estadoClase}`}
                      >
                        <span className="slot-hora">{h.hora}</span>
                        <span className="slot-fin">a {sumarUnaHora(h.hora)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* ===== Resumen (rail sticky) ===== */}
          <aside className="reserva-rail">
              <Card className="resumen-card">
                <div className="paso-header" style={{ marginBottom: '0.85rem' }}>
                  <h2 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>Resumen</h2>
                </div>

                <dl className="resumen-lista">
                  <div>
                    <dt>Disciplina</dt>
                    <dd>{deporteSel?.nombre ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Cancha</dt>
                    <dd>{canchaSel?.nombre ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Fecha</dt>
                    <dd style={{ textTransform: 'capitalize' }}>{fechaLegible}</dd>
                  </div>
                  <div>
                    <dt>Horario</dt>
                    <dd>{horaSel ? `${horaSel} – ${sumarUnaHora(horaSel)} (1 h)` : '—'}</dd>
                  </div>
                </dl>

                <div className="divider" />

                {cotizacion ? (
                  <>
                    {cotizacion.descuento_socio > 0 && (
                      <div className="resumen-fila-desc">Descuento socio <span>-${cotizacion.descuento_socio}</span></div>
                    )}
                    {cotizacion.descuento_turno_fijo > 0 && (
                      <div className="resumen-fila-desc">Descuento turno fijo <span>-${cotizacion.descuento_turno_fijo}</span></div>
                    )}
                    {cotizacion.monto_seña > 0 && (
                      <div className="resumen-fila-senia">Seña a pagar en el complejo <span>${cotizacion.monto_seña}</span></div>
                    )}
                    <div className="resumen-total">
                      <span>Total</span>
                      <span>${cotizacion.precio_total}</span>
                    </div>
                  </>
                ) : (
                  <p className="texto-debil" style={{ margin: '0.25rem 0 0.75rem' }}>
                    El total aparece cuando elegís un horario.
                  </p>
                )}

                <div className="resumen-cta">
                  <Button
                    variant="primary"
                    disabled={!session || creando || !canchaId || !horaSel || !cotizacion}
                    onClick={confirmar}
                    className="boton-block"
                  >
                    {creando ? (
                      <><Loader2 size={16} /> Creando…</>
                    ) : !session ? (
                      'Iniciá sesión para reservar'
                    ) : cotizacion && cotizacion.monto_seña > 0 ? (
                      `Reservar y señar $${cotizacion.monto_seña}`
                    ) : (
                      'Confirmar reserva'
                    )}
                  </Button>
                  <p className="texto-debil" style={{ textAlign: 'center', margin: 0 }}>
                    Cancelación sin cargo hasta 2 h antes del turno
                  </p>
                </div>
              </Card>
            </aside>
        </div>
      )}
    </main>
  );
}
