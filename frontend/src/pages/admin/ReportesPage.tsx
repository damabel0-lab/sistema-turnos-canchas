import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface IngresoPorDisciplina {
  origen: string;
  total: number;
  movimientos: number;
}

interface Reporte {
  desde: string;
  hasta: string;
  total_general: number;
  por_disciplina: IngresoPorDisciplina[];
}

export function ReportesPage() {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setReporte(await api<Reporte>(`/caja/reporte-disciplina?fecha=${fecha}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando reporte');
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <main style={{ padding: 16, display: 'grid', gap: 20, maxWidth: 700 }}>
      <h1>Reportes y estadísticas</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <label>
        Fecha
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
      </label>

      {reporte && (
        <section>
          <h2>Recaudación del día</h2>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, minWidth: 150 }}>
              <div style={{ fontSize: 13, color: '#555' }}>Total general</div>
              <div style={{ fontSize: 26, fontWeight: 'bold' }}>${reporte.total_general}</div>
            </div>
          </div>

          <h3>Por disciplina / origen</h3>
          {reporte.por_disciplina.length === 0 ? (
            <p style={{ color: '#666' }}>Sin movimientos en esta fecha.</p>
          ) : (
            <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th>Origen</th>
                  <th>Movimientos</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {reporte.por_disciplina.map((d) => (
                  <tr key={d.origen}>
                    <td>{d.origen}</td>
                    <td>{d.movimientos}</td>
                    <td style={{ textAlign: 'right' }}>${d.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}
