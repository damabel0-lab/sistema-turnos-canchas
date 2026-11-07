import { useCallback, useEffect, useState } from 'react';
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
