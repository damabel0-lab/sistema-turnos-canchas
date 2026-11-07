import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';

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
      // Reutilizamos el listado de socios; si no hay, buscamos usuarios generales
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
    <main style={{ padding: 16, display: 'grid', gap: 20, maxWidth: 600 }}>
      <h1>Vender abono / pase</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {mensaje && <p style={{ color: 'green' }}>{mensaje}</p>}

      <form onSubmit={vender} style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
        <label>
          Socio / cliente
          <br />
          <select
            required
            name="usuario_id"
            value={form.usuario_id}
            onChange={(e) => setForm({ ...form, usuario_id: e.target.value })}
          >
            <option value="">Elegir…</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} {u.apellido} ({u.telefono})
              </option>
            ))}
          </select>
        </label>
        <label>
          Disciplina (opcional, para abono de gym/pileta)
          <br />
          <select
            name="disciplina_id"
            value={form.disciplina_id}
            onChange={(e) => setForm({ ...form, disciplina_id: e.target.value })}
          >
            <option value="">Cualquiera</option>
            <option value="9">Gimnasio</option>
            <option value="10">Pileta</option>
          </select>
        </label>
        <label>
          Cantidad de clases
          <br />
          <input
            required
            name="clases_totales"
            type="number"
            min={1}
            value={form.clases_totales}
            onChange={(e) => setForm({ ...form, clases_totales: e.target.value })}
          />
        </label>
        <label>
          Fecha de vencimiento
          <br />
          <input
            required
            name="fecha_vencimiento"
            type="date"
            value={form.fecha_vencimiento}
            onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })}
          />
        </label>
        <label>
          Monto pagado ($)
          <br />
          <input
            required
            name="monto_pagado"
            type="number"
            min={0}
            step={0.01}
            value={form.monto_pagado}
            onChange={(e) => setForm({ ...form, monto_pagado: e.target.value })}
          />
        </label>
        <button type="submit">Vender abono</button>
      </form>
    </main>
  );
}
