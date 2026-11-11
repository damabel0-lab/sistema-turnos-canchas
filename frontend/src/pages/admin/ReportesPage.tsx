import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Calendar, DollarSign, RefreshCw, ChevronDown } from 'lucide-react';

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

  const ordenados = reporte?.por_disciplina.slice().sort((a, b) => b.total - a.total) ?? [];
  const totalMovimientos = ordenados.reduce((s, d) => s + d.movimientos, 0);
  const promedio = reporte && reporte.por_disciplina.length > 0 ? Math.round(reporte.total_general / Math.max(totalMovimientos, 1)) : 0;

  return (
    <div className="admin-page">
      {/* Encabezado */}
      <header className="pagina-encabezado">
        <div>
          <span className="pagina-eyebrow">Finanzas › Reportes</span>
          <h1 className="pagina-titulo">Reportes y estadísticas</h1>
          <p className="pagina-sub">Detalle de recaudación por disciplina y origen en la fecha indicada.</p>
        </div>
        <div className="fila" style={{ gap: '0.5rem' }}>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="input"
            style={{ width: 'auto' }}
            aria-label="Fecha del reporte"
          />
          <button type="button" className="boton boton-outline" onClick={() => void cargar()}>
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>
      </header>

      {error && <div className="alerta-error" role="alert">{error}</div>}

      {reporte && (
        <>
          {/* Strip de métricas */}
          <div className="metricas" style={{ marginBottom: '1rem' }}>
            <div className="metrica">
              <div className="metrica-icono verde"><DollarSign size={19} /></div>
              <div className="metrica-label">Recaudación total</div>
              <div className="metrica-valor">${reporte.total_general.toLocaleString('es-AR')}</div>
            </div>
            <div className="metrica">
              <div className="metrica-icono azul"><Calendar size={19} /></div>
              <div className="metrica-label">Fecha</div>
              <div className="metrica-valor" style={{ fontSize: '1.1rem', lineHeight: 1.3 }}>
                {new Date(reporte.desde).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div className="metrica">
              <div className="metrica-icono ambar"><ChevronDown size={19} /></div>
              <div className="metrica-label">Movimientos</div>
              <div className="metrica-valor">{totalMovimientos}</div>
            </div>
            <div className="metrica">
              <div className="metrica-icono verde"><DollarSign size={19} /></div>
              <div className="metrica-label">Promedio por turno</div>
              <div className="metrica-valor">${promedio.toLocaleString('es-AR')}</div>
            </div>
          </div>

          {/* Layout 2 columnas */}
          <div className="grilla-2-col" style={{ gap: '0.9rem' }}>
            {/* Detalle por origen */}
            <section className="panel">
              <div className="panel-header"><span className="panel-titulo">Detalle por origen</span></div>
              <div className="panel-body" style={{ padding: '0.5rem 0.85rem' }}>
                {ordenados.length === 0 ? (
                  <p className="texto-sec" style={{ padding: '1rem' }}>Sin movimientos en esta fecha.</p>
                ) : (
                  <table className="tabla" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Origen</th>
                        <th style={{ textAlign: 'center' }}>Mov.</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenados.map((d) => (
                        <tr key={d.origen}>
                          <td style={{ fontWeight: 600 }}>{d.origen}</td>
                          <td style={{ textAlign: 'center' }}>{d.movimientos}</td>
                          <td style={{ textAlign: 'right', fontWeight: 750, letterSpacing: '-0.01em' }}>${d.total.toLocaleString('es-AR')}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ fontWeight: 800, borderTop: '1px solid var(--border-strong)', paddingTop: '0.5rem' }}>TOTAL</td>
                        <td style={{ textAlign: 'center', fontWeight: 800, borderTop: '1px solid var(--border-strong)', paddingTop: '0.5rem' }}>{totalMovimientos}</td>
                        <td style={{ textAlign: 'right', fontWeight: 900, borderTop: '1px solid var(--border-strong)', paddingTop: '0.5rem' }}>${reporte.total_general.toLocaleString('es-AR')}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* Distribución visual */}
            <section className="panel">
              <div className="panel-header"><span className="panel-titulo">Distribución por origen</span></div>
              <div className="panel-body" style={{ padding: '1rem', gap: '0.85rem' }}>
                {ordenados.length === 0 ? (
                  <p className="texto-sec">Cargá una fecha con movimientos para ver la distribución.</p>
                ) : (
                  ordenados.map((d) => {
                    const pct = reporte.total_general > 0 ? (d.total / reporte.total_general) * 100 : 0;
                    return (
                      <div key={d.origen} className="reporte-barra-item">
                        <div className="fila-entre" style={{ fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600 }}>{d.origen}</span>
                          <span className="texto-sec">
                            <strong style={{ color: 'var(--texto)' }}>${d.total.toLocaleString('es-AR')}</strong>
                            {' '}· {pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="reporte-barra-track">
                          <div className="reporte-barra" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
