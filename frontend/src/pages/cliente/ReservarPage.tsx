import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

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
  const [canchaId, setCanchaId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(hoy());
  const [horas, setHoras] = useState<EstadoHora[]>([]);
  const [horaSel, setHoraSel] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [confirmada, setConfirmada] = useState<{ id: number } | null>(null);

  useEffect(() => {
    api<Deporte[]>('/deportes').then(setDeportes).catch((e) => setError(e.message));
    api<Cancha[]>('/canchas').then(setCanchas).catch((e) => setError(e.message));
  }, []);

  const canchasDelDeporte = useMemo(
    () => canchas.filter((c) => c.activa && c.deporte_id === deporteId),
    [canchas, deporteId],
  );

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
        prev.map((h) => (h.hora === horaSel ? { ...h, estado: 'ocupada' as const } : h)),
      );
      setHoraSel(null);
      setCotizacion(null);
    } catch (e) {
      // 409 = otro usuario reservó primero: refrescar la grilla
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
    <main style={{ padding: 16, display: 'grid', gap: 20, maxWidth: 640 }}>
      <h1>Reservar</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {confirmada && (
        <p style={{ color: 'green' }}>
          ✅ Reserva #{confirmada.id} creada. Si tiene seña, abonala en el complejo para
          confirmarla.
        </p>
      )}

      {/* Paso 1: disciplina */}
      <section>
        <h3>1. ¿Qué querés jugar?</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {deportes.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setDeporteId(d.id);
                setCanchaId(null);
              }}
              style={{
                padding: '6px 12px',
                background: deporteId === d.id ? '#1a73e8' : '#eee',
                color: deporteId === d.id ? '#fff' : '#000',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {d.nombre}
            </button>
          ))}
        </div>
      </section>

      {/* Paso 2: cancha */}
      {deporteId && (
        <section>
          <h3>2. Elegí la cancha</h3>
          {canchasDelDeporte.length === 0 ? (
            <p>No hay canchas activas para esta disciplina.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {canchasDelDeporte.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCanchaId(c.id)}
                  style={{
                    padding: '6px 12px',
                    background: canchaId === c.id ? '#1a73e8' : '#eee',
                    color: canchaId === c.id ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  {c.nombre} · ${c.precio_base}/h
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Paso 3: fecha y horario */}
      {canchaId && (
        <section>
          <h3>3. Fecha y horario</h3>
          <label>
            Fecha{' '}
            <input type="date" value={fecha} min={hoy()} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 10 }}>
            {horas.map((h) => (
              <button
                key={h.hora}
                type="button"
                disabled={h.estado !== 'libre'}
                onClick={() => setHoraSel(h.hora)}
                title={h.estado}
                style={{
                  padding: '8px 4px',
                  border: 'none',
                  borderRadius: 4,
                  cursor: h.estado === 'libre' ? 'pointer' : 'not-allowed',
                  background:
                    horaSel === h.hora ? '#1a73e8' : h.estado === 'libre' ? '#d4edda' : '#e2e3e5',
                  color: horaSel === h.hora ? '#fff' : h.estado === 'libre' ? '#155724' : '#6c757d',
                }}
              >
                {h.hora}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Resumen */}
      {cotizacion && horaSel && (
        <section style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16 }}>
          <h3>Resumen</h3>
          <p>
            Turno: <strong>{fecha} · {horaSel}</strong> (1 hora)
          </p>
          {cotizacion.descuento_socio > 0 && <p>Descuento socio: -${cotizacion.descuento_socio}</p>}
          {cotizacion.descuento_turno_fijo > 0 && <p>Descuento turno fijo: -${cotizacion.descuento_turno_fijo}</p>}
          <p>
            Total: <strong>${cotizacion.precio_total}</strong>
          </p>
          {cotizacion.monto_seña > 0 && <p>Seña a pagar ahora: ${cotizacion.monto_seña}</p>}
          <button type="button" disabled={!session || creando} onClick={confirmar}>
            {creando
              ? 'Creando…'
              : session
                ? cotizacion.monto_seña > 0
                  ? `Reservar y señar $${cotizacion.monto_seña}`
                  : 'Confirmar reserva'
                : 'Iniciá sesión para reservar'}
          </button>
        </section>
      )}
    </main>
  );
}
