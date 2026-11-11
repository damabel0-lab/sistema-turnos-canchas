import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Card, Badge } from '../../components/ui';
import { ToastContainer, useToast } from '../../components/ui/Toast';
import {
  Trophy,
  Users,
  CalendarDays,
  Wallet,
  ChevronRight,
  X,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface PartidoVista {
  id: number;
  equipo_local_id: number | null;
  equipo_visitante_id: number | null;
  equipo_local_nombre: string | null;
  equipo_visitante_nombre: string | null;
  fecha_hora: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
  jugado: boolean;
  fase: string;
}

interface EquipoVista {
  id: number;
  nombre_equipo: string;
  capitan_id: string | null;
  usuarios: { nombre: string; apellido: string | null; telefono: string | null } | null;
}

interface Posicion {
  equipoId: number;
  nombreEquipo: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  puntos: number;
}

interface TorneoActivo {
  id: number;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  premio: string | null;
  modalidad: 'individual' | 'equipos';
  formato: 'todos_contra_todos' | 'eliminacion_directa';
  cupo_equipos: number | null;
  jugadores_por_equipo: number | null;
  cuota_inscripcion: number | null;
  reglamento: string | null;
  estado: 'inscripcion' | 'en_curso' | 'finalizado' | 'cancelado';
  deportes?: { nombre: string } | null;
}

export function TorneosClientePage() {
  const { session, perfil } = useAuth();
  const [torneos, setTorneos] = useState<TorneoActivo[]>([]);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [inscripciones, setInscripciones] = useState<EquipoVista[]>([]);
  const [partidos, setPartidos] = useState<PartidoVista[]>([]);
  const [tabla, setTabla] = useState<Posicion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [nombreEquipo, setNombreEquipo] = useState('');
  const { toasts, mostrar, cerrar } = useToast();
  const [ofreceTorneos, setOfreceTorneos] = useState(true);

  useEffect(() => {
    api<{ ofrece_torneos?: boolean }>('/config')
      .then((d) => setOfreceTorneos(d.ofrece_torneos !== false))
      .catch(() => {});
  }, []);

  const cargarTorneos = useCallback(async () => {
    if (!ofreceTorneos) return;
    setCargando(true);
    try {
      setTorneos(await api<TorneoActivo[]>('/torneos/activos'));
    } catch {
      setTorneos([]);
    } finally {
      setCargando(false);
    }
  }, [ofreceTorneos]);

  useEffect(() => {
    void cargarTorneos();
  }, [cargarTorneos]);

  const torneoSeleccionado = torneos.find((t) => t.id === seleccionado) ?? null;

  const cargarDetalle = useCallback(async (id: number) => {
    try {
      const [insc, pt, tb] = await Promise.allSettled([
        api<EquipoVista[]>(`/torneos/${id}/inscripciones`),
        api<PartidoVista[]>(`/torneos/${id}/partidos`),
        api<Posicion[]>(`/torneos/${id}/tabla`),
      ]);
      setInscripciones(insc.status === 'fulfilled' ? insc.value : []);
      setPartidos(pt.status === 'fulfilled' ? pt.value : []);
      setTabla(tb.status === 'fulfilled' ? tb.value : []);
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'Error cargando detalle', 'danger');
    }
  }, [mostrar]);

  async function inscribirse(e: FormEvent) {
    e.preventDefault();
    if (!torneoSeleccionado || !session) return;
    setInscribiendo(true);
    try {
      const body: Record<string, unknown> = {};
      if (torneoSeleccionado.modalidad === 'equipos') {
        body.nombre_equipo = nombreEquipo.trim();
        if (!body.nombre_equipo) {
          mostrar('Ingresá el nombre de tu equipo.', 'warning');
          return;
        }
      }
      await api(`/torneos/${torneoSeleccionado.id}/inscribirse`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      mostrar('¡Inscripción confirmada!', 'success');
      setNombreEquipo('');
      await cargarDetalle(torneoSeleccionado.id);
      await cargarTorneos();
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo inscribir', 'danger');
    } finally {
      setInscribiendo(false);
    }
  }

  async function cancelarInscripcion() {
    if (!torneoSeleccionado) return;
    try {
      await api(`/torneos/${torneoSeleccionado.id}/inscribirse`, { method: 'DELETE' });
      mostrar('Inscripción cancelada.', 'success');
      await cargarDetalle(torneoSeleccionado.id);
      await cargarTorneos();
    } catch (err) {
      mostrar(err instanceof Error ? err.message : 'No se pudo cancelar', 'danger');
    }
  }

  const yaInscripto = perfil
    ? inscripciones.some((i) => i.capitan_id === perfil.id)
    : false;

  if (!ofreceTorneos) {
    return (
      <main className="pantalla">
        <div className="contenedor">
          <Card className="caja-vacia">
            <Trophy size={28} style={{ margin: '0 auto 0.75rem', color: 'var(--texto-3)' }} />
            <h1 className="titulo">Torneos</h1>
            <p className="texto-sec" style={{ margin: 0 }}>Este complejo no ofrece torneos por ahora.</p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="pantalla">
      <div className="contenedor-ancho" style={{ maxWidth: '1200px' }}>
        <ToastContainer toasts={toasts} onCerrar={cerrar} />

        <header className="pagina-encabezado">
          <div>
            <span className="pagina-eyebrow">Mi cuenta · Competencia</span>
            <h1 className="pagina-titulo">Torneos</h1>
            <p className="pagina-sub">Competi con tus amigos — inscripción libre, fixture y tabla online.</p>
          </div>
        </header>

        {/* ===== Listado de torneos ===== */}
        {!seleccionado && (
          <>
            {cargando ? (
              <div className="grilla-tarjetas" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: '8rem' }} />)}
              </div>
            ) : torneos.length === 0 ? (
              <Card className="caja-vacia">
                <Trophy size={28} style={{ color: 'var(--texto-3)', margin: '0 auto 0.5rem' }} />
                <h3 style={{ margin: 0 }}>Aún no hay torneos abiertos</h3>
                <p className="texto-sec">Cuando el complejo publique uno, va a aparecer acá.</p>
              </Card>
            ) : (
              <div className="grilla-tarjetas" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
                {torneos.map((t) => {
                  const fecha = new Date(t.fecha_inicio + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSeleccionado(t.id);
                        void cargarDetalle(t.id);
                      }}
                      className="tarjeta-palpitante"
                      style={{ textAlign: 'left', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                    >
                      <div className="fila-entre" style={{ gap: '0.5rem' }}>
                        <span className="metrica-icono verde"><Trophy size={18} /></span>
                        <Badge variant={t.estado === 'en_curso' ? 'success' : t.estado === 'finalizado' ? 'neutral' : 'warning'}>
                          {t.estado === 'en_curso' ? 'En curso' : t.estado === 'finalizado' ? 'Finalizado' : t.estado === 'cancelado' ? 'Cancelado' : 'Inscripción abierta'}
                        </Badge>
                      </div>
                      <h2 className="titulo" style={{ fontSize: '1.05rem', margin: 0 }}>{t.nombre}</h2>
                      <div className="fila" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-neutro">{t.modalidad === 'equipos' ? 'Equipos' : 'Individual'}</span>
                        <span className="badge badge-neutro">{t.formato === 'todos_contra_todos' ? 'Todos vs Todos' : 'Eliminación directa'}</span>
                        {t.deportes?.nombre && <span className="badge badge-info">{t.deportes.nombre}</span>}
                        {t.jugadores_por_equipo != null && <span className="badge badge-success">{t.jugadores_por_equipo}v{t.jugadores_por_equipo}</span>}
                      </div>
                      <div className="fila-entre" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                        <span className="texto-sec" style={{ fontSize: '0.8rem' }}><CalendarDays size={12} style={{ verticalAlign: '-0.1em' }} /> {fecha}</span>
                        <ChevronRight size={15} style={{ color: 'var(--primario-2)' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===== Detalle ===== */}
        {torneoSeleccionado && (
          <section>
            <div className="fila-entre" style={{ marginBottom: '0.75rem' }}>
              <div>
                <span className="pagina-eyebrow">Torneo seleccionado</span>
                <h1 className="pagina-titulo" style={{ marginBottom: 0 }}>{torneoSeleccionado.nombre}</h1>
              </div>
              <button type="button" className="boton boton-ghost" onClick={() => setSeleccionado(null)} aria-label="Volver al listado">
                <X size={16} /> Volver
              </button>
            </div>

            <div className="grilla-2-col" style={{ gap: '0.9rem', alignItems: 'start' }}>
              {/* ===== Info + inscripción ===== */}
              <aside className="panel panel-con-altura">
                <div className="panel-header"><span className="panel-titulo">Ficha del torneo</span></div>
                <div className="panel-body" style={{ padding: '0.9rem' }}>
                  <div className="stack" style={{ gap: '0.5rem' }}>
                    <div className="fila" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                      <Badge variant="info">{torneoSeleccionado.modalidad === 'equipos' ? 'Equipos' : 'Individual'}</Badge>
                      <Badge variant="neutral">{torneoSeleccionado.formato === 'todos_contra_todos' ? 'Todos vs todos' : 'Eliminación directa'}</Badge>
                      <Badge variant={torneoSeleccionado.estado === 'en_curso' ? 'success' : 'warning'}>{torneoSeleccionado.estado === 'en_curso' ? 'En curso' : 'Inscripción'}</Badge>
                      {torneoSeleccionado.deportes?.nombre && <Badge variant="info">{torneoSeleccionado.deportes.nombre}</Badge>}
                      {torneoSeleccionado.jugadores_por_equipo != null && (
                        <Badge variant="success">{`${torneoSeleccionado.jugadores_por_equipo}v${torneoSeleccionado.jugadores_por_equipo}`}</Badge>
                      )}
                    </div>
                    <div className="fila" style={{ gap: '0.4rem' }}>
                      <CalendarDays size={14} style={{ color: 'var(--texto-2)' }} />
                      <span className="texto-sec">{new Date(torneoSeleccionado.fecha_inicio + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}{torneoSeleccionado.fecha_fin ? ` → ${new Date(torneoSeleccionado.fecha_fin + 'T00:00:00').toLocaleDateString('es-AR')}` : ''}</span>
                    </div>
                    {torneoSeleccionado.premio && (
                      <div className="fila" style={{ gap: '0.4rem' }}>
                        <Trophy size={14} style={{ color: 'var(--advertencia)' }} />
                        <span className="texto-sec">Premio: <strong style={{ color: 'var(--texto)' }}>{torneoSeleccionado.premio}</strong></span>
                      </div>
                    )}
                    {torneoSeleccionado.cuota_inscripcion != null && (
                      <div className="fila" style={{ gap: '0.4rem' }}>
                        <Wallet size={14} style={{ color: 'var(--texto-2)' }} />
                        <span className="texto-sec">Cuota de inscripción: ${Number(torneoSeleccionado.cuota_inscripcion).toLocaleString('es-AR')}</span>
                      </div>
                    )}
                    {torneoSeleccionado.cupo_equipos != null && (
                      <div className="fila" style={{ gap: '0.4rem' }}>
                        <Users size={14} style={{ color: 'var(--texto-2)' }} />
                        <span className="texto-sec">Cupo: {inscripciones.length} / {torneoSeleccionado.cupo_equipos}</span>
                      </div>
                    )}
                    {torneoSeleccionado.reglamento && (
                      <div style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radio)', padding: '0.5rem 0.65rem', fontSize: '0.8rem', color: 'var(--texto-2)' }}>
                        <strong style={{ color: 'var(--texto)' }}>Reglamento</strong><br />{torneoSeleccionado.reglamento}
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                      {torneoSeleccionado.estado === 'inscripcion' && session && !yaInscripto && (
                        <form onSubmit={inscribirse} className="stack" style={{ gap: '0.5rem' }}>
                          {torneoSeleccionado.modalidad === 'equipos' ? (
                            <>
                              <label className="label">Nombre de tu equipo<input value={nombreEquipo} onChange={(e) => setNombreEquipo(e.target.value)} required className="input" placeholder="Los Rayos" autoFocus /></label>
                              <button type="submit" className="boton boton-primario boton-block" disabled={inscribiendo}>{inscribiendo ? <><Loader2 size={15} /> Inscribiendo…</> : 'Anotar equipo'}</button>
                            </>
                          ) : (
                            <button type="submit" className="boton boton-primario boton-block" disabled={inscribiendo}>{inscribiendo ? <><Loader2 size={15} /> Inscribiendo…</> : 'Anotarme al torneo'}</button>
                          )}
                        </form>
                      )}
                      {yaInscripto && (
                        <div className="stack" style={{ gap: '0.5rem' }}>
                          <div className="fila" style={{ gap: '0.4rem', color: 'var(--exito)', fontWeight: 700 }}><CheckCircle2 size={15} /> Inscripto</div>
                          {torneoSeleccionado.estado === 'inscripcion' && (
                            <button type="button" className="boton boton-outline" onClick={cancelarInscripcion}>Cancelar inscripción</button>
                          )}
                        </div>
                      )}
                      {!session && <p className="texto-sec" style={{ margin: 0 }}>Iniciá sesión para inscribirte.</p>}
                    </div>
                  </div>
                </div>
              </aside>

              {/* ===== Inscriptos + fixture ===== */}
              <div className="stack" style={{ gap: '0.9rem' }}>
                {/* Inscriptos */}
                <section className="panel panel-con-altura">
                  <div className="panel-header"><span className="panel-titulo">Inscriptos</span><span className="texto-debil">{inscripciones.length}</span></div>
                  <div className="panel-body" style={{ gap: '0.35rem' }}>
                    {inscripciones.length === 0 ? (
                      <p className="texto-sec" style={{ padding: '0.75rem' }}>Todavía no se anotó nadie.</p>
                    ) : (
                      inscripciones.map((i) => (
                        <div key={i.id} className="item-turno">
                          <div className="item-turno-icono" style={{ background: 'var(--bg-surface-2)' }}><Users size={16} /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="item-turno-nombre">{i.nombre_equipo}</div>
                            <div className="item-turno-meta">Capitán: {i.usuarios?.nombre} {i.usuarios?.apellido ?? ''}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Fixture */}
                {partidos.length > 0 && (
                  <section className="panel panel-con-altura">
                    <div className="panel-header"><span className="panel-titulo">Fixture</span></div>
                    <div className="panel-body" style={{ gap: '0.35rem' }}>
                      {partidos.map((p) => (
                        <div key={p.id} className="item-turno">
                          <div className="item-turno-nombre" style={{ flex: 1 }}>
                            {p.equipo_local_nombre ?? 'Local'}
                          </div>
                          <div style={{ fontWeight: 850, letterSpacing: '-0.02em' }}>{p.jugado ? `${p.goles_local}–${p.goles_visitante}` : 'vs'}</div>
                          <div className="item-turno-nombre" style={{ flex: 1, textAlign: 'right' }}>
                            {p.equipo_visitante_nombre ?? 'Visitante'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Tabla */}
                {tabla.length > 0 && (
                  <section className="panel panel-con-altura">
                    <div className="panel-header"><span className="panel-titulo">Tabla de posiciones</span></div>
                    <div className="panel-body" style={{ padding: '0.5rem 0.75rem' }}>
                      <table className="tabla" style={{ width: '100%' }}>
                        <thead>
                          <tr><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>DG</th><th>Pts</th></tr>
                        </thead>
                        <tbody>
                          {tabla.map((p) => (
                            <tr key={p.equipoId}>
                              <td style={{ fontWeight: 600 }}>{p.nombreEquipo}</td>
                              <td>{p.pj}</td><td>{p.pg}</td><td>{p.pe}</td><td>{p.pp}</td>
                              <td>{p.dg}</td><td style={{ fontWeight: 800 }}>{p.puntos}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
