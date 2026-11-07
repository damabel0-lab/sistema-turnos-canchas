import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';

interface Beneficio {
  id: number;
  nombre_beneficio: string;
  descuento_porcentaje: number;
  aplica_en: string;
}

export function BeneficiosPage() {
  const [beneficios, setBeneficios] = useState<Beneficio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({
    nombre_beneficio: '',
    descuento_porcentaje: '',
    aplica_en: 'cancha',
  });

  const cargar = useCallback(async () => {
    try {
      setBeneficios(await api<Beneficio[]>('/beneficios'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando beneficios');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function crear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      await api('/beneficios', {
        method: 'POST',
        body: JSON.stringify({
          nombre_beneficio: nuevo.nombre_beneficio,
          descuento_porcentaje: Number(nuevo.descuento_porcentaje),
          aplica_en: nuevo.aplica_en,
        }),
      });
      setMensaje('Beneficio creado ✅');
      setNuevo({ nombre_beneficio: '', descuento_porcentaje: '', aplica_en: 'cancha' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear');
    }
  }

  async function borrar(id: number) {
    if (!confirm('¿Eliminar este beneficio?')) return;
    try {
      await api(`/beneficios/${id}`, { method: 'DELETE' });
      setMensaje('Beneficio eliminado ✅');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  return (
    <main style={{ padding: 16, display: 'grid', gap: 20, maxWidth: 700 }}>
      <h1>Beneficios de socios</h1>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {mensaje && <p style={{ color: 'green' }}>{mensaje}</p>}

      <section>
        <h2>Catálogo de beneficios</h2>
        <form onSubmit={crear} style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
          <label>
            Nombre del beneficio
            <br />
            <input
              required
              value={nuevo.nombre_beneficio}
              onChange={(e) => setNuevo({ ...nuevo, nombre_beneficio: e.target.value })}
            />
          </label>
          <label>
            Descuento (%)
            <br />
            <input
              required
              type="number"
              min={0}
              max={100}
              step={1}
              value={nuevo.descuento_porcentaje}
              onChange={(e) => setNuevo({ ...nuevo, descuento_porcentaje: e.target.value })}
            />
          </label>
          <label>
            Aplica en
            <br />
            <select
              value={nuevo.aplica_en}
              onChange={(e) => setNuevo({ ...nuevo, aplica_en: e.target.value })}
            >
              <option value="cancha">Cancha</option>
              <option value="gimnasio">Gimnasio</option>
              <option value="pileta">Pileta</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <button type="submit">Crear beneficio</button>
        </form>
      </section>

      <section>
        <h2>Beneficios activos</h2>
        {beneficios.length === 0 ? (
          <p>No hay beneficios cargados todavía.</p>
        ) : (
          <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descuento</th>
                <th>Aplica en</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {beneficios.map((b) => (
                <tr key={b.id}>
                  <td>{b.nombre_beneficio}</td>
                  <td>{b.descuento_porcentaje} %</td>
                  <td>{b.aplica_en}</td>
                  <td>
                    <button type="button" onClick={() => void borrar(b.id)} style={{ color: 'crimson' }}>
                      Borrar
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
