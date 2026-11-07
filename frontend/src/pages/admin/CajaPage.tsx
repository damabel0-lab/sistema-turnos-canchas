import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card, Button, Input } from '../../components/ui';
import { RefreshCw, List, DollarSign } from 'lucide-react';

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
  const [fecha] = useState(hoy());
  const [datos, setDatos] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const periodo: Periodo = 'dia';

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<Resumen>(`/caja/resumen?fecha=${fecha}&periodo=${periodo}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando caja');
    }
  }, [fecha]);

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
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Caja y finanzas
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void cargar()} className="px-4 py-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {mensaje && <p className="text-emerald-600 text-sm mb-4">{mensaje}</p>}

        {datos && (
          <>
            {/* Tarjetas de totales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card padded={false}>
                <div className="p-6">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Ingresos ({etiquetas[periodo].toLowerCase()})</div>
                  <div className="text-2xl font-bold text-emerald-600">${datos.ingresos}</div>
                </div>
              </Card>
              <Card padded={false}>
                <div className="p-6">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Egresos</div>
                  <div className="text-2xl font-bold text-red-600">${datos.egresos}</div>
                </div>
              </Card>
              <Card padded={false}>
                <div className="p-6">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Saldo</div>
                  <div className="text-2xl font-bold text-gray-900">${datos.saldo}</div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card padded={false}>
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <List className="w-4 h-4" />
                    Por método de pago
                  </h3>
                  {Object.keys(datos.por_metodo_pago).length === 0 ? (
                    <p className="text-gray-500 text-sm">Sin movimientos.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(datos.por_metodo_pago).map(([metodo, total]) => (
                        <div key={metodo} className="flex justify-between text-sm">
                          <span className="text-gray-600">{metodo}</span>
                          <span className="font-medium">${total}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
              <Card padded={false}>
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <List className="w-4 h-4" />
                    Por origen
                  </h3>
                  {datos.por_origen.length === 0 ? (
                    <p className="text-gray-500 text-sm">Sin movimientos.</p>
                  ) : (
                    <div className="space-y-2">
                      {datos.por_origen.map((o) => (
                        <div key={o.origen} className="flex justify-between text-sm">
                          <span className="text-gray-600">{o.origen}</span>
                          <span className="font-medium">${o.total}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card padded={false}>
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Movimientos</h3>
                  {datos.movimientos.length === 0 ? (
                    <p className="text-gray-500 text-sm">Sin movimientos en este período.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {datos.movimientos.map((m) => (
                        <div key={m.id} className="flex justify-between items-center py-2 border-b border-gray-50/50">
                          <div>
                            <div className="text-sm text-gray-900">{m.descripcion}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(m.fecha_hora).toLocaleString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{m.metodo_pago}</span>
                            <span
                              className={`text-sm font-medium ${
                                m.tipo_movimiento === 'ingreso' ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {m.tipo_movimiento === 'ingreso' ? '+' : '−'}${m.monto}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card padded={false}>
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Registrar egreso</h3>
                  <form onSubmit={registrarEgreso} className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-700 mb-1">Monto ($)</label>
                        <Input name="monto" type="number" min={1} required />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-700 mb-1">Método</label>
                        <select
                          name="metodo"
                          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                          <option value="mercado_pago">Mercado Pago</option>
                          <option value="tarjeta">Tarjeta</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-medium text-gray-700 mb-1">Descripción</label>
                      <Input
                        name="descripcion"
                        required
                        placeholder="Ej: Pago al encargado"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                      Registrar egreso
                    </button>
                  </form>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
