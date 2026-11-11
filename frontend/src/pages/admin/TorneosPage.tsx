import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui';
import {
  Trophy,
  RefreshCw,
  Plus,
  Users,
  Grid3x3,
  ChevronRight,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';

interface Deporte {
  id: number;
  nombre: string;
  tipo: string;
  requiere_cancha: boolean;
}

interface Torneo {
  id: number;
  nombre: string;
  deporte_id: number | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  premio: string | null;
  activo: boolean;
  modalidad: 'individual' | 'equipos';
  formato: 'todos_contra_todos' | 'eliminacion_directa';
  jugadores_por_equipo: number | null;
  cupo_equipos: number | null;
  cuota_inscripcion: number | null;
  reglamento: string | null;
  estado: 'inscripcion' | 'en_curso' | 'finalizado' | 'cancelado';
  deportes?: { nombre: string } | null;
}

interface EquipoVista {
  id: number;
  nombre_equipo: string;
  capitan_id: string | null;
  usuarios: { nombre: string; apellido: string | null; telefono: string | null } | null;
}

interface PartidoVista {
  id: number;
  equipo_local_nombre: string | null;
  equipo_visitante_nombre: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
  jugado: boolean;
  fase: string;
}

export function TorneosPage() {
  const { toasts, mostrar, cerrar } = useToast();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [inscritos, setInscritos] = useState<EquipoVista[]>([]);
  const [partidos, setPartidos] = useState<PartidoVista[]>([]);
  const [torneoDetalle, setTorneoDetalle] = useState<Torneo | null>(null);
  const [generando, setGenerando] = useState(false);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [t, d] = await Promise.all([
        api<Torneo[]>('/torneos'),
        api<Deporte[]>('/deportes'),
      ]);
      setTorneos(t);
      setDeportes(d);
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'Error cargando torneos', 'danger');
    }
  }, [mostrar]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cargarDetalle = useCallback(async (id: number) => {
    try {
      const [insc, pt, det] = await Promise.all([
        api<EquipoVista[]>(`/torneos/${id}/inscripciones`),
        api<PartidoVista[]>(`/torneos/${id}/partidos`),
        api<{ torneo: Torneo }>(`/torneos/${id}`),
      ]);
      setInscritos(insc);
      setPartidos(pt);
      setTorneoDetalle(det.torneo);
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'Error cargando detalle', 'danger');
    }
  }, [mostrar]);

  useEffect(() => {
    if (seleccionado) void cargarDetalle(seleccionado);
  }, [seleccionado, cargarDetalle]);

  async function crearTorneo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setCreando(true);
    try {
      const creado = await api<Torneo>('/torneos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: String(form.get('nombre')),
          deporte_id: form.get('deporte_id') ? Number(form.get('deporte_id')) : null,
          modalidad: String(form.get('modalidad')),
          formato: String(form.get('formato')),
          fecha_inicio: String(form.get('fecha_inicio')),
          fecha_fin: String(form.get('fecha_fin') ?? '') || null,
          premio: String(form.get('premio') ?? '') || null,
          jugadores_por_equipo: form.get('jugadores_por_equipo') ? Number(form.get('jugadores_por_equipo')) : null,
          cupo_equipos: form.get('cupo_equipos') ? Number(form.get('cupo_equipos')) : null,
          cuota_inscripcion: form.get('cuota_inscripcion') ? Number(form.get('cuota_inscripcion')) : null,
          reglamento: String(form.get('reglamento') ?? '') || null,
        }),
      });
      mostrar(`Torneo "${creado.nombre}" creado.`, 'success');
      formEl.reset();
      await cargar();
      setSeleccionado(creado.id);
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo crear el torneo', 'danger');
    } finally {
      setCreando(false);
    }
  }

  async function generarFixture() {
    if (!seleccionado || !torneoDetalle) return;
    if (torneoDetalle.estado !== 'inscripcion') { mostrar('El torneo ya empezó.', 'warning'); return; }
    if (inscritos.length < 2) { mostrar('Se necesitan al menos 2 participantes.', 'warning'); return; }
    const ok = window.confirm('¿Generar fixture todos contra todos? Se eliminarán los partidos anteriores si existían.');
    if (!ok) return;
    setGenerando(true);
    try {
      const res = await api<{ generadas: number }>(`/torneos/${seleccionado}/fixture`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      mostrar(`Fixture generado: ${res.generadas} partidos creados.`, 'success');
      await cargarDetalle(seleccionado);
      await cargar();
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo generar fixture', 'danger');
    } finally {
      setGenerando(false);
    }
  }

  async function finalizarTorneo() {
    if (!seleccionado) return;
    const ok = window.confirm('¿Finalizar el torneo? Los participantes ya no podrán inscribirse.');
    if (!ok) return;
    try {
      await api(`/torneos/${seleccionado}/finalizar`, { method: 'POST', body: JSON.stringify({}) });
      mostrar('Torneo finalizado.', 'success');
      await cargar();
      await cargarDetalle(seleccionado);
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo finalizar', 'danger');
    }
  }

  async function cargarResultado(partidoId: number, gl: number, gv: number) {
    try {
      await api(`/torneos/partidos/${partidoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ goles_local: gl, goles_visitante: gv, jugado: true }),
      });
      mostrar('Resultado cargado.', 'success');
      await cargarDetalle(seleccionado!);
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo cargar el resultado', 'danger');
    }
  }

  const activos = torneos.filter((t) => t.estado === 'inscripcion' || t.estado === 'en_curso');
  const finalizados = torneos.filter((t) => t.estado === 'finalizado' || t.estado === 'cancelado');

  return (
    <div className="admin-page">
      <ToastContainer toasts={toasts} onCerrar={cerrar} />

      {/* Encabezado */}
      <header className="pagina-encabezado">
        <div>
          <span className="pagina-eyebrow">Operación › Torneos</span>
          <h1 className="pagina-titulo">Gestión de torneos</h1>
          <p className="pagina-sub">Creá, administrá y seguí cada campeonato del complejo.</p>
        </div>
        <button type="button" className="boton boton-outline" onClick={() => void cargar()}>
          <RefreshCw size={15} /> Actualizar
        </button>
      </header>

      <div className="grilla-2-col" style={{ gap: '0.9rem', alignItems: 'start' }}>
        {/* ===== Crear torneo ===== */}
        <aside className="panel panel-con-altura" style={{ alignSelf: 'start' }}>
          <div className="panel-header"><span className="panel-titulo">Crear torneo</span></div>
          <div className="panel-body">
            <form onSubmit={crearTorneo} className="stack" style={{ gap: '0.6rem' }}>
              <label className="label">Nombre del torneo<input name="nombre" required className="input" placeholder="Copa PlayControl 2026" autoFocus /></label>
              <div className="grid-2" style={{ gap: '0.5rem' }}>
                <label className="label">Deporte
                  <select name="deporte_id" className="input">
                    <option value="">Sin deporte</option>
                    {deportes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </label>
                <label className="label">Modalidad
                  <select name="modalidad" className="input" defaultValue="equipos">
                    <option value="equipos">Equipos</option>
                    <option value="individual">Individual</option>
                  </select>
                </label>
                <label className="label">Formato
                  <select name="formato" className="input" defaultValue="todos_contra_todos">
                    <option value="todos_contra_todos">Todos vs Todos</option>
                    <option value="eliminacion_directa">Eliminación directa</option>
                  </select>
                </label>
                <label className="label">Jugadores por equipo
                  <input name="jugadores_por_equipo" type="number" min={1} max={20} className="input" placeholder="5" />
                </label>
                <label className="label">Fecha de inicio<input required name="fecha_inicio" type="date" className="input" /></label>
                <label className="label">Fecha de fin<input name="fecha_fin" type="date" className="input" /></label>
                <label className="label">Cupo de equipos (sin límite si dejás vacío)
                  <input name="cupo_equipos" type="number" min={0} className="input" placeholder="Ej: 8" />
                </label>
                <label className="label">Cuota de inscripción ($)
                  <input name="cuota_inscripcion" type="number" min={0} step="1" className="input" placeholder="0" />
                </label>
              </div>
              <label className="label">Premio<input name="premio" className="input" placeholder="Ej: 3 meses gratis de PlayControl" /></label>
              <label className="label">Reglamento
                <textarea name="reglamento" className="input" rows={2} placeholder="Reglas del torneo — gol de diferencia, límite de tarjetas…" />
              </label>
              <button type="submit" className="boton boton-primario boton-block" disabled={creando}><Plus size={16} /> {creando ? 'Creando…' : 'Crear torneo'}</button>
            </form>
          </div>
        </aside>

        {/* ===== Listado + detalle ===== */}
        <section className="panel">
          <div className="panel-header">
            <span className="panel-titulo">Torneos</span>
            <div className="fila" style={{ gap: '0.35rem' }}>
              <Link to="/torneos" target="_blank" className="boton boton-ghost" style={{ fontSize: '0.78rem', padding: '0.35rem 0.6rem' }}>Ver público ↗</Link>
            </div>
          </div>
          <div className="panel-body" style={{ padding: '0.5rem 0.75rem' }}>
            <div className="stack" style={{ gap: '0.4rem' }}>
              {activos.length === 0 && finalizados.length === 0 && (
                <div className="panel-vacio"><Trophy size={22} style={{ color: 'var(--primario-2)' }} /><p style={{ margin: 0 }}>Aún no hay torneos.</p></div>
              )}
              {[...activos, ...finalizados].map((t) => {
                const activo = t.id === seleccionado;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSeleccionado(t.id)}
                    className="item-turno"
                    style={{ cursor: 'pointer', textAlign: 'left', border: activo ? '1px solid var(--primario)' : undefined }}
                  >
                    <div className="item-turno-icono"><Trophy size={16} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="item-turno-nombre">{t.nombre}</div>
                      <div className="item-turno-meta">
                        {t.deportes?.nombre ? `${t.deportes.nombre} · ` : ''}
                        {t.modalidad === 'equipos' ? 'Equipos' : 'Individual'} · {t.formato === 'todos_contra_todos' ? 'Todos vs Todos' : 'Eliminación directa'} · {t.estado === 'en_curso' ? 'En curso' : t.estado === 'finalizado' ? 'Finalizado' : 'Inscripción'}
                      </div>
                      {t.jugadores_por_equipo != null && (
                        <div className="texto-debil" style={{ fontSize: '0.78rem' }}>
                          {t.jugadores_por_equipo} v {t.jugadores_por_equipo}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={15} style={{ color: activo ? 'var(--primario-2)' : 'var(--texto-3)' }} />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* ===== Detalle del torneo seleccionado ===== */}
      {seleccionado && torneoDetalle && (
        <section className="panel" style={{ marginTop: '0.9rem' }}>
          <div className="panel-header">
            <span className="panel-titulo">
              <Trophy size={12} style={{ verticalAlign: '-0.1em', marginRight: '0.35rem' }} />
              {torneoDetalle.nombre}
              <Badge variant={torneoDetalle.estado === 'en_curso' ? 'success' : torneoDetalle.estado === 'finalizado' ? 'neutral' : 'warning'} style={{ marginLeft: '0.5rem' }}>
                {torneoDetalle.estado === 'en_curso' ? 'En curso' : torneoDetalle.estado === 'finalizado' ? 'Finalizado' : 'Inscripción'}
              </Badge>
            </span>
            <button type="button" className="dialog-cerrar" onClick={() => setSeleccionado(null)} aria-label="Cerrar"><X size={15} /></button>
          </div>
          <div className="panel-body" style={{ padding: '0.75rem' }}>
            <div className="grilla-2-col" style={{ gap: '0.75rem', alignItems: 'start' }}>
              <div className="stack" style={{ gap: '0.6rem' }}>
                <div className="fila-entre">
                  <div>
                    <strong>Inscriptos / equipos</strong>
                    <p className="texto-debil" style={{ margin: 0 }}>{inscritos.length} anotado{inscritos.length !== 1 ? 's' : ''}{torneoDetalle.cupo_equipos ? ` / cupo ${torneoDetalle.cupo_equipos}` : ''}</p>
                  </div>
                  {torneoDetalle.estado === 'inscripcion' && (
                    <button type="button" className="boton boton-primario" onClick={generarFixture} disabled={generando || inscritos.length < 2}>
                      {generando ? <Loader2 size={15} /> : <Grid3x3 size={15} />} {generando ? 'Generando…' : 'Generar fixture'}
                    </button>
                  )}
                  {torneoDetalle.estado === 'en_curso' && (
                    <button type="button" className="boton boton-outline" onClick={finalizarTorneo}><CheckCircle2 size={15} /> Finalizar torneo</button>
                  )}
                </div>
                {inscritos.length === 0 ? (
                  <p className="texto-sec" style={{ margin: 0 }}>Todavía no hay anotados.</p>
                ) : (
                  inscritos.map((i) => (
                    <div key={i.id} className="item-turno">
                      <div className="item-turno-icono"><Users size={16} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="item-turno-nombre">{i.nombre_equipo}</div>
                        <div className="item-turno-meta">Capitán: {i.usuarios?.nombre} {i.usuarios?.apellido ?? ''} · {i.usuarios?.telefono ?? '—'}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="stack" style={{ gap: '0.6rem' }}>
                <div>
                  <strong>Fixture y resultados</strong>
                  <p className="texto-debil" style={{ margin: 0 }}>Cargá Paso a paso los resultados de cada partido.</p>
                </div>
                {partidos.length === 0 ? (
                  <p className="texto-sec" style={{ margin: 0 }}>Aún no se generó fixture.</p>
                ) : (
                  <div className="stack" style={{ gap: '0.3rem' }}>
                    {partidos.map((p) => (
                      <ResultadoPartido key={p.id} partido={p} onGuardar={cargarResultado} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ResultadoPartido({
  partido,
  onGuardar,
}: {
  partido: PartidoVista;
  onGuardar: (id: number, gl: number, gv: number) => void;
}) {
  const [gl, setGl] = useState(partido.goles_local ?? 0);
  const [gv, setGv] = useState(partido.goles_visitante ?? 0);

  return (
    <form
      className="fila-entre"
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar(partido.id, gl, gv);
      }}
      style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--radio)' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--texto-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{partido.fase}</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
          {partido.equipo_local_nombre ?? '—'} <strong>vs</strong> {partido.equipo_visitante_nombre ?? '—'}
        </div>
      </div>
      <div className="fila" style={{ gap: '0.3rem' }}>
        <input type="number" min={0} value={gl} onChange={(e) => setGl(Number(e.target.value))} className="input" style={{ width: '3.4rem', textAlign: 'center' }} aria-label="Goles local" />
        <span style={{ color: 'var(--texto-3)' }}>–</span>
        <input type="number" min={0} value={gv} onChange={(e) => setGv(Number(e.target.value))} className="input" style={{ width: '3.4rem', textAlign: 'center' }} aria-label="Goles visitante" />
        <button type="submit" className="boton boton-primario" style={{ padding: '0.35rem 0.7rem' }}>Guardar</button>
      </div>
    </form>
  );
}
