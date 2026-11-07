import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

interface Deporte {
  id: number;
  nombre: string;
  tipo: string;
  requiere_cancha: boolean;
}

interface Cancha {
  id: number;
  nombre: string;
  deporte_id: number | null;
  precio_base: number;
  activa: boolean;
  caracteristicas: string | null;
  deportes?: { nombre: string; tipo: string } | null;
}

export function CanchasPage() {
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === 'super_admin';

  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [c, d] = await Promise.all([api<Cancha[]>('/canchas'), api<Deporte[]>('/deportes')]);
      setCanchas(c);
      setDeportes(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function crearCancha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensaje(null);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api('/canchas', {
        method: 'POST',
        body: JSON.stringify({
          nombre: String(form.get('nombre')),
          deporte_id: form.get('deporte_id') ? Number(form.get('deporte_id')) : null,
          precio_base: Number(form.get('precio_base')),
          caracteristicas: String(form.get('caracteristicas') ?? '') || null,
        }),
      });
      e.currentTarget.reset();
      setMensaje('Cancha creada ✅');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear');
    }
  }

  async function crearDeporte(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensaje(null);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await api('/deportes', {
        method: 'POST',
        body: JSON.stringify({
          nombre: String(form.get('nombre_deporte')),
          tipo: String(form.get('tipo')),
          requiere_cancha: form.get('tipo') !== 'gimnasio' && form.get('tipo') !== 'pileta',
        }),
      });
      e.currentTarget.reset();
      setMensaje('Deporte creado ✅');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear deporte');
    }
  }

  async function alternarActiva(cancha: Cancha) {
    try {
      await api(`/canchas/${cancha.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activa: !cancha.activa }),
      });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }

  return (
    <main style={{ padding: 16, display: 'grid', gap: 24, maxWidth: 800 }}>
      <h1>Canchas y deportes</h1>

      {mensaje && <p style={{ color: 'green' }}>{mensaje}</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <section>
        <h2>Listado</h2>
        {canchas.length === 0 ? (
          <p>No hay canchas cargadas todavía.</p>
        ) : (
          <table border={1} cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Deporte</th>
                <th>Precio base</th>
                <th>Activa</th>
                {esAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {canchas.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.deportes?.nombre ?? '—'}</td>
                  <td>${c.precio_base}</td>
                  <td>{c.activa ? 'Sí' : 'No'}</td>
                  {esAdmin && (
                    <td>
                      <button type="button" onClick={() => alternarActiva(c)}>
                        {c.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {esAdmin && (
        <>
          <section>
            <h2>Agregar cancha</h2>
            <form onSubmit={crearCancha} style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
              <label>
                Nombre
                <input name="nombre" required style={{ width: '100%' }} />
              </label>
              <label>
                Deporte
                <select name="deporte_id" style={{ width: '100%' }}>
                  <option value="">— sin deporte —</option>
                  {deportes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Precio base ($)
                <input name="precio_base" type="number" min={0} step="0.01" required style={{ width: '100%' }} />
              </label>
              <label>
                Características
                <input name="caracteristicas" style={{ width: '100%' }} />
              </label>
              <button type="submit">Crear cancha</button>
            </form>
          </section>

          <section>
            <h2>Agregar deporte</h2>
            <form onSubmit={crearDeporte} style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
              <label>
                Nombre
                <input name="nombre_deporte" required style={{ width: '100%' }} />
              </label>
              <label>
                Tipo
                <select name="tipo" style={{ width: '100%' }}>
                  <option value="cancha">Cancha</option>
                  <option value="gimnasio">Gimnasio</option>
                  <option value="pileta">Pileta</option>
                  <option value="otro">Otro</option>
                </select>
              </label>
              <button type="submit">Crear deporte</button>
            </form>
          </section>
        </>
      )}

      {!esAdmin && (
        <p style={{ color: '#666' }}>
          Solo el super_admin puede modificar canchas y deportes.
        </p>
      )}
    </main>
  );
}
