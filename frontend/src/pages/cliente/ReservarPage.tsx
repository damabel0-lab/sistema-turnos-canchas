import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Input } from '../../components/ui';
import { Calendar, Clock, CreditCard, Loader2, MapPin } from 'lucide-react';



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

  const canchasDelDeporte = canchas.filter(
    (c) => c.activa && c.deporte_id === deporteId
  );

  useEffect(() => {
    api<Deporte[]>('/deportes').then(setDeportes).catch((e) => setError(e.message));
    api<Cancha[]>('/canchas').then(setCanchas).catch((e) => setError(e.message));
  }, []);

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
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Reservar</h1>
        {error && (
          <Card padded={false}>
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </Card>
        )}
        {confirmada && (
          <Card padded={false}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Clock size={32} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Reserva #{confirmada.id} creada ✅</h3>
              <p className="text-gray-600 mb-4">
                Si tiene seña, abonala en el complejo para confirmarla.
              </p>
              <Button variant="secondary" asChild className="w-full">
                <Link to="/mis-reservas">Ver mis reservas</Link>
              </Button>
            </div>
          </Card>
        )}
        {!confirmada && (
          <div className="space-y-8">
            {/* Paso 1: disciplina */}
            <Card>
              <div className="p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> 1. ¿Qué querés jugar?
                </h2>
                <div className="flex flex-wrap gap-3">
                  {deportes.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setDeporteId(d.id);
                        setCancaId(null);
                      }}
                      className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                        deporteId === d.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {d.nombre}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Paso 2: cancha */}
            {deporteId && (
              <Card>
                <div className="p-6">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" /> 2. Elegí la cancha
                  </h2>
                  {canchasDelDeporte.length === 0 ? (
                    <p className="text-gray-600">No hay canchas activas para esta disciplina.</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {canchasDelDeporte.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCancaId(c.id)}
                          className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                            canchaId === c.id
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {c.nombre} · ${c.precio_base}/h
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Paso 3: fecha y horario */}
            {canchaId && (
              <Card>
                <div className="p-6">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" /> 3. Fecha y horario
                  </h2>
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                      <Input
                        type="date"
                        value={fecha}
                        min={hoy()}
                        onChange={(e) => setFecha(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {horas.map((h) => (
                      <button
                        key={h.hora}
                        type="button"
                        disabled={h.estado !== 'libre'}
                        onClick={() => setHoraSel(h.hora)}
                        title={h.estado}
                        className={`py-3 rounded-xl text-sm font-medium transition-all ${
                          horaSel === h.hora
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : h.estado === 'libre'
                              ? 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {h.hora}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Resumen */}
            {cotizacion && horaSel && (
              <Card padded={false}>
                <div className="p-6">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" /> Resumen
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Turno:</span>
                      <span className="font-medium">{fecha} · {horaSel}</span>
                    </div>
                    {cotizacion.descuento_socio > 0 && (
                      <div className="flex justify-between text-sm text-emerald-700">
                        <span>Descuento socio:</span>
                        <span>- ${cotizacion.descuento_socio}</span>
                      </div>
                    )}
                    {cotizacion.descuento_turno_fijo > 0 && (
                      <div className="flex justify-between text-sm text-emerald-700">
                        <span>Descuento turno fijo:</span>
                        <span>- ${cotizacion.descuento_turno_fijo}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-100 text-sm">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold text-gray-900">${cotizacion.precio_total}</span>
                    </div>
                    {cotizacion.monto_seña > 0 && (
                      <div className="flex justify-between text-sm text-amber-700">
                        <span>Seña a pagar ahora:</span>
                        <span className="font-medium">${cotizacion.monto_seña}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-6">
                    <Button
                      type="button"
                      disabled={!session || creando}
                      onClick={confirmar}
                      className="w-full py-3"
                    >
                      {creando ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creando…
                        </>
                      ) : session
                        ? cotizacion.monto_seña > 0
                          ? `Reservar y señar $${cotizacion.monto_seña}`
                          : 'Confirmar reserva'
                        : 'Iniciá sesión para reservar'
                      }
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  );
}