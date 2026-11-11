import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { Goal, RefreshCw, Plus, Search } from 'lucide-react';

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

const precio = (n: number) => `$${n.toLocaleString('es-AR')}`;

export function CanchasPage() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toasts, mostrar, cerrar } = useToast();
  const [busqueda, setBusqueda] = useState('');

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
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
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
      formEl.reset();
      mostrar('Cancha creada', 'success');
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
      mostrar(`Cancha ${cancha.activa ? 'desactivada' : 'activada'}.`, 'success');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    }
  }

  const filtradas = canchas.filter((c) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return `${c.nombre} ${c.deportes?.nombre ?? ''} ${c.caracteristicas ?? ''}`.toLowerCase().includes(q);
  });

  return (
    <div className="admin-page">
      <ToastContainer toasts={toasts} onCerrar={cerrar} />

      {/* Encabezado */}
      <header className="pagina-encabezado">
        <div>
          <span className="pagina-eyebrow">Operación › Canchas</span>
          <h1 className="pagina-titulo">Canchas y tarifas</h1>
          <p className="pagina-sub">Alta y administración de canchas, precios por hora y estado.</p>
        </div>
        <button type="button" className="boton boton-outline" onClick={() => void cargar()}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </header>

      {error && <div className="alerta-error" role="alert">{error}</div>}

      <div className="grilla-2-col" style={{ gap: '0.9rem' }}>
        {/* ===== Alta de cancha ===== */}
        <aside className="panel" style={{ alignSelf: 'start' }}>
          <div className="panel-header"><span className="panel-titulo">Agregar cancha</span></div>
          <div className="panel-body">
            <form onSubmit={crearCancha} className="stack">
              <label className="label">Nombre<input name="nombre" required className="input" placeholder="Cancha 5" /></label>
              <label className="label">Deporte
                <select name="deporte_id" className="input">
                  <option value="">Sin deporte</option>
                  {deportes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </label>
              <label className="label">Precio base ($/h)
                <input name="precio_base" type="number" min={0} step="1" required className="input" placeholder="35000" />
              </label>
              <label className="label">Características
                <input name="caracteristicas" placeholder="Iluminada, techada, césped sintético…" className="input" />
              </label>
              <button type="submit" className="boton boton-primario boton-block"><Plus size={15} /> Crear cancha</button>
            </form>
          </div>
        </aside>

        {/* ===== Listado ===== */}
        <section className="panel" aria-labelledby="canchas-listado">
          <div className="panel-header">
            <span className="panel-titulo" id="canchas-listado">Listado</span>
            <span className="texto-debil">{filtradas.length}/{canchas.length} cancha{canchas.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="panel-body" style={{ gap: '0.4rem' }}>
            <label className="fila" style={{ gap: '0.35rem', background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radio)', padding: '0.35rem 0.6rem', marginBottom: '0.15rem' }}>
              <Search size={14} style={{ color: 'var(--texto-3)' }} />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o deporte…"
                className="input"
                style={{ border: 'none', background: 'transparent', padding: '0.2rem', outline: 'none' }}
                aria-label="Buscar cancha"
              />
            </label>
            {filtradas.length === 0 ? (
              <div className="panel-vacio">
                <Goal size={22} style={{ color: 'var(--primario-2)' }} />
                <p style={{ margin: 0 }}>{busqueda.trim() ? 'Ninguna cancha coincide.' : 'No hay canchas cargadas.'}</p>
              </div>
            ) : (
              filtradas.map((c) => (
                <div key={c.id} className="item-turno">
                  <div className="item-turno-icono"><Goal size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="item-turno-nombre">{c.nombre}</div>
                    <div className="item-turno-meta">
                      {c.deportes?.nombre ?? 'Sin deporte'}{c.caracteristicas ? ` · ${c.caracteristicas}` : ''}
                    </div>
                  </div>
                  <div className="fila" style={{ gap: '0.4rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.82rem' }}>{precio(c.precio_base)}<small className="texto-debil" style={{ fontWeight: 500, fontSize: '0.68rem' }}>/h</small></span>
                    <span className={`badge ${c.activa ? 'badge-exito' : 'badge-peligro'}`}>{c.activa ? 'Activa' : 'Inactiva'}</span>
                    <button type="button" className="boton boton-ghost" style={{ fontSize: '0.82rem' }} onClick={() => void alternarActiva(c)}>
                      {c.activa ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
