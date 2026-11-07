import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';

interface Socio {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  es_socio: boolean;
  creado_en: string;
}

export function SociosPage() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: '', apellido: '', telefono: '' });

  const cargar = useCallback(async () => {
    try {
      setSocios(await api<Socio[]>('/socios'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando socios');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function darDeAlta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await api('/socios', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nuevo.nombre,
          apellido: nuevo.apellido,
          telefono: nuevo.telefono,
        }),
      });
      setMensaje('Socio dado de alta ✅');
      setNuevo({ nombre: '', apellido: '', telefono: '' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dar de alta');
    }
  }

  async function darDeBaja(id: string) {
    if (!confirm('¿Quedar sin el beneficio de socio?')) return;
    try {
      await api(`/socios/${id}`, { method: 'DELETE' });
      setMensaje('Socio dado de baja ✅');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dar de baja');
    }
  }

  return (
    <main style={{ padding: 16, display: 'grid', gap: 20, maxWidth: 700 }}>
      <h1>Socios</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {mensaje && <p style={{ color: 'green' }}>{mensaje}</p>}

      <section>
        <h2>Dar de alta socio</h2>
        <form onSubmit={darDeAlta} style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
          <label>
            Nombre
            <br />
            <input
              required
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            />
          </label>
          <label>
            Apellido
            <br />
            <input
              required
              value={nuevo.apellido}
              onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })}
            />
          </label>
          <label>
            Teléfono
            <br />
            <input
              required
              value={nuevo.telefono}
              onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
            />
          </label>
          <button type="submit">Dar de alta</button>
        </form>
      </section>

      <section>
        <h2>Directorio de socios</h2>
        {socios.length === 0 ? (
          <p>No hay socios todavía.</p>
        ) : (
          <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Nombre y apellido</th>
                <th>Teléfono</th>
                <th>Desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {socios.map((s) => (
                <tr key={s.id}>
                  <td>{s.nombre} {s.apellido}</td>
                  <td>{s.telefono ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{s.creado_en?.slice(0, 10) ?? '—'}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => void darDeBaja(s.id)}
                      style={{ color: 'crimson' }}
                    >
                      Baja
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
