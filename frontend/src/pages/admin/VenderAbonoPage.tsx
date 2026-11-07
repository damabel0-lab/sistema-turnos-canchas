import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card, Button } from '../../components/ui';
import { CreditCard, Plus } from 'lucide-react';

interface UsuarioSimple {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
}

export function VenderAbonoPage() {
  const [usuarios, setUsuarios] = useState<UsuarioSimple[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [form, setForm] = useState({
    usuario_id: '',
    disciplina_id: '',
    clases_totales: '',
    fecha_vencimiento: '',
    monto_pagado: '',
  });

  const cargarUsuarios = useCallback(async () => {
    try {
      const data = await api<UsuarioSimple[]>('/socios');
      setUsuarios(data);
    } catch {
      setUsuarios([]);
    }
  }, []);

  useEffect(() => {
    void cargarUsuarios();
  }, [cargarUsuarios]);

  async function vender(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await api('/abonos', {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: form.usuario_id,
          disciplina_id: form.disciplina_id || null,
          clases_totales: Number(form.clases_totales),
          fecha_vencimiento: form.fecha_vencimiento,
          monto_pagado: Number(form.monto_pagado),
        }),
      });
      setMensaje('Abono vendido ✅');
      setForm({ usuario_id: '', disciplina_id: '', clases_totales: '', fecha_vencimiento: '', monto_pagado: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo vender el abono');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Vender abono / pase
          </h1>
          <Button variant="outline" onClick={() => void cargarUsuarios()} className="px-4 py-2">
            Actualizar
          </Button>
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {mensaje && <p className="text-emerald-600 text-sm mb-4">{mensaje}</p>}

        <Card padded={false}>
          <div className="p-6">
            <form onSubmit={vender} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Socio / cliente</label>
                <select
                  required
                  name="usuario_id"
                  value={form.usuario_id}
                  onChange={(e) => setForm({ ...form, usuario_id: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Elegir…</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} {u.apellido} ({u.telefono})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Disciplina (opcional)</label>
                <select
                  name="disciplina_id"
                  value={form.disciplina_id}
                  onChange={(e) => setForm({ ...form, disciplina_id: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Cualquiera</option>
                  <option value="9">Gimnasio</option>
                  <option value="10">Pileta</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Cantidad de clases</label>
                <input
                  required
                  name="clases_totales"
                  type="number"
                  min={1}
                  value={form.clases_totales}
                  onChange={(e) => setForm({ ...form, clases_totales: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
                <input
                  required
                  name="fecha_vencimiento"
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 mb-1">Monto pagado ($)</label>
                <input
                  required
                  name="monto_pagado"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.monto_pagado}
                  onChange={(e) => setForm({ ...form, monto_pagado: e.target.value })}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col items-end">
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
                  <Plus className="w-4 h-4 mr-2" />
                  Vender abono
                </button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </main>
  );
}
