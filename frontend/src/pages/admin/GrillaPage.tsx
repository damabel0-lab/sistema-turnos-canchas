import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card, Button, Badge } from '../../components/ui';
import { Clock, Plus, MapPin, RefreshCw } from 'lucide-react';

interface ItemGrilla {
  hora: string;
  tipo: 'reserva' | 'bloqueo';
  estado?: string;
  reserva_id?: number;
  cliente?: string;
  monto?: number;
  motivo?: string;
}

interface FilaGrilla {
  cancha_id: number;
  cancha: string;
  deporte: string | null;
  items: ItemGrilla[];
}

const hoy = () => new Date().toISOString().slice(0, 10);
const HORA_APERTURA = 8;
const HORA_CIERRE = 23;
const MINUTOS_BLOQUE = 15;

const HORAS_TURNO = Array.from({ length: ((HORA_CIERRE - HORA_APERTURA) * 60) / MINUTOS_BLOQUE }, (_, i) => {
  const min = i * MINUTOS_BLOQUE;
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
});

const colores: Record<string, string> = {
  pendiente_seña: '#fff3cd',
  confirmada: '#dcfce7',
  completada: '#e0f2fe',
  cancelada: '#f1f5f9',
  bloqueo: '#e2e3e5',
};

export function GrillaPage() {
  const [fecha] = useState(hoy());
  const [filas, setFilas] = useState<FilaGrilla[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [carga, setCarga] = useState({ nombre: '', telefono: '', cancha_id: '', hora: '10:00' });
  const [sel, setSel] = useState<{ reserva_id: number; cliente?: string; estado?: string; monto?: number } | null>(null);
  const [metodo, setMetodo] = useState('efectivo');
  const [bloqueo, setBloqueo] = useState({ cancha_id: '', desde: '08:00', hasta: '09:00', motivo: '' });
  const [turnoFijo, setTurnoFijo] = useState({ nombre: '', telefono: '', cancha_id: '', dia_semana: '', hora: '', semanas: '4' });

  const DIAS_SEMANA = [
    { valor: 0, texto: 'Domingo' },
    { valor: 1, texto: 'Lunes' },
    { valor: 2, texto: 'Martes' },
    { valor: 3, texto: 'Miércoles' },
    { valor: 4, texto: 'Jueves' },
    { valor: 5, texto: 'Viernes' },
    { valor: 6, texto: 'Sábado' },
  ];

  const cargar = useCallback(async () => {
    try {
      setFilas(await api<FilaGrilla[]>(`/reservas/grilla?fecha=${fecha}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando la grilla');
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cambiarEstado(estado: 'confirmada' | 'completada' | 'cancelada') {
    if (!sel) return;
    setError(null);
    setMensaje(null);
    try {
      await api(`/reservas/${sel.reserva_id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado, metodo_pago: estado === 'confirmada' ? metodo : undefined }),
      });
      const textos: Record<string, string> = {
        confirmada: 'Cobro registrado y reserva confirmada ✅',
        completada: 'Reserva marcada como completada ✅',
        cancelada: 'Reserva cancelada',
      };
      setMensaje(`${textos[estado]} (#${sel.reserva_id})`);
      setSel(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    }
  }

  async function guardarManual(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      const fin = `${String(Number(carga.hora.slice(0, 2)) + 1).padStart(2, '0')}:00`;
      const r = await api<{ id: number }>('/reservas/manual', {
        method: 'POST',
        body: JSON.stringify({
          cliente_nombre: carga.nombre,
          cliente_telefono: carga.telefono,
          cancha_id: Number(carga.cancha_id),
          fecha,
          hora_inicio: carga.hora,
          hora_fin: fin,
        }),
      });
      setMensaje(`Turno #${r.id} anotado para ${carga.nombre} ✅`);
      setCarga({ ...carga, nombre: '', telefono: '' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo anotar el turno');
    }
  }

  async function guardarBloqueo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await api('/bloqueos', {
        method: 'POST',
        body: JSON.stringify({
          cancha_id: Number(bloqueo.cancha_id),
          fecha_inicio: `${fecha}T${bloqueo.desde}:00`,
          fecha_fin: `${fecha}T${bloqueo.hasta}:00`,
          motivo: bloqueo.motivo,
        }),
      });
      setMensaje('Horario bloqueado ✅');
      setBloqueo({ ...bloqueo, motivo: '' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo bloquear');
    }
  }

  async function guardarTurnoFijo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      const semanasValidas = Math.min(Math.max(Number(turnoFijo.semanas), 1), 52);
      const r = await api<{ total_creadas: number; total_solicitadas: number }>('/reservas/turno-fijo', {
        method: 'POST',
        body: JSON.stringify({
          cliente_nombre: turnoFijo.nombre,
          cliente_telefono: turnoFijo.telefono,
          cancha_id: Number(turnoFijo.cancha_id),
          dia_semana: Number(turnoFijo.dia_semana),
          hora: turnoFijo.hora,
          semanas: semanasValidas,
          estado: 'pendiente_seña',
        }),
      });
      setMensaje(`Turnos fijos creados: ${r.total_creadas} de ${r.total_solicitadas} ✅`);
      setTurnoFijo({ ...turnoFijo, nombre: '', telefono: '' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el turno fijo');
    }
  }

  const totalReservas = filas.reduce((n, f) => n + f.items.filter((i) => i.tipo === 'reserva').length, 0);
  const porCobrar = filas.reduce(
    (n, f) => n + f.items.filter((i) => i.tipo === 'reserva' && i.estado === 'pendiente_seña').reduce((s, i) => s + (i.monto ?? 0), 0),
    0,
  );
  const cobrado = filas.reduce(
    (n, f) => n + f.items.filter((i) => i.tipo === 'reserva' && i.estado === 'confirmada').reduce((s, i) => s + (i.monto ?? 0), 0),
    0,
  );

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Grilla del día</h1>
            <p className="text-gray-600 text-sm">Controlá tus canchas en tiempo real</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void cargar()} className="px-4 py-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {mensaje && <p className="text-emerald-600 text-sm mb-4">{mensaje}</p>}

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-xl flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">🕐 {totalReservas}</span>
            <span className="text-sm text-gray-500">turnos</span>
          </div>
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
            <span className="text-sm font-medium text-amber-800">⏳ {porCobrar}</span>
            <span className="text-sm text-gray-500">por cobrar</span>
          </div>
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
            <span className="text-sm font-medium text-emerald-800">✅ {cobrado}</span>
            <span className="text-sm text-gray-500">cobrado</span>
          </div>
        </div>

        {/* Turno fijo semanal */}
        <Card padded={false}>
          <div className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Turno fijo semanal
            </h3>
            <form onSubmit={guardarTurnoFijo} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Nombre del cliente</label>
                <input
                  required
                  value={turnoFijo.nombre}
                  onChange={(e) => setTurnoFijo({ ...turnoFijo, nombre: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  required
                  value={turnoFijo.telefono}
                  onChange={(e) => setTurnoFijo({ ...turnoFijo, telefono: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Cancha</label>
                <select
                  required
                  value={turnoFijo.cancha_id}
                  onChange={(e) => setTurnoFijo({ ...turnoFijo, cancha_id: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Elegir…</option>
                  {filas.map((f) => (
                    <option key={f.cancha_id} value={f.cancha_id}>{f.cancha}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Día</label>
                <select
                  required
                  value={turnoFijo.dia_semana}
                  onChange={(e) => setTurnoFijo({ ...turnoFijo, dia_semana: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Elegir…</option>
                  {DIAS_SEMANA.map((d) => (
                    <option key={d.valor} value={d.valor}>{d.texto}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Hora</label>
                <select
                  required
                  value={turnoFijo.hora}
                  onChange={(e) => setTurnoFijo({ ...turnoFijo, hora: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Elegir…</option>
                  {HORAS_TURNO.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Semanas</label>
                <input
                  required
                  type="number"
                  min={1}
                  max={52}
                  value={turnoFijo.semanas}
                  onChange={(e) => setTurnoFijo({ ...turnoFijo, semanas: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear turno fijo
              </button>
            </form>
          </div>
        </Card>

        {/* Bloqueo de horarios */}
        <Card padded={false}>
          <div className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Bloquear horario
            </h3>
            <form onSubmit={guardarBloqueo} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Cancha</label>
                <select
                  required
                  value={bloqueo.cancha_id}
                  onChange={(e) => setBloqueo({ ...bloqueo, cancha_id: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Elegir…</option>
                  {filas.map((f) => (
                    <option key={f.cancha_id} value={f.cancha_id}>{f.cancha}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Desde</label>
                <input
                  type="time"
                  value={bloqueo.desde}
                  onChange={(e) => setBloqueo({ ...bloqueo, desde: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Hasta</label>
                <input
                  type="time"
                  value={bloqueo.hasta}
                  onChange={(e) => setBloqueo({ ...bloqueo, hasta: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Motivo</label>
                <input
                  required
                  value={bloqueo.motivo}
                  placeholder="Lluvia, mantenimiento, evento"
                  onChange={(e) => setBloqueo({ ...bloqueo, motivo: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button type="submit" className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors">
                Bloquear
              </button>
            </form>
          </div>
        </Card>

        {/* Carga rápida */}
        <Card padded={false}>
          <div className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Carga rápida (teléfono o presencial)
            </h3>
            <form onSubmit={guardarManual} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  required
                  value={carga.nombre}
                  onChange={(e) => setCarga({ ...carga, nombre: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  required
                  value={carga.telefono}
                  onChange={(e) => setCarga({ ...carga, telefono: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Cancha</label>
                <select
                  required
                  value={carga.cancha_id}
                  onChange={(e) => setCarga({ ...carga, cancha_id: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Elegir…</option>
                  {filas.map((f) => (
                    <option key={f.cancha_id} value={f.cancha_id}>{f.cancha}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Hora (1h)</label>
                <select
                  value={carga.hora}
                  onChange={(e) => setCarga({ ...carga, hora: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {HORAS_TURNO.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                Anotar turno
              </button>
            </form>
          </div>
        </Card>

        {/* Tabla de grilla */}
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table border={1} cellPadding={4} style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 sticky left-0 bg-white">Cancha</th>
                  {HORAS_TURNO.map((h) => (
                    <th key={h} className="px-2 py-1 text-[10px] text-center text-gray-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.cancha_id}>
                    <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white/95">
                      {f.cancha}
                      <div className="text-xs text-gray-500 mt-1">{f.deporte}</div>
                    </td>
                    {HORAS_TURNO.map((h) => {
                      const item = f.items.find((i) => i.hora === h);
                      const fondo = item
                        ? item.tipo === 'bloqueo'
                          ? colores.bloqueo
                          : colores[item.estado ?? 'pendiente_seña'] ?? colores.pendiente_seña
                        : '#fff';
                      const titulo = item
                        ? item.tipo === 'bloqueo'
                          ? `Bloqueada: ${item.motivo}`
                          : `${item.cliente} · $${item.monto} · ${item.estado}`
                        : 'Libre';
                      return (
                        <td
                          key={h}
                          title={titulo}
                          onClick={() => {
                            if (item?.tipo === 'reserva' && item.reserva_id) {
                              setSel({
                                reserva_id: item.reserva_id,
                                cliente: item.cliente,
                                estado: item.estado,
                                monto: item.monto,
                              });
                            }
                          }}
                          style={{ background: fondo, minWidth: 50 }}
                          className={`h-12 text-[10px] transition-colors cursor-${item?.tipo === 'reserva' ? 'pointer' : 'default'} vertical-align-top`}
                        >
                          {item?.cliente ?? ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Panel de acciones */}
        {sel && (
          <Card padded={false}>
            <div className="p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                Reserva #{sel.reserva_id} · {sel.cliente}
                <Badge variant={sel.estado === 'confirmada' ? 'success' : sel.estado === 'completada' ? 'info' : 'warning'} className="text-xs ml-2">
                  {sel.estado ?? ''}
                </Badge>
              </h3>

              {sel.estado === 'pendiente_seña' && (
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-700">Método de pago</label>
                    <select
                      value={metodo}
                      onChange={(e) => setMetodo(e.target.value)}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="mercado_pago">Mercado Pago</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>
                  <Button variant="primary" onClick={() => void cambiarEstado('confirmada')} className="px-4 py-2">
                    Confirmar pago
                  </Button>
                </div>
              )}
              {sel.estado === 'confirmada' && (
                <Button variant="secondary" onClick={() => void cambiarEstado('completada')} className="px-4 py-2 mt-3">
                  Marcar completada
                </Button>
              )}
              {(sel.estado === 'pendiente_seña' || sel.estado === 'confirmada') && (
                <Button variant="danger" onClick={() => void cambiarEstado('cancelada')} className="px-4 py-2 mt-3 ml-3">
                  Cancelar reserva
                </Button>
              )}
              <Button variant="ghost" onClick={() => setSel(null)} className="px-4 py-2 mt-3 ml-3">
                Cerrar
              </Button>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
