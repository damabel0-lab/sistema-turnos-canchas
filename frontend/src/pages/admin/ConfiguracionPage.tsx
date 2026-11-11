import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui';
import { ChevronDown, ChevronRight, Plus, Edit3, Trash2, CalendarClock, Building2, ShieldCheck, Dumbbell, Users } from 'lucide-react';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

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

interface SetupResponse {
  setup_completado: boolean;
  config_id: number | null;
  valores: {
    metadatos?: { nombre?: string; tipo?: string; hora_apertura?: number; hora_cierre?: number };
    politicas?: { cancelacion_minima_horas?: number; descuento_turno_fijo_porcentaje?: number; seña_obligatoria?: boolean };
    amenidades?: { gym?: boolean; pileta?: boolean; precio_mensual_gym?: number; precio_mensual_pileta?: number };
    socios?: { ofrece_socios?: boolean };
  };
}

interface CanchaForm {
  nombre: string;
  deporte_id: string;
  precio_base: string;
  caracteristicas: string;
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
  activa: true,
});

const emptyDeporte = (): DeporteForm => ({
  nombre: '',
  tipo: 'cancha',
  requiere_cancha: true,
});

export function ConfiguracionPage() {
  const [tab, setTab] = useState<'deportes' | 'datos' | 'politicas' | 'gym' | 'socios'>('deportes');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, mostrar, cerrar } = useToast();

  // Deportes y canchas
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [expandidos, setExpandidos] = useState<Record<number, boolean>>({});
  const [editandoCancha, setEditandoCancha] = useState<Cancha | null>(null);
  const [agregandoCancha, setAgregandoCancha] = useState<Deporte | null>(null);
  const [agregandoDeporte, setAgregandoDeporte] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState<{ tipo: 'deporte' | 'cancha'; id: number; nombre: string } | null>(null);

  const [canchaForm, setCanchaForm] = useState<CanchaForm>(emptyCancha());
  const [deporteForm, setDeporteForm] = useState<DeporteForm>(emptyDeporte());

  // Datos del complejo
  const [nombre, setNombre] = useState('');
  const [tipoComplejo, setTipoComplejo] = useState('fraccionado');
  const [horaApertura, setHoraApertura] = useState('08');
  const [horaCierre, setHoraCierre] = useState('23');

  // Políticas
  const [cancelacionHoras, setCancelacionHoras] = useState('2');
  const [descuentoTurnoFijo, setDescuentoTurnoFijo] = useState('10');
  const [señaObligatoria, setSeñaObligatoria] = useState(false);

  // Amenidades
  const [gym, setGym] = useState(false);
  const [pileta, setPileta] = useState(false);
  const [precioMensualGym, setPrecioMensualGym] = useState('');
  const [precioMensualPileta, setPrecioMensualPileta] = useState('');

  // Socios
  const [ofreceSocios, setOfreceSocios] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [setup, dep, can] = await Promise.all([
        api<SetupResponse>('/admin/setup'),
        api<Deporte[]>('/deportes'),
        api<Cancha[]>('/canchas'),
      ]);
      setDeportes(dep);
      setCanchas(can);

      const init: Record<number, boolean> = {};
      dep.forEach((d) => (init[d.id] = true));
      setExpandidos(init);

      const meta = setup.valores?.metadatos ?? {};
      const pol = setup.valores?.politicas ?? {};
      const am = setup.valores?.amenidades ?? {};
      const soc = setup.valores?.socios ?? {};

      setNombre(meta.nombre ?? '');
      setTipoComplejo(meta.tipo ?? 'fraccionado');
      setHoraApertura(meta.hora_apertura !== undefined ? `${String(meta.hora_apertura).padStart(2, '0')}:00` : '08:00');
      setHoraCierre(meta.hora_cierre !== undefined ? `${String(meta.hora_cierre).padStart(2, '0')}:00` : '23:00');
      setCancelacionHoras(String(pol.cancelacion_minima_horas ?? '2'));
      setDescuentoTurnoFijo(String(pol.descuento_turno_fijo_porcentaje ?? '10'));
      setSeñaObligatoria(pol.seña_obligatoria ?? false);
      setGym(am.gym ?? false);
      setPileta(am.pileta ?? false);
      setPrecioMensualGym(String(am.precio_mensual_gym ?? ''));
      setPrecioMensualPileta(String(am.precio_mensual_pileta ?? ''));
      setOfreceSocios(soc.ofrece_socios ?? false);
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
    setCanchaForm({ ...emptyCancha(), deporte_id: String(deporte.id) });
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
      activa: cancha.activa,
    });
  }

  function cancelarEdicion() {
    setAgregandoCancha(null);
    setEditandoCancha(null);
    setAgregandoDeporte(false);
    setCanchaForm(emptyCancha());
    setDeporteForm(emptyDeporte());
  }

  async function guardarCancha(e: FormEvent) {
    e.preventDefault();
    setError(null);
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
        mostrar('Cancha actualizada.', 'success');
      } else {
        const created = await api<Cancha>('/canchas', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setCanchas((prev) => [...prev, created]);
        mostrar('Cancha creada correctamente.', 'success');
      }

      setAgregandoCancha(null);
      setEditandoCancha(null);
      setCanchaForm(emptyCancha());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  }

  async function agregarDeporteSubmit() {
    if (!deporteForm.nombre.trim()) return;
    setError(null);
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
      mostrar('Deporte agregado correctamente.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el deporte');
    }
  }

  async function eliminarDeporte(id: number, nombre: string) {
    setConfirmarEliminar({ tipo: 'deporte', id, nombre });
  }

  async function eliminarCancha(id: number, nombre: string) {
    setConfirmarEliminar({ tipo: 'cancha', id, nombre });
  }

  async function confirmarEliminacion() {
    if (!confirmarEliminar) return;
    const { tipo, id } = confirmarEliminar;
    try {
      if (tipo === 'deporte') {
        await api(`/deportes/${id}`, { method: 'DELETE' });
        setDeportes((prev) => prev.filter((d) => d.id !== id));
        mostrar('Deporte eliminado.', 'success');
      } else {
        await api(`/canchas/${id}`, { method: 'DELETE' });
        setCanchas((prev) => prev.filter((c) => c.id !== id));
        mostrar('Cancha eliminada.', 'success');
      }
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo eliminar', 'danger');
    } finally {
      setConfirmarEliminar(null);
    }
  }

  async function guardarSetup(parcial?: Record<string, unknown>) {
    setError(null);
    try {
      const payload = parcial ?? {
        metadatos: {
          nombre,
          tipo: tipoComplejo,
          hora_apertura: Number(horaApertura.split(':')[0] || '0'),
          hora_cierre: Number(horaCierre.split(':')[0] || '0'),
        },
        politicas: {
          cancelacion_minima_horas: Number(cancelacionHoras),
          descuento_turno_fijo_porcentaje: Number(descuentoTurnoFijo),
          seña_obligatoria: señaObligatoria,
        },
        amenidades: {
          gym,
          pileta,
          precio_mensual_gym: gym && precioMensualGym ? Number(precioMensualGym) : undefined,
          precio_mensual_pileta: pileta && precioMensualPileta ? Number(precioMensualPileta) : undefined,
        },
        socios: {
          ofrece_socios: ofreceSocios,
        },
      };

      await api('/admin/setup', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      mostrar('Cambios guardados.', 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    }
  }

  if (cargando) {
    return (
      <div className="admin-page">
        <div className="contenedor">
          <Card>
            <p className="texto-sec">Cargando configuración…</p>
          </Card>
        </div>
      </div>
    );
  }

  const canchasPorDeporte = deportes.map((d) => ({
    deporte: d,
    canchas: canchas.filter((c) => c.deporte_id === d.id),
  }));

  const tabs = [
    { id: 'deportes', label: 'Deportes y Canchas', icon: CalendarClock },
    { id: 'datos', label: 'Datos del complejo', icon: Building2 },
    { id: 'politicas', label: 'Políticas', icon: ShieldCheck },
    { id: 'gym', label: 'Gym y Pileta', icon: Dumbbell },
    { id: 'socios', label: 'Socios', icon: Users },
  ];

  return (
    <div className="admin-page">
      <div className="contenedor-ancho">
        <ToastContainer toasts={toasts} onCerrar={cerrar} />
        <ConfirmDialog
          open={!!confirmarEliminar}
          titulo="Eliminar registro"
          descripcion={
            confirmarEliminar
              ? `¿Confirmás eliminar "${confirmarEliminar.nombre}"? Esta acción no se puede deshacer.`
              : undefined
          }
          confirmarTexto="Eliminar"
          onConfirmar={confirmarEliminacion}
          onCancelar={() => setConfirmarEliminar(null)}
          peligro
        />

        {/* Encabezado */}
        <div className="fila-entre" style={{ marginBottom: '1rem' }}>
          <div>
            <h1 className="titulo">Configuración</h1>
            <p className="texto-sec">Organizá todo tu complejo desde un solo lugar.</p>
          </div>
          <button className="boton boton-outline" onClick={() => void cargar()}>
            Recargar
          </button>
        </div>

        {error && <p style={{ color: 'var(--peligro)', marginBottom: '0.75rem' }}>{error}</p>}

        {/* Layout sidebar + contenido */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1rem' }}>
          {/* Sidebar */}
          <div className="stack" style={{ alignSelf: 'start' }}>
            {tabs.map((t) => {
              const Icon = t.icon;
              const activo = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id as typeof tab)}
                  className={`boton ${activo ? 'boton-primario' : 'boton-outline'}`}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Contenido principal */}
          <div className="stack">
            {/* === DEPORTES Y CANCHAS === */}
            {tab === 'deportes' && (
              <>
                <Card>
                  <div className="fila-entre" style={{ marginBottom: '0.75rem' }}>
                    <h3 className="titulo" style={{ fontSize: '1.1rem', margin: 0 }}>Deportes y Canchas</h3>
                    <button className="boton boton-outline" onClick={() => setAgregandoDeporte(true)}>
                      <Plus size={16} /> Agregar deporte
                    </button>
                  </div>

                  {agregandoDeporte && (
                    <form onSubmit={(e) => { e.preventDefault(); void agregarDeporteSubmit(); }} className="fila" style={{ gap: '0.5rem', marginBottom: '0.75rem' }}>
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
                        <option value="otro">Otro</option>
                      </select>
                      <button type="submit" className="boton boton-primario">Agregar</button>
                    </form>
                  )}

                  {canchasPorDeporte.length === 0 && !agregandoDeporte && (
                    <p className="texto-sec">No hay deportes cargados todavía.</p>
                  )}

                  {canchasPorDeporte.map(({ deporte, canchas: canchasDeporte }) => {
                    const isOpen = expandidos[deporte.id] ?? false;
                    return (
                      <div key={deporte.id} className="tarjeta-plana" style={{ marginBottom: '0.5rem' }}>
                        {/* Header del deporte */}
                        <div
                          className="fila-entre"
                          style={{ padding: '0.6rem 0.75rem', cursor: 'pointer' }}
                          onClick={() => toggleExpandir(deporte.id)}
                        >
                          <div className="fila" style={{ gap: '0.5rem' }}>
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <div>
                              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{deporte.nombre}</span>
                              <span className="texto-sec" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                {canchasDeporte.length} cancha{canchasDeporte.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="fila" style={{ gap: '0.25rem' }}>
                            <button
                              className="boton boton-outline"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                              onClick={(e) => { e.stopPropagation(); abrirAgregarCancha(deporte); }}
                            >
                              + Cancha
                            </button>
                            <button
                              className="boton boton-ghost"
                              style={{ padding: '0.3rem', color: 'var(--peligro)' }}
                              onClick={() => eliminarDeporte(deporte.id, deporte.nombre)}
                              aria-label="Eliminar deporte"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Contenido expandible */}
                        {isOpen && (
                          <div style={{ padding: '0.6rem 0.75rem', borderTop: '1px solid #e5e7eb', background: 'var(--bg-surface-2)' }}>
                            {/* Formulario agregar/editar cancha */}
                            {(agregandoCancha?.id === deporte.id || editandoCancha) && (
                              <form onSubmit={guardarCancha} className="stack" style={{ marginBottom: '0.5rem' }}>
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
                                    placeholder="Precio/h"
                                    required
                                    className="input"
                                    style={{ width: '110px' }}
                                  />
                                </div>
                                <input
                                  value={canchaForm.caracteristicas}
                                  onChange={(e) => setCanchaForm({ ...canchaForm, caracteristicas: e.target.value })}
                                  placeholder="Características (iluminada, techada…)"
                                  className="input"
                                />
                                <div className="fila" style={{ gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button type="button" className="boton boton-secondary" onClick={cancelarEdicion}>
                                    Cancelar
                                  </button>
                                  <button type="submit" className="boton boton-primario">
                                    {editandoCancha ? 'Guardar' : 'Agregar'}
                                  </button>
                                </div>
                              </form>
                            )}

                            {/* Lista de canchas */}
                            {canchasDeporte.length === 0 ? (
                              <p className="texto-sec" style={{ fontSize: '0.85rem' }}>
                                No hay canchas en este deporte.
                              </p>
                            ) : (
                              <div className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {canchasDeporte.map((cancha) => (
                                  <div
                                    key={cancha.id}
                                    className="fila-entre"
                                    style={{ padding: '0.4rem 0', borderBottom: '1px solid #e5e7eb' }}
                                  >
                                    <div>
                                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cancha.nombre}</span>
                                      <span className="texto-sec" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                        ${cancha.precio_base}/h
                                      </span>
                                      {cancha.caracteristicas ? (
                                        <span className="texto-sec" style={{ fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                                          · {cancha.caracteristicas}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="fila" style={{ gap: '0.25rem' }}>
                                      <button
                                        className="boton boton-ghost"
                                        style={{ padding: '0.3rem' }}
                                        onClick={() => abrirEditarCancha(cancha)}
                                        aria-label="Editar cancha"
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                      <button
                                        className="boton boton-ghost"
                                        style={{ padding: '0.3rem', color: 'var(--peligro)' }}
                                        onClick={() => eliminarCancha(cancha.id, cancha.nombre)}
                                        aria-label="Eliminar cancha"
                                      >
                                        <Trash2 size={12} />
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
                </Card>
              </>
            )}

            {/* === DATOS DEL COMPLEJO === */}
            {tab === 'datos' && (
              <Card>
                <h3 className="titulo" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Datos del complejo</h3>
                <label className="label">Nombre comercial<input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" /></label>
                <label className="label">Tipo
                  <select value={tipoComplejo} onChange={(e) => setTipoComplejo(e.target.value)} className="input">
                    <option value="fraccionado">Cancha individual / Fraccionado</option>
                    <option value="complejo_deportivo">Complejo deportivo</option>
                  </select>
                </label>
                <label className="label">Horario de apertura<input type="time" value={horaApertura} onChange={(e) => setHoraApertura(e.target.value)} className="input" /></label>
                <label className="label">Horario de cierre<input type="time" value={horaCierre} onChange={(e) => setHoraCierre(e.target.value)} className="input" /></label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button className="boton boton-secondary" onClick={() => void guardarSetup({ metadatos: { nombre, tipo: tipoComplejo, hora_apertura: Number(horaApertura.split(':')[0] || '0'), hora_cierre: Number(horaCierre.split(':')[0] || '0') } })}>
                    Guardar cambios
                  </button>
                </div>
              </Card>
            )}

            {/* === POLÍTICAS === */}
            {tab === 'politicas' && (
              <Card>
                <h3 className="titulo" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Políticas</h3>
                <label className="label">
                  Horas mínimas para cancelar antes del turno
                  <input type="number" min={0} max={48} value={cancelacionHoras} onChange={(e) => setCancelacionHoras(e.target.value)} className="input" />
                </label>
                <label className="label">
                  Descuento para clientes con turno fijo (%)
                  <input type="number" min={0} max={100} value={descuentoTurnoFijo} onChange={(e) => setDescuentoTurnoFijo(e.target.value)} className="input" />
                </label>
                <label className="label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={señaObligatoria} onChange={(e) => setSeñaObligatoria(e.target.checked)} />
                  Seña obligatoria por defecto
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button className="boton boton-secondary" onClick={() => void guardarSetup({ politicas: { cancelacion_minima_horas: Number(cancelacionHoras), descuento_turno_fijo_porcentaje: Number(descuentoTurnoFijo), seña_obligatoria: señaObligatoria } })}>
                    Guardar cambios
                  </button>
                </div>
              </Card>
            )}

            {/* === GYM Y PILETA (SEPARACIÓN Y CONFIGURACIÓN DETALLADA) === */}
            {tab === 'gym' && (
              <Card>
                <h3 className="titulo" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Gimnasio y Pileta</h3>

                <div className="stack">
                  {/* Gimnasio */}
                  <div className="tarjeta-plana" style={{ padding: '0.75rem' }}>
                    <div className="fila-entre" style={{ marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0 }}>Gimnasio</h4>
                      <label className="label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: 0 }}>
                        <input type="checkbox" checked={gym} onChange={(e) => setGym(e.target.checked)} />
                        Activo
                      </label>
                    </div>
                    {gym && (
                      <>
                        <label className="label">
                          Precio mensual del gimnasio (opcional)
                          <input
                            type="number"
                            min={0}
                            value={precioMensualGym}
                            onChange={(e) => setPrecioMensualGym(e.target.value)}
                            className="input"
                            placeholder="Ej: 15000"
                          />
                        </label>
                        <p className="texto-sec" style={{ fontSize: '0.8rem' }}>
                          Este valor se usará como referencia para el abono mensual del gym.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Pileta */}
                  <div className="tarjeta-plana" style={{ padding: '0.75rem' }}>
                    <div className="fila-entre" style={{ marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0 }}>Pileta</h4>
                      <label className="label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: 0 }}>
                        <input type="checkbox" checked={pileta} onChange={(e) => setPileta(e.target.checked)} />
                        Activa
                      </label>
                    </div>
                    {pileta && (
                      <>
                        <label className="label">
                          Precio mensual de pileta (opcional)
                          <input
                            type="number"
                            min={0}
                            value={precioMensualPileta}
                            onChange={(e) => setPrecioMensualPileta(e.target.value)}
                            className="input"
                            placeholder="Ej: 12000"
                          />
                        </label>
                        <p className="texto-sec" style={{ fontSize: '0.8rem' }}>
                          Este valor se usará como referencia para el abono mensual de pileta.
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button className="boton boton-secondary" onClick={() => void guardarSetup({ amenidades: { gym, pileta, precio_mensual_gym: gym && precioMensualGym ? Number(precioMensualGym) : undefined, precio_mensual_pileta: pileta && precioMensualPileta ? Number(precioMensualPileta) : undefined } })}>
                    Guardar cambios
                  </button>
                </div>
              </Card>
            )}

            {/* === SOCIOS === */}
            {tab === 'socios' && (
              <Card>
                <h3 className="titulo" style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Socios y Beneficios</h3>
                <label className="label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="checkbox" checked={ofreceSocios} onChange={(e) => setOfreceSocios(e.target.checked)} />
                  Ofrecer socios con descuentos
                </label>
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem' }}>Beneficios configurables</h4>
                  <p className="texto-sec">
                    Acá se configurarán los beneficios para socios (porcentaje de descuento, límites, etc.).
                    Esta sección se conectará con la tabla beneficios_socios cuando esté implementada por completo.
                  </p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button className="boton boton-secondary" onClick={() => void guardarSetup({ socios: { ofrece_socios: ofreceSocios } })}>
                    Guardar cambios
                  </button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
