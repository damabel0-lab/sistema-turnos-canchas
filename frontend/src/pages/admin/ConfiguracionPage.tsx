import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { ChevronDown, ChevronRight, Plus, Edit3, Trash2, X } from 'lucide-react';

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

interface CanchaForm {
  nombre: string;
  deporte_id: string;
  precio_base: string;
  caracteristicas: string;
  descuento: string;
  activa: boolean;
}

interface DeporteForm {
  nombre: string;
  tipo: string;
  requiere_cancha: boolean;
}

const emptyCancha = (): CanchaForm => ({
  nombre: '',
  deporte_id: '',
  precio_base: '',
  caracteristicas: '',
  descuento: '',
  activa: true,
});

const emptyDeporte = (): DeporteForm => ({
  nombre: '',
  tipo: 'cancha',
  requiere_cancha: true,
});

export function ConfiguracionPage() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [expandidos, setExpandidos] = useState<Record<number, boolean>>({});
  const [editandoCancha, setEditandoCancha] = useState<Cancha | null>(null);
  const [agregandoCancha, setAgregandoCancha] = useState<Deporte | null>(null);
  const [agregandoDeporte, setAgregandoDeporte] = useState(false);

  const [canchaForm, setCanchaForm] = useState<CanchaForm>(emptyCancha());
  const [deporteForm, setDeporteForm] = useState<DeporteForm>(emptyDeporte());

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [dep, can] = await Promise.all([
        api<Deporte[]>('/deportes'),
        api<Cancha[]>('/canchas'),
      ]);
      setDeportes(dep);
      setCanchas(can);

      // Expandir todo por defecto
      const init: Record<number, boolean> = {};
      dep.forEach((d) => (init[d.id] = true));
      setExpandidos(init);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function toggleExpandir(id: number) {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function abrirAgregarCancha(deporte: Deporte) {
    setAgregandoCancha(deporte);
    setAgregandoDeporte(false);
    setEditandoCancha(null);
    setCanchaForm({
      ...emptyCancha(),
      deporte_id: String(deporte.id),
    });
  }

  function abrirEditarCancha(cancha: Cancha) {
    setEditandoCancha(cancha);
    setAgregandoCancha(null);
    setAgregandoDeporte(false);
    setCanchaForm({
      nombre: cancha.nombre,
      deporte_id: String(cancha.deporte_id ?? ''),
      precio_base: String(cancha.precio_base),
      caracteristicas: cancha.caracteristicas ?? '',
      descuento: '',
      activa: cancha.activa,
    });
  }

  async function guardarCancha(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    try {
      const body = {
        nombre: canchaForm.nombre.trim(),
        deporte_id: Number(canchaForm.deporte_id),
        precio_base: Number(canchaForm.precio_base),
        caracteristicas: canchaForm.caracteristicas || null,
        activa: canchaForm.activa,
      };

      if (editandoCancha) {
        const updated = await api<Cancha>(`/canchas/${editandoCancha.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        setCanchas((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setMensaje('Cancha actualizada ✅');
      } else {
        const created = await api<Cancha>('/canchas', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setCanchas((prev) => [...prev, created]);
        setMensaje('Cancha creada ✅');
      }

      setAgregandoCancha(null);
      setEditandoCancha(null);
      setCanchaForm(emptyCancha());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  async function agregarDeporteACancha() {
    if (!agregandoDeporte || !deporteForm.nombre.trim()) return;

    setError(null);
    setMensaje(null);

    try {
      const created = await api<Deporte>('/deportes', {
        method: 'POST',
        body: JSON.stringify({
          nombre: deporteForm.nombre.trim(),
          tipo: deporteForm.tipo,
          requiere_cancha: deporteForm.requiere_cancha,
        }),
      });
      setDeportes((prev) => [...prev, created]);
      setExpandidos((prev) => ({ ...prev, [created.id]: true }));
      setAgregandoDeporte(false);
      setDeporteForm(emptyDeporte());
      setMensaje('Deporte agregado ✅');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el deporte');
    }
  }

  async function eliminarCancha(id: number) {
    if (!confirm('¿Eliminar esta cancha?')) return;
    try {
      await api(`/canchas/${id}`, { method: 'DELETE' });
      setCanchas((prev) => prev.filter((c) => c.id !== id));
      setMensaje('Cancha eliminada ✅');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  function cancelarEdicion() {
    setAgregandoCancha(null);
    setEditandoCancha(null);
    setAgregandoDeporte(false);
    setCanchaForm(emptyCancha());
    setDeporteForm(emptyDeporte());
  }

  if (cargando) {
    return (
      <main className="pantalla">
        <div className="contenedor">
          <Card><p className="texto-sec">Cargando configuración…</p></Card>
        </div>
      </main>
    );
  }

  const canchasPorDeporte = deportes.map((d) => ({
    deporte: d,
    canchas: canchas.filter((c) => c.deporte_id === d.id),
  }));

  return (
    <main className="pantalla">
      <div className="contenedor">
        <div className="fila-entre" style={{ marginBottom: '1rem' }}>
          <div>
            <h1 className="titulo">Configuración</h1>
            <p className="texto-sec">Organizá tus deportes y canchas.</p>
          </div>
          <button className="boton boton-outline" onClick={() => setAgregandoDeporte(true)}>
            <Plus size={16} /> Agregar deporte
          </button>
        </div>

        {error && <p style={{ color: '#dc2626', marginBottom: '0.75rem' }}>{error}</p>}
        {mensaje && <p style={{ color: '#10b981', marginBottom: '0.75rem' }}>{mensaje}</p>}

        {/* Formulario agregar deporte */}
        {agregandoDeporte && (
          <div style={{ marginBottom: '1rem' }}>
            <Card>
              <div className="fila-entre" style={{ marginBottom: '0.75rem' }}>
                <h3 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>Nuevo deporte</h3>
                <button className="boton boton-ghost" onClick={cancelarEdicion}>
                  <X size={16} />
                </button>
              </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                agregarDeporteACancha();
              }}
              className="fila"
              style={{ gap: '0.5rem' }}
            >
              <input
                autoFocus
                value={deporteForm.nombre}
                onChange={(e) => setDeporteForm({ ...deporteForm, nombre: e.target.value })}
                placeholder="Nombre del deporte (ej: Pádel)"
                required
                className="input"
                style={{ flex: 1 }}
              />
              <select
                value={deporteForm.tipo}
                onChange={(e) => setDeporteForm({ ...deporteForm, tipo: e.target.value })}
                className="input"
              >
                <option value="cancha">Cancha</option>
                <option value="gimnasio">Gimnasio</option>
                <option value="pileta">Pileta</option>
                <option value="otro">Otro</option>
              </select>
              <button type="submit" className="boton boton-primario">Agregar</button>
            </form>
            </Card>
          </div>
        )}

        {/* Lista de deportes (acordeón) */}
        <div className="stack">
          {canchasPorDeporte.length === 0 && !agregandoDeporte && (
            <Card className="caja-vacia">
              <p className="texto-sec">No hay deportes cargados todavía.</p>
              <button className="boton boton-primario" onClick={() => setAgregandoDeporte(true)}>
                <Plus size={16} /> Agregar tu primer deporte
              </button>
            </Card>
          )}

          {canchasPorDeporte.map(({ deporte, canchas: canchasDeporte }) => {
            const isOpen = expandidos[deporte.id] ?? false;

            return (
              <div key={deporte.id} className="tarjeta-plana">
                {/* Header del deporte */}
                <div
                  className="fila-entre"
                  style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}
                  onClick={() => toggleExpandir(deporte.id)}
                >
                  <div className="fila" style={{ gap: '0.75rem' }}>
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{deporte.nombre}</div>
                      <div className="texto-sec" style={{ fontSize: '0.75rem' }}>
                        {canchasDeporte.length} cancha{canchasDeporte.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    className="boton boton-outline"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirAgregarCancha(deporte);
                    }}
                  >
                    <Plus size={14} /> Agregar cancha
                  </button>
                </div>

                {/* Contenido expandible */}
                {isOpen && (
                  <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e5e7eb' }}>
                    {/* Formulario agregar/editar cancha */}
                    {(agregandoCancha?.id === deporte.id || editandoCancha) && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <form onSubmit={guardarCancha} className="stack">
                          <div className="fila" style={{ gap: '0.5rem' }}>
                            <input
                              value={canchaForm.nombre}
                              onChange={(e) => setCanchaForm({ ...canchaForm, nombre: e.target.value })}
                              placeholder="Nombre de la cancha"
                              required
                              className="input"
                              style={{ flex: 1 }}
                            />
                            <input
                              type="number"
                              min={0}
                              value={canchaForm.precio_base}
                              onChange={(e) => setCanchaForm({ ...canchaForm, precio_base: e.target.value })}
                              placeholder="Precio/hora"
                              required
                              className="input"
                              style={{ width: '120px' }}
                            />
                          </div>
                          <input
                            value={canchaForm.caracteristicas}
                            onChange={(e) => setCanchaForm({ ...canchaForm, caracteristicas: e.target.value })}
                            placeholder="Características (iluminada, techada, etc.)"
                            className="input"
                          />
                          <div className="fila" style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button type="button" className="boton boton-secondary" onClick={cancelarEdicion}>
                              Cancelar
                            </button>
                            <button type="submit" className="boton boton-primario">
                              {editandoCancha ? 'Guardar' : 'Agregar cancha'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Listado de canchas */}
                    {canchasDeporte.length === 0 ? (
                      <p className="texto-sec" style={{ fontSize: '0.85rem' }}>
                        No hay canchas para este deporte.
                      </p>
                    ) : (
                      <div className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {canchasDeporte.map((cancha) => (
                          <div key={cancha.id} className="fila-entre" style={{ padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{cancha.nombre}</div>
                              <div className="texto-sec" style={{ fontSize: '0.75rem' }}>
                                ${cancha.precio_base}/h
                                {cancha.caracteristicas ? ` · ${cancha.caracteristicas}` : ''}
                              </div>
                            </div>
                            <div className="fila" style={{ gap: '0.25rem' }}>
                              <button
                                className="boton boton-ghost"
                                style={{ padding: '0.35rem' }}
                                onClick={() => abrirEditarCancha(cancha)}
                                aria-label="Editar"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                className="boton boton-ghost"
                                style={{ padding: '0.35rem', color: '#dc2626' }}
                                onClick={() => void eliminarCancha(cancha.id)}
                                aria-label="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
