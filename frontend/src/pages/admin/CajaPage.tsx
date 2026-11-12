import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import {
  DollarSign,
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  Trash2,
  Printer,
} from 'lucide-react';

interface Movimiento {
  id: number;
  fecha_hora: string;
  tipo_movimiento: string;
  monto: number;
  metodo_pago: string;
  descripcion: string;
}

interface Resumen {
  ingresos: number;
  egresos: number;
  saldo: number;
  por_metodo_pago: Record<string, number>;
  por_origen: Array<{ origen: string; total: number; movimientos: number }>;
  movimientos: Movimiento[];
}

type PeriodoExport = 'dia' | 'semana' | 'mes' | 'anio' | 'historico';

const hoy = () => new Date().toISOString().slice(0, 10);
const etiquetasPeriodo: Record<string, string> = {
  dia: 'Día operativo',
  semana: 'Esta semana',
  mes: 'Este mes',
  anio: 'Este año',
  historico: 'Histórico completo',
};
const precio = (n: number) => `$${n.toLocaleString('es-AR')}`;

export function CajaPage() {
  const navigate = useNavigate();
  const [fecha] = useState(hoy());
  const [periodo] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [periodoExport, setPeriodoExport] = useState<PeriodoExport>('dia');
  const [datos, setDatos] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toasts, mostrar, cerrar } = useToast();

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<Resumen>(`/caja/resumen?fecha=${fecha}&periodo=${periodo}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando caja');
    }
  }, [fecha, periodo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function registrarEgreso(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setError(null);
    try {
      await api('/caja/egresos', {
        method: 'POST',
        body: JSON.stringify({
          monto: Number(form.get('monto')),
          metodo_pago: String(form.get('metodo')),
          descripcion: String(form.get('descripcion')),
        }),
      });
      mostrar('Egreso registrado', 'success');
      formEl.reset();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar');
    }
  }

  async function descargarReporte(periodoElegido: PeriodoExport) {
    try {
      const reporte = await api<Resumen>(`/caja/resumen?fecha=${fecha}&periodo=${periodoElegido}`);
      const encabezados = ['Fecha y hora', 'Tipo', 'Descripción', 'Método', 'Monto ($)'];
      const filasCsv: string[][] = [encabezados];
      for (const m of reporte.movimientos) {
        filasCsv.push([
          new Date(m.fecha_hora).toLocaleString('es-AR'),
          m.tipo_movimiento,
          m.descripcion,
          m.metodo_pago,
          (m.tipo_movimiento === 'ingreso' ? '+' : '-') + String(m.monto),
        ]);
      }
      filasCsv.push(['', '', '', 'TOTAL INGRESOS', String(reporte.ingresos)]);
      filasCsv.push(['', '', '', 'TOTAL EGRESOS', String(reporte.egresos)]);
      filasCsv.push(['', '', '', 'SALDO', String(reporte.saldo)]);
      const csv = filasCsv
        .map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `caja-${periodoElegido}-${fecha}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      mostrar('Reporte descargado.', 'success');
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'No se pudo descargar el reporte', 'danger');
    }
  }

  const origenOrdenado = datos?.por_origen.slice().sort((a, b) => b.total - a.total) ?? [];

  return (
    <div className="admin-page">
      {/* Encabezado */}
      <header className="pagina-encabezado">
        <div>
          <span className="pagina-eyebrow">Finanzas › Caja</span>
          <h1 className="pagina-titulo">Caja y finanzas</h1>
          <p className="pagina-sub">Ingresos, egresos y saldo del {etiquetasPeriodo[periodo].toLowerCase()}.</p>
        </div>
        <div className="fila" style={{ gap: '0.5rem' }}>
          <button type="button" className="boton boton-outline" onClick={() => void cargar()}>
            <RefreshCw size={15} /> Actualizar
          </button>
          <button type="button" className="boton boton-outline" onClick={() => navigate('/admin/caja/cierre')} aria-label="Generar cierre de caja imprimible">
            <Printer size={15} /> Cierre de caja (PDF)
          </button>
        </div>
      </header>

      {error && <div className="alerta-error" role="alert">{error}</div>}
      <ToastContainer toasts={toasts} onCerrar={cerrar} />

      {datos && (
        <>
          {/* Totales en fila */}
          <div className="metricas" style={{ marginBottom: '0.9rem' }}>
            <div className="metrica">
              <div className="metrica-icono verde"><TrendingUp size={19} /></div>
              <div className="metrica-label">Ingresos ({etiquetasPeriodo[periodo].toLowerCase()})</div>
              <div className="metrica-valor">{precio(datos.ingresos)}</div>
            </div>
            <div className="metrica">
              <div className="metrica-icono rojo"><TrendingDown size={19} /></div>
              <div className="metrica-label">Egresos</div>
              <div className="metrica-valor">{precio(datos.egresos)}</div>
            </div>
            <div className="metrica">
              <div className="metrica-icono azul"><DollarSign size={19} /></div>
              <div className="metrica-label">Saldo</div>
              <div className="metrica-valor">{precio(datos.saldo)}</div>
            </div>
            <div className="metrica">
              <div className="metrica-icono ambar"><TrendingUp size={19} /></div>
              <div className="metrica-label">Movimientos</div>
              <div className="metrica-valor">{datos.movimientos.length}</div>
            </div>
          </div>

          {/* Exportar reporte */}
          <div className="panel" style={{ marginBottom: '0.9rem' }}>
            <div className="panel-header"><span className="panel-titulo">Exportar reporte</span></div>
            <div className="panel-body" style={{ padding: '0.75rem 0.9rem' }}>
              <div className="fila-entre" style={{ gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                <span className="texto-debil">Alcance del reporte</span>
                <div className="fila" style={{ gap: '0.25rem' }}>
                  {(['dia', 'semana', 'mes', 'anio', 'historico'] as PeriodoExport[]).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setPeriodoExport(op)}
                      className="boton"
                      style={{ padding: '0.35rem 0.7rem', fontSize: '0.82rem', background: periodoExport === op ? 'linear-gradient(135deg, var(--primario-2), var(--primario))' : 'var(--bg-surface-2)', color: periodoExport === op ? 'var(--primario-contrast)' : 'var(--texto-2)', boxShadow: periodoExport === op ? 'var(--glow)' : 'none' }}
                    >
                      {etiquetasPeriodo[op]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="fila-entre" style={{ gap: '0.5rem' }}>
                <p className="texto-debil" style={{ margin: 0, fontSize: '0.78rem' }}>El día operativo va de apertura del complejo a apertura del día siguiente. Se genera CSV con totales sumados.</p>
                <button type="button" className="boton boton-primario" onClick={() => descargarReporte(periodoExport)}>
                  <Download size={15} /> Descargar reporte
                </button>
              </div>
            </div>
          </div>

          {/* Resumen 2 columnas */}
          <div className="grilla-2-col" style={{ gap: '0.9rem', marginBottom: '0.9rem' }}>
            <section className="panel panel-con-altura">
              <div className="panel-header"><span className="panel-titulo">Por origen y método</span></div>
              <div className="panel-body" style={{ padding: '0.75rem 0.9rem' }}>
                <div>
                  <div className="stat-label" style={{ marginBottom: '0.4rem' }}>Por método de pago</div>
                  {Object.keys(datos.por_metodo_pago).length === 0 ? (
                    <p className="texto-sec" style={{ margin: 0 }}>Sin movimientos.</p>
                  ) : (
                    <table className="tabla" style={{ width: '100%' }}>
                      <tbody>
                        {Object.entries(datos.por_metodo_pago).map(([metodo, total]) => (
                          <tr key={metodo}>
                            <td style={{ textTransform: 'capitalize' }}>{metodo}</td>
                            <td style={{ textAlign: 'right' }}>{precio(total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div>
                  <div className="stat-label" style={{ margin: '0.4rem 0' }}>Por origen</div>
                  {origenOrdenado.length === 0 ? (
                    <p className="texto-sec" style={{ margin: 0 }}>Sin movimientos.</p>
                  ) : (
                    <table className="tabla" style={{ width: '100%' }}>
                      <tbody>
                        {origenOrdenado.map((o) => (
                          <tr key={o.origen}>
                            <td>{o.origen} <span className="texto-debil">({o.movimientos})</span></td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{precio(o.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </section>

            <aside className="panel panel-con-altura">
              <div className="panel-header"><span className="panel-titulo">Registrar egreso</span></div>
              <div className="panel-body">
                <form onSubmit={registrarEgreso} className="stack">
                  <label className="label">Monto ($)<input name="monto" type="number" min={1} required className="input" /></label>
                  <label className="label">Método
                    <select name="metodo" className="input">
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="mercado_pago">Mercado Pago</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </label>
                  <label className="label">Descripción<input name="descripcion" required placeholder="Ej: Pago al encargado" className="input" /></label>
                  <button type="submit" className="boton boton-primario boton-block">Registrar egreso</button>
                </form>
              </div>
            </aside>
          </div>

          {/* Movimientos */}
          <section className="panel">
            <div className="panel-header">
              <span className="panel-titulo">Últimos movimientos</span>
              <span className="texto-debil">{datos.movimientos.length} total</span>
            </div>
            <div className="panel-body" style={{ maxHeight: '420px', overflowY: 'auto', gap: '0.4rem' }}>
              {datos.movimientos.length === 0 ? (
                <p className="texto-sec" style={{ padding: '1rem', margin: 0 }}>Sin movimientos en este período.</p>
              ) : (
                datos.movimientos.map((m) => {
                  const esIngreso = m.tipo_movimiento === 'ingreso';
                  return (
                    <div key={m.id} className="item-turno">
                      <div className="item-turno-icono" style={{ background: esIngreso ? 'var(--primario-soft)' : 'color-mix(in srgb, var(--peligro) 15%, transparent)' }}>
                        {esIngreso ? <TrendingUp size={16} /> : <Trash2 size={16} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="item-turno-nombre">{m.descripcion}</div>
                        <div className="item-turno-meta">
                          {new Date(m.fecha_hora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          {' · '}{m.metodo_pago}
                        </div>
                      </div>
                      <div style={{ fontWeight: 750, letterSpacing: '-0.02em', fontSize: '1rem', color: esIngreso ? 'var(--exito)' : 'var(--peligro)' }}>
                        {esIngreso ? '+' : '−'}{precio(m.monto)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
