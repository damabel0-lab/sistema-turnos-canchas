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
const HORAS = Array.from({ length: 15 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

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

  // form bloqueo
  const [bloqueo, setBloqueo] = useState({ cancha_id: '', desde: '08:00', hasta: '09:00', motivo: '' });

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
                      style={{
                        background: fondo,
                        minWidth: 70,
                        fontSize: 11,
                        cursor: item ? 'pointer' : 'default',
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

      {filas.length > 0 && (
        <p style={{ color: '#666', fontSize: 13 }}>
          Las reservas nuevas de hoy se refrescan con el botón "Actualizar". La carga manual y
          los bloqueos vienen en el próximo paso.
        </p>
      )}
    </main>
  );
}
