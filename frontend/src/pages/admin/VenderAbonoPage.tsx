import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
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
      setUsuarios(await api<UsuarioSimple[]>('/socios'));
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
    <div className="admin-page">
      <div className="contenedor-estrecho">
        <h1 className="titulo"><span className="fila"><CreditCard size={20} /> Vender abono / pase</span></h1>
        {error && <p style={{ color: 'var(--peligro)' }}>{error}</p>}
        {mensaje && <p style={{ color: 'var(--exito)' }}>{mensaje}</p>}

        <Card>
          <form onSubmit={vender} className="stack">
            <label className="label">Socio / cliente
              <select required value={form.usuario_id} onChange={(e) => setForm({ ...form, usuario_id: e.target.value })} className="input">
                <option value="">Elegir…</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.apellido} ({u.telefono})
                  </option>
                ))}
              </select>
            </label>
            <label className="label">Disciplina (opcional)
              <select value={form.disciplina_id} onChange={(e) => setForm({ ...form, disciplina_id: e.target.value })} className="input">
                <option value="">Cualquiera</option>
                <option value="9">Gimnasio</option>
                <option value="10">Pileta</option>
              </select>
            </label>
            <label className="label">Cantidad de clases<input required type="number" min={1} value={form.clases_totales} onChange={(e) => setForm({ ...form, clases_totales: e.target.value })} className="input" /></label>
            <label className="label">Fecha de vencimiento<input required type="date" value={form.fecha_vencimiento} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} className="input" /></label>
            <label className="label">Monto pagado ($)<input required type="number" min={0} step="0.01" value={form.monto_pagado} onChange={(e) => setForm({ ...form, monto_pagado: e.target.value })} className="input" /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="boton boton-primario"><Plus size={16} /> Vender abono</button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
