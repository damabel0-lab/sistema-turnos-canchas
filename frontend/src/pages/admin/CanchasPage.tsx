import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card, Badge } from '../../components/ui';
import { Clock, Search, RefreshCw } from 'lucide-react';

interface Cancha {
  id: number;
  nombre: string;
  deporte_id: number | null;
  precio_base: number;
  activa: boolean;
  caracteristicas: string | null;
  deportes?: { nombre: string; tipo: string } | null;
}

interface Deporte {
  id: number;
  nombre: string;
  tipo: string;
  requiere_cancha: boolean;
}

export function CanchasPage() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [c, d] = await Promise.all([
        api<Cancha[]>('/canchas'),
        api<Deporte[]>('/deportes'),
      ]);
      setCanchas(c);
      setDeportes(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function crearCancha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
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
    <main className="pantalla">
      <div className="contenedor">
        <div className="fila-entre" style={{ marginBottom: '1rem' }}>
          <h1 className="titulo"><span className="fila"><Clock size={20} /> Canchas y tarifas</span></h1>
          <button className="boton boton-outline" onClick={() => void cargar()}>
            <RefreshCw size={16} /> Actualizar
          </button>
        </div>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        {mensaje && <p style={{ color: '#10b981' }}>{mensaje}</p>}

        <h2 className="titulo" style={{ fontSize: '1.1rem' }}>Listado</h2>
        {canchas.length === 0 ? (
          <Card className="caja-vacia"><p className="texto-sec">No hay canchas cargadas.</p></Card>
        ) : (
          <div className="stack">
            {canchas.map((c) => (
              <Card key={c.id} className="fila-entre">
                <div className="fila" style={{ gap: '0.75rem' }}>
                  <div className="icono-circulo" style={{ width: '2.5rem', height: '2.5rem' }}>
                    <Search size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                    <div className="texto-sec" style={{ fontSize: '0.85rem' }}>
                      {c.deportes?.nombre ?? 'Sin deporte'}
                    </div>
                  </div>
                </div>
                <div className="fila" style={{ gap: '0.75rem' }}>
                  <span className="texto-sec">${c.precio_base}/h</span>
                  <Badge variant={c.activa ? 'success' : 'danger'}>
                    {c.activa ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => void alternarActiva(c)}
                    className="boton boton-ghost"
                  >
                    {c.activa ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <h2 className="titulo" style={{ fontSize: '1.1rem', marginTop: '1.5rem' }}>Agregar cancha</h2>
        <Card>
          <form onSubmit={crearCancha} className="stack">
            <label className="label">Nombre<input name="nombre" required className="input" /></label>
            <label className="label">Deporte
              <select name="deporte_id" className="input">
                <option value="">Sin deporte</option>
                {deportes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </label>
            <label className="label">Precio base ($/h)<input name="precio_base" type="number" min={0} step="0.01" required className="input" /></label>
            <label className="label">Características<input name="caracteristicas" placeholder="Ej: Iluminada" className="input" /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="boton boton-primario">Crear cancha</button>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
