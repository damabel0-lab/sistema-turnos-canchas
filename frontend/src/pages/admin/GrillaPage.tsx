import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';

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
const HORAS = Array.from({ length: 15 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

interface TurnoFijoRespuesta {
  creadas: Array<{ fecha: string; reserva_id: number }>;
  errores: Array<{ fecha: string; error: string }>;
  total_creadas: number;
  total_solicitadas: number;
}

const colores: Record<string, string> = {
  pendiente_seña: '#fff3cd', // amarillo = espera seña
  confirmada: '#d4edda', // verde = pagada
  completada: '#cce5ff', // azul = jugada
  bloqueo: '#e2e3e5', // gris = no disponible
};

export function GrillaPage() {
  const [fecha, setFecha] = useState(hoy());
  const [filas, setFilas] = useState<FilaGrilla[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // form carga manual
  const [carga, setCarga] = useState({ nombre: '', telefono: '', cancha_id: '', hora: '10:00' });

  // reserva seleccionada para cambiar estado
  const [sel, setSel] = useState<{ reserva_id: number; cliente?: string; estado?: string; monto?: number } | null>(null);
  const [metodo, setMetodo] = useState('efectivo');

  // form bloqueo
  const [bloqueo, setBloqueo] = useState({ cancha_id: '', desde: '08:00', hasta: '09:00', motivo: '' });

  // form turno fijo
  const DIAS_SEMANA = [
    { valor: 0, texto: 'Domingo' },
    { valor: 1, texto: 'Lunes' },
    { valor: 2, texto: 'Martes' },
    { valor: 3, texto: 'Miércoles' },
    { valor: 4, texto: 'Jueves' },
    { valor: 5, texto: 'Viernes' },
    { valor: 6, texto: 'Sábado' },
  ];
  const HORAS_TURNO = Array.from({ length: 60 }, (_, i) => {
    const min = i * 15;
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  }).filter((h) => {
    const [hh, mm] = h.split(':').map(Number);
    const total = hh * 60 + mm;
    return total >= HORA_APERTURA * 60 && total + 60 <= HORA_CIERRE * 60;
  });

  const [turnoFijo, setTurnoFijo] = useState({
    nombre: '',
    telefono: '',
    cancha_id: '',
    dia_semana: '',
    hora: '',
    semanas: '4',
  });

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
      const semanas = Number(turnoFijo.semanas);
      const semanasValidas = semanas >= 1 && semanas <= 52 ? semanas : 4;
      const r = await api<TurnoFijoRespuesta>('/reservas/turno-fijo', {
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

  // leyenda
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
    <main style={{ padding: 16, display: 'grid', gap: 16 }}>
      <h1>Grilla del día</h1>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Fecha{' '}
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <span>🕐 {totalReservas} turnos</span>
        <span style={{ color: '#b8860b' }}>⏳ por cobrar ${porCobrar}</span>
        <span style={{ color: 'green' }}>✅ cobrado ${cobrado}</span>
        <button type="button" onClick={() => void cargar()}>Actualizar</button>
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
        <span style={{ background: colores.pendiente_seña, padding: '2px 8px' }}>Pendiente seña</span>
        <span style={{ background: colores.confirmada, padding: '2px 8px' }}>Confirmada</span>
        <span style={{ background: colores.bloqueo, padding: '2px 8px' }}>Bloqueada</span>
        <span style={{ background: '#fff', border: '1px solid #ccc', padding: '2px 8px' }}>Libre</span>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {mensaje && <p style={{ color: 'green' }}>{mensaje}</p>}

      {/* Carga manual rápida */}
      <section style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>⚡ Carga rápida (teléfono o presencial)</h3>
        <form onSubmit={guardarManual} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
          <label>
            Nombre
            <br />
            <input
              required
              value={carga.nombre}
              onChange={(e) => setCarga({ ...carga, nombre: e.target.value })}
            />
          </label>
          <label>
            Teléfono
            <br />
            <input
              required
              value={carga.telefono}
              onChange={(e) => setCarga({ ...carga, telefono: e.target.value })}
            />
          </label>
          <label>
            Cancha
            <br />
            <select
              required
              value={carga.cancha_id}
              onChange={(e) => setCarga({ ...carga, cancha_id: e.target.value })}
            >
              <option value="">Elegir…</option>
              {filas.map((f) => (
                <option key={f.cancha_id} value={f.cancha_id}>{f.cancha}</option>
              ))}
            </select>
          </label>
          <label>
            Hora (1 h)
            <br />
            <select value={carga.hora} onChange={(e) => setCarga({ ...carga, hora: e.target.value })}>
              {HORAS.slice(0, -1).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
          <button type="submit">Anotar turno</button>
        </form>
      </section>

      {/* Bloqueo de horarios */}
      <details style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
        <summary style={{ cursor: 'pointer' }}>🚫 Bloquear horario (mantenimiento, lluvia, evento)</summary>
        <form
          onSubmit={guardarBloqueo}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end', marginTop: 10 }}
        >
          <label>
            Cancha
            <br />
            <select
              required
              value={bloqueo.cancha_id}
              onChange={(e) => setBloqueo({ ...bloqueo, cancha_id: e.target.value })}
            >
              <option value="">Elegir…</option>
              {filas.map((f) => (
                <option key={f.cancha_id} value={f.cancha_id}>{f.cancha}</option>
              ))}
            </select>
          </label>
          <label>
            Desde
            <br />
            <input type="time" value={bloqueo.desde} onChange={(e) => setBloqueo({ ...bloqueo, desde: e.target.value })} />
          </label>
          <label>
            Hasta
            <br />
            <input type="time" value={bloqueo.hasta} onChange={(e) => setBloqueo({ ...bloqueo, hasta: e.target.value })} />
          </label>
          <label>
            Motivo
            <br />
            <input
              required
              value={bloqueo.motivo}
              placeholder="Ej: Lluvia"
              onChange={(e) => setBloqueo({ ...bloqueo, motivo: e.target.value })}
            />
          </label>
          <button type="submit">Bloquear</button>
        </form>
      </details>

      {/* Turno fijo semanal */}
      <section style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0 }}>🔁 Turno fijo semanal</h3>
        <form onSubmit={guardarTurnoFijo} style={{ display: 'grid', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
          <label>
            Nombre del cliente
            <br />
            <input
              required
              value={turnoFijo.nombre}
              onChange={(e) => setTurnoFijo({ ...turnoFijo, nombre: e.target.value })}
            />
          </label>
          <label>
            Teléfono
            <br />
            <input
              required
              value={turnoFijo.telefono}
              onChange={(e) => setTurnoFijo({ ...turnoFijo, telefono: e.target.value })}
            />
          </label>
          <label>
            Cancha
            <br />
            <select
              required
              value={turnoFijo.cancha_id}
              onChange={(e) => setTurnoFijo({ ...turnoFijo, cancha_id: e.target.value })}
            >
              <option value="">Elegir…</option>
              {filas.map((f) => (
                <option key={f.cancha_id} value={f.cancha_id}>{f.cancha}</option>
              ))}
            </select>
          </label>
          <label>
            Día de la semana
            <br />
            <select
              required
              value={turnoFijo.dia_semana}
              onChange={(e) => setTurnoFijo({ ...turnoFijo, dia_semana: e.target.value })}
            >
              <option value="">Elegir…</option>
              {DIAS_SEMANA.map((d) => (
                <option key={d.valor} value={d.valor}>{d.texto}</option>
              ))}
            </select>
          </label>
          <label>
            Hora de inicio (1 h)
            <br />
            <select
              required
              value={turnoFijo.hora}
              onChange={(e) => setTurnoFijo({ ...turnoFijo, hora: e.target.value })}
            >
              <option value="">Elegir…</option>
              {HORAS_TURNO.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
          <label>
            Semanas
            <br />
            <input
              required
              type="number"
              min={1}
              max={52}
              value={turnoFijo.semanas}
              onChange={(e) => setTurnoFijo({ ...turnoFijo, semanas: e.target.value })}
            />
          </label>
          <button type="submit">Crear turno fijo</button>
        </form>
      </section>

      <div style={{ overflowX: 'auto' }}>
        <table border={1} cellPadding={4} style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: '#fff' }}>Cancha</th>
              {HORAS.map((h) => (
                <th key={h} style={{ fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.cancha_id}>
                <td style={{ position: 'sticky', left: 0, background: '#fff', whiteSpace: 'nowrap' }}>
                  {f.cancha}
                  {f.deporte && <div style={{ fontSize: 11, color: '#666' }}>{f.deporte}</div>}
                </td>
                {HORAS.map((h) => {
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
                      style={{
                        background: fondo,
                        minWidth: 70,
                        fontSize: 11,
                        cursor: item?.tipo === 'reserva' ? 'pointer' : 'default',
                        verticalAlign: 'top',
                      }}
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

      {/* Panel de acciones de la reserva seleccionada */}
      {sel && (
        <section style={{ border: '2px solid #1a73e8', borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>
            Reserva #{sel.reserva_id} · {sel.cliente} ·{' '}
            <span
              style={{
                background:
                  sel.estado === 'confirmada'
                    ? colores.confirmada
                    : sel.estado === 'completada'
                      ? '#cce5ff'
                      : colores.pendiente_seña,
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {sel.estado}
            </span>
          </h3>

          {sel.estado === 'pendiente_seña' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label>
                Método de pago{' '}
                <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </label>
              <button type="button" onClick={() => void cambiarEstado('confirmada')}>
                💵 Confirmar pago (registra en caja)
              </button>
            </div>
          )}

          {sel.estado === 'confirmada' && (
            <button type="button" onClick={() => void cambiarEstado('completada')}>
              ✅ Marcar completada (cobra saldo restante)
            </button>
          )}

          {(sel.estado === 'pendiente_seña' || sel.estado === 'confirmada') && (
            <button
              type="button"
              onClick={() => void cambiarEstado('cancelada')}
              style={{ marginLeft: 8, color: 'crimson' }}
            >
              ✕ Cancelar reserva
            </button>
          )}

          <button type="button" onClick={() => setSel(null)} style={{ marginLeft: 8 }}>
            Cerrar
          </button>
        </section>
      )}

      {filas.length > 0 && (
        <p style={{ color: '#666', fontSize: 13 }}>
          Las reservas nuevas de hoy se refrescan con el botón "Actualizar". La carga manual y
          los bloqueos vienen en el próximo paso.
        </p>
      )}
    </main>
  );
}
