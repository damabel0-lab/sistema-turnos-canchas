import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
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

interface ConfigComplejo {
  hora_apertura: number;
  hora_cierre: number;
  cancelacion_minima_horas: number;
  descuento_turno_fijo_porcentaje: number;
}

const hoy = () => new Date().toISOString().slice(0, 10);

const estadosReserva: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  pendiente_seña: 'warning',
  confirmada: 'success',
  completada: 'neutral',
  cancelada: 'danger',
};

const coloresReserva: Record<string, string> = {
  pendiente_seña: '#fef3c7',
  confirmada: '#d1fae5',
  completada: '#e0e7ff',
  bloqueo: '#e5e7eb',
};

export function GrillaPage() {
  const [fecha, setFecha] = useState(hoy());
  const [filas, setFilas] = useState<FilaGrilla[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [carga, setCarga] = useState({ nombre: '', telefono: '', cancha_id: '', hora: '10:15' });
  const [sel, setSel] = useState<{ reserva_id: number; cliente?: string; estado?: string; monto?: number } | null>(null);
  const [metodo, setMetodo] = useState('efectivo');
  const [bloqueo, setBloqueo] = useState({ cancha_id: '', desde: '08:00', hasta: '09:00', motivo: '' });
  const [turnoFijo, setTurnoFijo] = useState({ nombre: '', telefono: '', cancha_id: '', dia_semana: '', hora: '', semanas: '4' });
  const [config, setConfig] = useState<ConfigComplejo | null>(null);

  useEffect(() => {
    api<ConfigComplejo>('/config').then(setConfig).catch((e) => setError(e.message));
  }, []);

  // Turnos válidos (:15 a :15, 1 hora) — coincide con la disponibilidad del backend
  const HORAS_TURNO = config
    ? (() => {
        const slots: string[] = [];
        for (let min = config.hora_apertura * 60 + 15; min + 60 <= config.hora_cierre * 60; min += 60) {
          slots.push(`${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`);
        }
        return slots;
      })()
    : [];

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
      const [h, m] = carga.hora.split(':').map(Number);
      const totalFin = h * 60 + m + 60;
      const fin = `${String(Math.floor(totalFin / 60)).padStart(2, '0')}:${String(totalFin % 60).padStart(2, '0')}`;
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
    (n, f) =>
      n +
      f.items
        .filter((i) => i.tipo === 'reserva' && i.estado === 'pendiente_seña')
        .reduce((s, i) => s + (i.monto ?? 0), 0),
    0
  );
  const cobrado = filas.reduce(
    (n, f) =>
      n +
      f.items
        .filter((i) => i.tipo === 'reserva' && i.estado === 'confirmada')
        .reduce((s, i) => s + (i.monto ?? 0), 0),
    0
  );

  return (
    <main className="pantalla">
      <div className="contenedor-ancho">
        <div className="fila-entre" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h1 className="titulo">Grilla del día</h1>
            <p className="texto-sec">Controlá tus canchas en tiempo real</p>
          </div>
          <div className="fila">
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
            <button className="boton boton-outline" onClick={() => void cargar()}>
              <RefreshCw size={16} /> Actualizar
            </button>
          </div>
        </div>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        {mensaje && <p style={{ color: '#10b981' }}>{mensaje}</p>}

        <div className="fila" style={{ gap: '0.5rem', marginBottom: '1rem' }}>
          <div className="tarjeta-plana" style={{ padding: '0.5rem 0.75rem' }}>
            <span style={{ fontWeight: 700 }}>🕐 {totalReservas}</span> turnos
          </div>
          <div className="tarjeta-plana" style={{ padding: '0.5rem 0.75rem', background: '#fef9c3', borderColor: '#fde68a' }}>
            <span style={{ fontWeight: 700 }}>⏳ ${porCobrar}</span> por cobrar
          </div>
          <div className="tarjeta-plana" style={{ padding: '0.5rem 0.75rem', background: '#d1fae5', borderColor: '#a7f3d0' }}>
            <span style={{ fontWeight: 700 }}>✅ ${cobrado}</span> cobrado
          </div>
        </div>

        {/* Turno fijo semanal */}
        <Card>
          <h3 className="titulo" style={{ fontSize: '1rem' }}><Clock size={16} /> Turno fijo semanal</h3>
          <form onSubmit={guardarTurnoFijo} className="stack">
            <label className="label">Nombre del cliente<input required value={turnoFijo.nombre} onChange={(e) => setTurnoFijo({ ...turnoFijo, nombre: e.target.value })} className="input" /></label>
            <label className="label">Teléfono<input required value={turnoFijo.telefono} onChange={(e) => setTurnoFijo({ ...turnoFijo, telefono: e.target.value })} className="input" /></label>
            <label className="label">Cancha
              <select required value={turnoFijo.cancha_id} onChange={(e) => setTurnoFijo({ ...turnoFijo, cancha_id: e.target.value })} className="input">
                <option value="">Elegir…</option>
                {filas.map((f) => (<option key={f.cancha_id} value={f.cancha_id}>{f.cancha}</option>))}
              </select>
            </label>
            <label className="label">Día
              <select required value={turnoFijo.dia_semana} onChange={(e) => setTurnoFijo({ ...turnoFijo, dia_semana: e.target.value })} className="input">
                <option value="">Elegir…</option>
                {DIAS_SEMANA.map((d) => (<option key={d.valor} value={d.valor}>{d.texto}</option>))}
              </select>
            </label>
            <label className="label">Hora
              <select required value={turnoFijo.hora} onChange={(e) => setTurnoFijo({ ...turnoFijo, hora: e.target.value })} className="input">
                <option value="">Elegir…</option>
                {HORAS_TURNO.map((h) => (<option key={h} value={h}>{h}</option>))}
              </select>
            </label>
            <label className="label">Semanas
              <input required type="number" min={1} max={52} value={turnoFijo.semanas} onChange={(e) => setTurnoFijo({ ...turnoFijo, semanas: e.target.value })} className="input" />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="boton boton-primario"><Plus size={16} /> Crear turno fijo</button>
            </div>
          </form>
        </Card>

        {/* Bloqueo de horarios */}
        <Card>
          <h3 className="titulo" style={{ fontSize: '1rem' }}><MapPin size={16} /> Bloquear horario</h3>
          <form onSubmit={guardarBloqueo} className="stack">
            <label className="label">Cancha
              <select required value={bloqueo.cancha_id} onChange={(e) => setBloqueo({ ...bloqueo, cancha_id: e.target.value })} className="input">
                <option value="">Elegir…</option>
                {filas.map((f) => (<option key={f.cancha_id} value={f.cancha_id}>{f.cancha}</option>))}
              </select>
            </label>
            <label className="label">Desde<input type="time" value={bloqueo.desde} onChange={(e) => setBloqueo({ ...bloqueo, desde: e.target.value })} className="input" /></label>
            <label className="label">Hasta<input type="time" value={bloqueo.hasta} onChange={(e) => setBloqueo({ ...bloqueo, hasta: e.target.value })} className="input" /></label>
            <label className="label">Motivo<input required value={bloqueo.motivo} placeholder="Lluvia, mantenimiento, evento" onChange={(e) => setBloqueo({ ...bloqueo, motivo: e.target.value })} className="input" /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="boton boton-danger"><Plus size={16} /> Bloquear</button>
            </div>
          </form>
        </Card>

        {/* Carga rápida */}
        <Card>
          <h3 className="titulo" style={{ fontSize: '1rem' }}><Plus size={16} /> Carga rápida (teléfono/presencial)</h3>
          <form onSubmit={guardarManual} className="stack">
            <label className="label">Nombre<input required value={carga.nombre} onChange={(e) => setCarga({ ...carga, nombre: e.target.value })} className="input" /></label>
            <label className="label">Teléfono<input required value={carga.telefono} onChange={(e) => setCarga({ ...carga, telefono: e.target.value })} className="input" /></label>
            <label className="label">Cancha
              <select required value={carga.cancha_id} onChange={(e) => setCarga({ ...carga, cancha_id: e.target.value })} className="input">
                <option value="">Elegir…</option>
                {filas.map((f) => (<option key={f.cancha_id} value={f.cancha_id}>{f.cancha}</option>))}
              </select>
            </label>
            <label className="label">Hora (1 h)
              <select value={carga.hora} onChange={(e) => setCarga({ ...carga, hora: e.target.value })} className="input">
                {HORAS_TURNO.map((h) => (<option key={h} value={h}>{h}</option>))}
              </select>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="boton boton-primario">Anotar turno</button>
            </div>
          </form>
        </Card>

        {/* Tabla de grilla */}
        <Card plano>
          <div style={{ overflowX: 'auto', padding: '0.75rem' }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Cancha</th>
                  {HORAS_TURNO.map((h) => (<th key={h} style={{ fontSize: '0.65rem', textAlign: 'center' }}>{h}</th>))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.cancha_id}>
                    <td style={{ position: 'sticky', left: 0, background: '#fff' }}>
                      {f.cancha}
                      <br />
                      <span className="texto-sec" style={{ fontSize: '0.7rem' }}>{f.deporte}</span>
                    </td>
                    {HORAS_TURNO.map((h) => {
                      const item = f.items.find((i) => i.hora === h);
                      const fondo = item ? (item.tipo === 'bloqueo' ? coloresReserva.bloqueo : coloresReserva[item.estado ?? 'pendiente_seña'] ?? coloresReserva.pendiente_seña) : '#fff';
                      const titulo = item ? (item.tipo === 'bloqueo' ? `Bloqueada: ${item.motivo}` : `${item.cliente} · $${item.monto} · ${item.estado}`) : 'Libre';
                      return (
                        <td
                          key={h}
                          title={titulo}
                          onClick={() => {
                            if (item?.tipo === 'reserva' && item.reserva_id) {
                              setSel({ reserva_id: item.reserva_id, cliente: item.cliente, estado: item.estado, monto: item.monto });
                            }
                          }}
                          style={{ background: fondo, minWidth: '3.5rem', fontSize: '0.7rem', textAlign: 'center', cursor: item?.tipo === 'reserva' ? 'pointer' : 'default' }}
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
          <Card>
            <h3 className="titulo" style={{ fontSize: '1rem' }}>
              Reserva #{sel.reserva_id} · {sel.cliente}
              <Badge variant={estadosReserva[sel.estado ?? 'pendiente_seña'] ?? 'neutral'} style={{ marginLeft: '0.5rem' }}>
                {sel.estado ?? ''}
              </Badge>
            </h3>

            {sel.estado === 'pendiente_seña' && (
              <div className="fila">
                <label className="label" style={{ marginBottom: 0 }}>
                  Método de pago
                  <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="input">
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="mercado_pago">Mercado Pago</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </label>
                <button type="button" className="boton boton-primario" onClick={() => void cambiarEstado('confirmada')}>
                  Confirmar pago
                </button>
              </div>
            )}
            {sel.estado === 'confirmada' && (
              <button type="button" className="boton boton-secundario" onClick={() => void cambiarEstado('completada')}>
                Marcar completada
              </button>
            )}
            {(sel.estado === 'pendiente_seña' || sel.estado === 'confirmada') && (
              <button type="button" className="boton boton-danger" onClick={() => void cambiarEstado('cancelada')}>
                Cancelar reserva
              </button>
            )}
            <button type="button" className="boton boton-ghost" onClick={() => setSel(null)} style={{ marginLeft: '0.5rem' }}>
              Cerrar
            </button>
          </Card>
        )}
      </div>
    </main>
  );
}
