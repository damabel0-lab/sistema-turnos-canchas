import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Input } from '../../components/ui';
import { Calendar, Clock, MapPin, Loader2 } from 'lucide-react';

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

const hoy = () => new Date().toISOString().slice(0, 10);

/** '20:15' + 1h -> '21:15' */
function sumarUnaHora(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + 60;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function ReservarPage() {
  const { session } = useAuth();

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
      setHoraSel(null);
      setCotizacion(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la reserva');
      if (canchaId) {
        api<EstadoHora[]>(`/reservas/disponibilidad?cancha_id=${canchaId}&fecha=${fecha}`)
          .then(setHoras)
          .catch(() => {});
      }
    } finally {
      setCreando(false);
    }
  }

  return (
    <main className="pantalla">
      <div className="contenedor-estrecho">
        <h1 className="titulo">Reservar</h1>
        {error && <p style={{ color: '#dc2626', marginBottom: '1rem' }}>{error}</p>}

        {confirmada && (
          <Card className="caja-vacia">
            <div className="icono-circulo" style={{ margin: '0 auto 0.75rem' }}>
              <Clock size={28} />
            </div>
            <h3 style={{ margin: '0 0 0.25rem' }}>Reserva #{confirmada.id} creada ✅</h3>
            <p className="texto-sec">Si tiene seña, abonala en el complejo para confirmarla.</p>
            <Link to="/mis-reservas" className="boton boton-outline" style={{ marginTop: '0.75rem' }}>
              Ver mis reservas
            </Link>
          </Card>
        )}

        {!confirmada && (
          <div className="stack">
            {/* Paso 1: disciplina */}
            <Card>
              <h2 className="titulo" style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                <span className="fila"><Calendar size={18} /> 1. ¿Qué querés jugar?</span>
              </h2>
              <div className="fila">
                {deportes.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDeporteId(d.id);
                      setCancaId(null);
                    }}
                    className="boton"
                    style={{
                      background: deporteId === d.id ? '#4f46e5' : '#f3f4f6',
                      color: deporteId === d.id ? '#ffffff' : '#374151',
                    }}
                  >
                    {d.nombre}
                  </button>
                ))}
              </div>
            </Card>

            {/* Paso 2: cancha */}
            {deporteId && (
              <Card>
                <h2 className="titulo" style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                  <span className="fila"><MapPin size={18} /> 2. Elegí la cancha</span>
                </h2>
                {canchasDelDeporte.length === 0 ? (
                  <p className="texto-sec">No hay canchas activas para esta disciplina.</p>
                ) : (
                  <div className="fila">
                    {canchasDelDeporte.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCancaId(c.id)}
                        className="boton"
                        style={{
                          background: canchaId === c.id ? '#4f46e5' : '#f3f4f6',
                          color: canchaId === c.id ? '#ffffff' : '#374151',
                        }}
                      >
                        {c.nombre} · ${c.precio_base}/h
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Paso 3: fecha y horario */}
            {canchaId && (
              <Card>
                <h2 className="titulo" style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                  <span className="fila"><Clock size={18} /> 3. Fecha y horario</span>
                </h2>
                <label className="label">Fecha</label>
                <Input
                  type="date"
                  value={fecha}
                  min={hoy()}
                  onChange={(e) => setFecha(e.target.value)}
                  style={{ marginBottom: '0.75rem' }}
                />
                <p className="texto-sec" style={{ fontSize: '0.8rem', margin: '0 0 0.5rem' }}>
                  Los turnos son fijos y duran exactamente 1 hora (de :15 a :15).
                </p>
                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: '0.4rem' }}
                >
                  {horas.map((h) => {
                    const pasado = turnoYaPaso(h.hora);
                    const libre = h.estado === 'libre' && !pasado;
                    const seleccionado = horaSel === h.hora;
                    let fondo = '#e5e7eb';
                    let texto = '#6b7280';
                    if (libre) {
                      fondo = seleccionado ? '#4f46e5' : '#d1fae5';
                      texto = seleccionado ? '#ffffff' : '#065f46';
                    }
                    return (
                      <button
                        key={h.hora}
                        type="button"
                        disabled={!libre}
                        onClick={() => setHoraSel(h.hora)}
                        title={pasado ? 'Ese turno ya pasó' : h.estado === 'libre' ? `${h.hora} a ${sumarUnaHora(h.hora)}` : h.estado === 'ocupada' ? 'Ocupada' : 'Bloqueada'}
                        style={{
                          padding: '0.45rem 0.25rem',
                          border: 'none',
                          borderRadius: '0.6rem',
                          background: fondo,
                          color: texto,
                          cursor: libre ? 'pointer' : 'not-allowed',
                          fontWeight: 600,
                          lineHeight: 1.15,
                        }}
                      >
                        <span style={{ display: 'block', fontSize: '0.82rem' }}>{h.hora}</span>
                        <span style={{ display: 'block', fontSize: '0.66rem', opacity: 0.85 }}>a {sumarUnaHora(h.hora)}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Resumen */}
            {cotizacion && horaSel && (
              <Card>
                <h2 className="titulo" style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                  Resumen
                </h2>
                <p className="texto-sec">
                  <strong>{fecha}</strong> · <strong>{horaSel}–{sumarUnaHora(horaSel)}</strong> (1 hora)
                </p>
                {cotizacion.descuento_socio > 0 && (
                  <p className="texto-sec" style={{ color: '#065f46' }}>
                    Descuento socio: -${cotizacion.descuento_socio}
                  </p>
                )}
                {cotizacion.descuento_turno_fijo > 0 && (
                  <p className="texto-sec" style={{ color: '#065f46' }}>
                    Descuento turno fijo: -${cotizacion.descuento_turno_fijo}
                  </p>
                )}
                <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Total: ${cotizacion.precio_total}
                </p>
                {cotizacion.monto_seña > 0 && (
                  <p className="texto-sec" style={{ color: '#92400e' }}>
                    Seña a pagar ahora: ${cotizacion.monto_seña}
                  </p>
                )}
                <Button
                  variant="primary"
                  disabled={!session || creando}
                  onClick={confirmar}
                  className="boton-block"
                  style={{ marginTop: '0.75rem' }}
                >
                  {creando ? (
                    <><Loader2 size={16} /> Creando…</>
                  ) : session ? (
                    cotizacion.monto_seña > 0
                      ? `Reservar y señar $${cotizacion.monto_seña}`
                      : 'Confirmar reserva'
                  ) : (
                    'Iniciá sesión para reservar'
                  )}
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
