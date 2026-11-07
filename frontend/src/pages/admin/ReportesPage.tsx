import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { Calendar, DollarSign } from 'lucide-react';

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
    <main className="pantalla">
      <div className="contenedor-estrecho">
        <div className="fila-entre" style={{ marginBottom: '0.75rem' }}>
          <h1 className="titulo"><span className="fila"><DollarSign size={20} /> Reportes y estadísticas</span></h1>
          <div className="fila">
            <label className="label" style={{ marginBottom: 0 }}>
              <Calendar size={16} />
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
            </label>
            <button className="boton boton-outline" onClick={() => void cargar()}>Actualizar</button>
          </div>
        </div>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}

        {reporte && (
          <Card>
            <div className="fila-entre" style={{ marginBottom: '1rem' }}>
              <div>
                <h2 className="titulo" style={{ fontSize: '1.1rem' }}>Recaudación del día</h2>
                <p className="texto-sec">{new Date(reporte.desde).toLocaleDateString('es-AR')}</p>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${reporte.total_general}</div>
            </div>

            <h3 className="titulo" style={{ fontSize: '0.95rem' }}>Por disciplina / origen</h3>
            {reporte.por_disciplina.length === 0 ? (
              <p className="texto-sec">Sin movimientos en esta fecha.</p>
            ) : (
              <table className="tabla">
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
          </Card>
        )}
      </div>
    </main>
  );
}
