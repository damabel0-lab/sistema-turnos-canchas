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

  // Cotizar al elegir hora
  useEffect(() => {
    setCotizacion(null);
    if (!canchaId || !horaSel) return;
    const fin = `${String(Number(horaSel.slice(0, 2)) + 1).padStart(2, '0')}:00`;
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
      const fin = `${String(Number(horaSel.slice(0, 2)) + 1).padStart(2, '0')}:00`;
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
                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '0.4rem' }}
                >
                  {horas.map((h) => {
                    const seleccionado = horaSel === h.hora;
                    const libre = h.estado === 'libre';
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
                        style={{
                          padding: '0.5rem 0.25rem',
                          border: 'none',
                          borderRadius: '0.6rem',
                          background: fondo,
                          color: texto,
                          cursor: libre ? 'pointer' : 'not-allowed',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        {h.hora}
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
                  <strong>{fecha}</strong> · <strong>{horaSel}</strong> (1 h)
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
