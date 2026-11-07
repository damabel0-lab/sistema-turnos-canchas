import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';

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

type Periodo = 'dia' | 'semana' | 'mes';

const hoy = () => new Date().toISOString().slice(0, 10);
const etiquetas: Record<Periodo, string> = { dia: 'Día', semana: 'Semana', mes: 'Mes' };

export function CajaPage() {
  const [fecha, setFecha] = useState(hoy());
  const [periodo, setPeriodo] = useState<Periodo>('dia');
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

  return (
    <main style={{ padding: 16, display: 'grid', gap: 20, maxWidth: 860 }}>
      <h1>Caja y finanzas</h1>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Fecha{' '}
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <div style={{ display: 'flex', gap: 4 }}>
          {(Object.keys(etiquetas) as Periodo[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              style={{
                padding: '6px 14px',
                background: periodo === p ? '#1a73e8' : '#eee',
                color: periodo === p ? '#fff' : '#000',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {etiquetas[p]}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void cargar()}>Actualizar</button>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {mensaje && <p style={{ color: 'green' }}>{mensaje}</p>}

      {datos && (
        <>
          {/* Totales */}
          <section style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, minWidth: 150 }}>
              <div style={{ fontSize: 13, color: '#555' }}>Ingresos ({etiquetas[periodo].toLowerCase()})</div>
              <div style={{ fontSize: 26, color: 'green' }}>${datos.ingresos}</div>
            </div>
            <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, minWidth: 150 }}>
              <div style={{ fontSize: 13, color: '#555' }}>Egresos</div>
              <div style={{ fontSize: 26, color: 'crimson' }}>${datos.egresos}</div>
            </div>
            <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, minWidth: 150 }}>
              <div style={{ fontSize: 13, color: '#555' }}>Saldo</div>
              <div style={{ fontSize: 26 }}>${datos.saldo}</div>
            </div>
          </section>

          {/* Por método de pago y origen */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div>
              <h3>Por método de pago</h3>
              {Object.keys(datos.por_metodo_pago).length === 0 ? (
                <p style={{ color: '#666' }}>Sin movimientos.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.entries(datos.por_metodo_pago).map(([metodo, total]) => (
                      <tr key={metodo}>
                        <td style={{ padding: 4 }}>{metodo}</td>
                        <td style={{ padding: 4, textAlign: 'right' }}>${total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <h3>Por origen</h3>
              {datos.por_origen.length === 0 ? (
                <p style={{ color: '#666' }}>Sin movimientos.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {datos.por_origen.map((o) => (
                      <tr key={o.origen}>
                        <td style={{ padding: 4 }}>
                          {o.origen} <span style={{ color: '#888', fontSize: 12 }}>({o.movimientos})</span>
                        </td>
                        <td style={{ padding: 4, textAlign: 'right' }}>${o.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* Detalle */}
          <section>
            <h3>Movimientos ({datos.movimientos.length})</h3>
            {datos.movimientos.length === 0 ? (
              <p style={{ color: '#666' }}>No hay movimientos en este período.</p>
            ) : (
              <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Descripción</th>
                    <th>Método</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.movimientos.map((m) => (
                    <tr key={m.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(m.fecha_hora).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>{m.descripcion}</td>
                      <td>{m.metodo_pago}</td>
                      <td
                        style={{
                          textAlign: 'right',
                          color: m.tipo_movimiento === 'ingreso' ? 'green' : 'crimson',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.tipo_movimiento === 'ingreso' ? '+' : '−'}${m.monto}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Egreso manual */}
          <section style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Registrar egreso</h3>
            <form onSubmit={registrarEgreso} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
              <label>
                Monto ($)
                <br />
                <input name="monto" type="number" min={1} required style={{ width: 110 }} />
              </label>
              <label>
                Método
                <br />
                <select name="metodo">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </label>
              <label>
                Descripción
                <br />
                <input name="descripcion" required placeholder="Ej: Pago al encargado" style={{ width: 240 }} />
              </label>
              <button type="submit">Registrar</button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
