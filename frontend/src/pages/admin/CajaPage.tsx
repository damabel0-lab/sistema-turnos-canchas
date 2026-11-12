import * as XLSX from 'xlsx';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { hoyISOLocal } from '../../lib/fecha';
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
  desde: string;
  hasta: string;
  ingresos: number;
  egresos: number;
  saldo: number;
  por_metodo_pago: Record<string, number>;
  por_origen: Array<{ origen: string; total: number; movimientos: number }>;
  movimientos: Movimiento[];
}

type PeriodoExport = 'dia' | 'semana' | 'mes' | 'anio' | 'historico';

const hoy = () => hoyISOLocal();
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
      const [reporte, cfg] = await Promise.all([
        api<Resumen>(`/caja/resumen?fecha=${fecha}&periodo=${periodoElegido}`),
        api<{ nombre: string | null; hora_apertura: number; hora_cierre: number }>('/config').catch(
          () => ({ nombre: null as null | string, hora_apertura: 8, hora_cierre: 23 }),
        ),
      ]);

      const nombreComplejo = cfg?.nombre ?? 'PlayControl';
      const diaHoraApertura = `${String(cfg?.hora_apertura ?? 8).padStart(2, '0')}:00`;
      const diaHoraCierre = `${String(cfg?.hora_cierre ?? 23).padStart(2, '0')}:00`;
      const desdeLocal = new Date(reporte.desde).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const hastaLocal = new Date(new Date(reporte.hasta).getTime() - new Date().getTimezoneOffset() * 60_000).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const periodoLabel = etiquetasPeriodo[periodoElegido] ?? 'Histórico';
      const monedaFmt = '"$"#,##0;[Red]-"$"#,##0';

      // Construcción de celdas con estilos
      const aoa: unknown[][] = [
        ['PlayControl'],
        [`${nombreComplejo} · Cierre de caja`],
        [`${periodoLabel} · del ${desdeLocal} al ${hastaLocal} · horario operativo ${diaHoraApertura}–${diaHoraCierre}`],
        [],
        ['Fecha y hora', 'Tipo', 'Descripción', 'Método', 'Monto ($)'],
      ];

      for (const m of reporte.movimientos) {
        const signo = m.tipo_movimiento === 'ingreso' ? 1 : -1;
        aoa.push([
          new Date(m.fecha_hora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
          m.tipo_movimiento,
          m.descripcion,
          m.metodo_pago,
          signo * Number(m.monto),
        ]);
      }

      // Totales
      const filaTotalesIngreso = aoa.length; // marcamos filas desde acá hacia abajo
      aoa.push(['', '', '', 'TOTAL INGRESOS', reporte.ingresos]);
      aoa.push(['', '', '', 'TOTAL EGRESOS', reporte.egresos]);
      aoa.push(['', '', '', 'SALDO', reporte.saldo]);

      // Por origen
      if (reporte.por_origen.length > 0) {
        aoa.push([]);
        aoa.push(['', '', '', 'ORIGEN', 'TOTAL']);
        for (const o of reporte.por_origen) {
          aoa.push(['', '', '', `${o.origen} (${o.movimientos} mov)`, o.total]);
        }
      }
      // Por método
      const metodos = Object.entries(reporte.por_metodo_pago);
      if (metodos.length > 0) {
        aoa.push([]);
        aoa.push(['', '', '', 'MÉTODO', 'TOTAL']);
        for (const [m, total] of metodos) {
          aoa.push(['', '', '', m, total]);
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa as unknown as string[][]);

      // Ancho de columnas
      ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 55 }, { wch: 18 }, { wch: 18 }];

      // Fusión de líneas del encabezado
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
      ];
      // Congelar encabezado
      ws['!freeze'] = { xSplit: 0, ySplit: 5 };

      // Estilos (bold / colores / fills / formato moneda) — el .d.ts no tipa "s", usamos any
      const setStyle = (r: number, c: number, s: Record<string, unknown>) => {
        const ref = XLSX.utils.encode_cell({ r, c });
        const cell = (ws as Record<string, { v?: unknown; s?: Record<string, unknown> }>)[ref];
        if (cell) cell.s = s;
      };

      const fontCenter = (bold: boolean, size: number, color = 'FF111827') => ({ font: { bold, sz: size, color: { rgb: color } }, alignment: { horizontal: 'left' as const } });
      const fill = (rgb: string) => ({ fill: { patternType: 'solid', fgColor: { rgb } } });
      const borderThin = {
        top: { style: 'thin' as const, color: { rgb: 'FFE5E7EB' } },
        bottom: { style: 'thin' as const, color: { rgb: 'FFE5E7EB' } },
        left: { style: 'thin' as const, color: { rgb: 'FFE5E7EB' } },
        right: { style: 'thin' as const, color: { rgb: 'FFE5E7EB' } },
      };
      const whiteBold = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFFFF' } }, alignment: { horizontal: 'center' as const } };

      // Fila 1 (título)
      setStyle(0, 0, { ...fontCenter(true, 22), ...fill('FF111827') });
      // Fila 2 (complejo)
      setStyle(1, 0, { ...fontCenter(true, 14, 'FF34D399'), ...fill('FF111827') });
      // Fila 3 (período)
      setStyle(2, 0, { ...fontCenter(false, 9, 'FF9CA3AF'), ...fill('FF111827') });

      // Encabezados columna (fila 5)
      for (let c = 0; c < 5; c++) {
        setStyle(4, c, { ...whiteBold, ...fill('FF047857'), border: borderThin });
      }

      // Filas de datos (zebra stripes light y derecha para monto)
      for (let r = 5; r < filaTotalesIngreso; r++) {
        const esZebra = (r - 5) % 2 === 1;
        for (let c = 0; c < 5; c++) {
          setStyle(r, c, { border: borderThin, fill: esZebra ? fill('FFF9FAFB') : undefined, alignment: { horizontal: c === 4 ? 'right' : 'left' } });
        }
        // Columna monto: formato moneda
        const ref = XLSX.utils.encode_cell({ r, c: 4 });
        const montoCell = (ws as Record<string, { z?: string }>)[ref];
        if (montoCell) montoCell.z = monedaFmt;
      }

      // Filas de totales: borde superior fuerte, bold
      for (let r = filaTotalesIngreso; r < filaTotalesIngreso + 3; r++) {
        for (let c = 0; c < 5; c++) {
          const ref = XLSX.utils.encode_cell({ r, c });
          const cell = (ws as Record<string, { s?: Record<string, unknown> }>)[ref];
          if (cell) {
            cell.s = { border: { top: { style: 'medium' as const, color: { rgb: 'FF111827' } } }, font: { bold: true }, alignment: { horizontal: c === 4 ? 'right' : 'left' } };
          }
        }
        const totalRef = XLSX.utils.encode_cell({ r, c: 4 });
        const totalCell = (ws as Record<string, { z?: string }>)[totalRef];
        if (totalCell) totalCell.z = monedaFmt;
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Cierre');
      const nombreArchivo = `caja-${periodoElegido}-${fecha.replace(/-/g, '')}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
      mostrar('Reporte descargado en Excel.', 'success');
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
