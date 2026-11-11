import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { DollarSign, List, RefreshCw, Download } from 'lucide-react';

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

const hoy = () => new Date().toISOString().slice(0, 10);
const etiquetasPeriodo: Record<string, string> = { dia: 'Día', semana: 'Semana', mes: 'Mes' };

export function CajaPage() {
  const [fecha] = useState(hoy());
  const [periodo] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [datos, setDatos] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

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
    const form = new FormData(e.currentTarget);
    setError(null);
    setMensaje(null);
    try {
      await api('/caja/egresos', {
        method: 'POST',
        body: JSON.stringify({
          monto: Number(form.get('monto')),
          metodo_pago: String(form.get('metodo')),
          descripcion: String(form.get('descripcion')),
        }),
      });
      setMensaje('Egreso registrado ✅');
      e.currentTarget.reset();
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar');
    }
  }

  function descargarCsv() {
    if (!datos) return;
    const encabezados = ['Fecha y hora', 'Tipo', 'Descripción', 'Método', 'Monto'];
    const filas = datos.movimientos.map((m) => [
      new Date(m.fecha_hora).toLocaleString('es-AR'),
      m.tipo_movimiento,
      m.descripcion,
      m.metodo_pago,
      m.tipo_movimiento === 'ingreso' ? `+$${m.monto}` : `-$${m.monto}`,
    ]);

    const csv = [encabezados, ...filas]
      .map((fila) =>
        fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(',')
      )
      .join('\r\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caja-${fecha}-${periodo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const etiquetasOrigenOrdenadas = datos?.por_origen.slice().sort((a, b) => b.total - a.total) ?? [];

  return (
    <main className="pantalla">
      <div className="contenedor-ancho">
        <div className="fila-entre" style={{ marginBottom: '0.75rem' }}>
          <h1 className="titulo"><span className="fila"><DollarSign size={20} /> Caja y finanzas</span></h1>
          <div className="fila">
            <button className="boton boton-outline" onClick={() => void cargar()}>
              <RefreshCw size={16} /> Actualizar
            </button>
            <button className="boton boton-outline" onClick={descargarCsv}>
              <Download size={16} /> Exportar CSV
            </button>
          </div>
        </div>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        {mensaje && <p style={{ color: '#10b981' }}>{mensaje}</p>}

        {datos && (
          <>
            {/* Tarjetas de totales */}
            <div className="grilla-tarjetas" style={{ marginBottom: '1rem' }}>
              <Card>
                <div className="texto-sec" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Ingresos ({etiquetasPeriodo[periodo].toLowerCase()})</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>${datos.ingresos}</div>
              </Card>
              <Card>
                <div className="texto-sec" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Egresos</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>${datos.egresos}</div>
              </Card>
              <Card>
                <div className="texto-sec" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Saldo</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${datos.saldo}</div>
              </Card>
            </div>

            <div className="grilla-tarjetas" style={{ marginBottom: '1rem' }}>
              <Card>
                <h3 className="titulo" style={{ fontSize: '0.95rem' }}><span className="fila"><List size={16} /> Por método de pago</span></h3>
                {Object.keys(datos.por_metodo_pago).length === 0 ? (
                  <p className="texto-sec">Sin movimientos.</p>
                ) : (
                  <table className="tabla">
                    <tbody>
                      {Object.entries(datos.por_metodo_pago).map(([metodo, total]) => (
                        <tr key={metodo}>
                          <td>{metodo}</td>
                          <td style={{ textAlign: 'right' }}>${total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
              <Card>
                <h3 className="titulo" style={{ fontSize: '0.95rem' }}><span className="fila"><List size={16} /> Por origen</span></h3>
                {etiquetasOrigenOrdenadas.length === 0 ? (
                  <p className="texto-sec">Sin movimientos.</p>
                ) : (
                  <table className="tabla">
                    <tbody>
                      {etiquetasOrigenOrdenadas.map((o) => (
                        <tr key={o.origen}>
                          <td>{o.origen} ({o.movimientos})</td>
                          <td style={{ textAlign: 'right' }}>${o.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>

            <Card>
              <h3 className="titulo" style={{ fontSize: '0.95rem' }}>Movimientos</h3>
              {datos.movimientos.length === 0 ? (
                <p className="texto-sec">Sin movimientos en este período.</p>
              ) : (
                <div className="stack" style={{ maxHeight: '22rem', overflowY: 'auto' }}>
                  {datos.movimientos.map((m) => (
                    <div key={m.id} className="fila-entre" style={{ padding: '0.4rem 0', borderBottom: '1px solid #f3f4f6' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem' }}>{m.descripcion}</div>
                        <div className="texto-sec" style={{ fontSize: '0.75rem' }}>
                          {new Date(m.fecha_hora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="fila" style={{ gap: '0.5rem' }}>
                        <span className="texto-sec" style={{ fontSize: '0.75rem' }}>{m.metodo_pago}</span>
                        <span style={{ fontWeight: 600, color: m.tipo_movimiento === 'ingreso' ? '#10b981' : '#ef4444' }}>
                          {m.tipo_movimiento === 'ingreso' ? '+' : '−'}${m.monto}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="titulo" style={{ fontSize: '0.95rem' }}>Registrar egreso</h3>
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
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="boton boton-primario">Registrar egreso</button>
                </div>
              </form>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
