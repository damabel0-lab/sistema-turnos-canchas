import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Camera,
  Clock,
  Dumbbell,
  MapPin,
  Phone,
  Mail,
  Trophy,
  Users,
  Waves,
  CircleCheck,
  Swords,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useComplejo } from '../../hooks/useComplejo';
import { MuroComplejo } from '../../components/social/MuroComplejo';
import { iniciales, leerImagen } from '../../components/social/Avatar';

interface DeporteDetalle {
  id: number;
  nombre: string;
}

interface CanchaDetalle {
  id: number;
  nombre: string;
  precio_base: number;
  deporte_id: number;
  caracteristicas: string | null;
  deporte: { nombre: string; tipo: string } | null;
}

interface TorneoLocal {
  id: number;
  nombre: string;
  estado: string;
  modalidad: string;
  formato: string;
  fecha_inicio?: string;
  premio?: string | null;
  complejo_id: number;
}

interface ComplejoDetalle {
  id: number;
  nombre: string;
  slug: string;
  tipo: string;
  ciudad: string | null;
  direccion: string | null;
  telefono: string | null;
  email_contacto: string | null;
  descripcion: string | null;
  foto_portada: string | null;
  foto_perfil: string | null;
  gym: boolean;
  pileta: boolean;
  precio_mensual_gym: number | null;
  precio_mensual_pileta: number | null;
  ofrece_torneos: boolean;
  ofrece_socios: boolean;
  amenidades: string[];
  deportes: DeporteDetalle[];
  hora_apertura: string;
  hora_cierre: string;
  cancelacion_minima_horas: number;
  sena_obligatoria: boolean;
  descuento_turno_fijo_porcentaje: number;
  canchas: CanchaDetalle[];
}

const fmtPesos = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const HORARIO = (t: string) => String(t).slice(0, 5);

const MAX_FOTO_BYTES = 6 * 1024 * 1024;

export function ComplejoDetallePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { seleccionar, membresias, esSuperAdmin } = useComplejo();
  const [detalle, setDetalle] = useState<ComplejoDetalle | null>(null);
  const [torneos, setTorneos] = useState<TorneoLocal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Editor de fotos de perfil/portada (solo dueño)
  const [editandoFotos, setEditandoFotos] = useState(false);
  const [fotoPerfilSel, setFotoPerfilSel] = useState<string | null>(null);
  const [fotoPortadaSel, setFotoPortadaSel] = useState<string | null>(null);
  const [guardandoFotos, setGuardandoFotos] = useState(false);
  const [errorFotos, setErrorFotos] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelado = false;
    setCargando(true);
    setError(null);
    api<ComplejoDetalle>(`/complejos/${slug}`)
      .then((d) => {
        if (!cancelado) setDetalle(d);
      })
      .catch((e) => {
        if (!cancelado) setError(e instanceof Error ? e.message : 'No se pudo cargar el complejo');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    api<TorneoLocal[]>('/torneos/activos')
      .then((list) => {
        if (!cancelado) setTorneos(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelado) setTorneos([]);
      });
    return () => {
      cancelado = true;
    };
  }, [slug]);

  if (cargando) {
    return (
      <main className="contenedor" style={{ paddingTop: '1.5rem' }}>
        <p className="texto-sec">Cargando complejo…</p>
      </main>
    );
  }

  if (error || !detalle) {
    return (
      <main className="contenedor" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
        <Link to="/complejos" className="fila" style={{ gap: '0.4rem', marginBottom: '1rem', color: 'var(--texto-2)', width: 'fit-content' }}>
          <ArrowLeft size={16} /> Volver al catálogo
        </Link>
        <div className="empty-state">
          <Building2 size={36} strokeWidth={1.6} style={{ color: 'var(--texto-3)' }} />
          <h1 className="titulo" style={{ margin: 0 }}>No pudimos mostrar este complejo</h1>
          <p className="subtitulo" style={{ margin: 0 }}>{error ?? 'Puede que no exista o no esté disponible.'}</p>
        </div>
      </main>
    );
  }

  const deportesConCanchas = detalle.deportes
    .map((d) => ({ ...d, canchas: detalle.canchas.filter((c) => c.deporte_id === d.id).length }))
    .filter((d) => d.canchas > 0);

  const torneosLocales = torneos.filter((t) => t.complejo_id === detalle.id && t.estado !== 'cancelado');

  const esDuenoDelComplejo = membresias.some((m) => m.complejo_id === detalle.id && m.rol === 'dueno');
  const esStaffDelComplejo = membresias.some((m) => m.complejo_id === detalle.id);
  const puedeModerar = esStaffDelComplejo || esSuperAdmin;

  const reservar = (canchaId?: number) => {
    seleccionar(detalle.id, detalle.slug);
    navigate(`/reservar?complejo=${detalle.slug}${canchaId != null ? `&cancha=${canchaId}` : ''}`);
  };

  const pedirMensualidad = () => {
    seleccionar(detalle.id, detalle.slug);
    navigate('/mis-abonos');
  };

  const cerrarEditorFotos = () => {
    setEditandoFotos(false);
    setFotoPerfilSel(null);
    setFotoPortadaSel(null);
    setErrorFotos(null);
  };

  const elegirFoto = async (e: React.ChangeEvent<HTMLInputElement>, campo: 'perfil' | 'portada') => {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    if (file.size > MAX_FOTO_BYTES) {
      setErrorFotos('La imagen supera los 6 MB');
      return;
    }
    try {
      const data = await leerImagen(file);
      setErrorFotos(null);
      if (campo === 'perfil') setFotoPerfilSel(data);
      else setFotoPortadaSel(data);
    } catch {
      setErrorFotos('No se pudo leer la imagen');
    }
  };

  const guardarFotos = async () => {
    if ((!fotoPerfilSel && !fotoPortadaSel) || guardandoFotos) return;
    setGuardandoFotos(true);
    setErrorFotos(null);
    try {
      if (fotoPerfilSel) {
        const r = await api<{ campo: string; url: string }>(
          `/publicaciones/complejo/${detalle.slug}/imagenes`,
          { method: 'POST', body: JSON.stringify({ campo: 'foto_perfil', imagen: { data: fotoPerfilSel } }) },
        );
        setDetalle((prev) => (prev ? { ...prev, foto_perfil: r.url } : prev));
      }
      if (fotoPortadaSel) {
        const r = await api<{ campo: string; url: string }>(
          `/publicaciones/complejo/${detalle.slug}/imagenes`,
          { method: 'POST', body: JSON.stringify({ campo: 'foto_portada', imagen: { data: fotoPortadaSel } }) },
        );
        setDetalle((prev) => (prev ? { ...prev, foto_portada: r.url } : prev));
      }
      cerrarEditorFotos();
    } catch (e) {
      setErrorFotos(e instanceof Error ? e.message : 'No se pudieron guardar las fotos');
    } finally {
      setGuardandoFotos(false);
    }
  };

  return (
    <main className="contenedor perfil-social" style={{ paddingTop: '1.1rem', paddingBottom: '2.5rem', maxWidth: '1120px' }}>
      <Link to="/complejos" className="fila" style={{ gap: '0.4rem', marginBottom: '0.7rem', color: 'var(--texto-2)', width: 'fit-content' }}>
        <ArrowLeft size={16} /> Todos los complejos
      </Link>

      {/* ===== Portada ===== */}
      <header className="perfil-portada">
        {detalle.foto_portada ? (
          <img className="perfil-portada-img" src={detalle.foto_portada} alt="" />
        ) : (
          <div className="perfil-portada-fallback" aria-hidden />
        )}
        {esDuenoDelComplejo && (
          <button
            type="button"
            className="boton boton-ghost perfil-portada-btn"
            onClick={() => (editandoFotos ? cerrarEditorFotos() : setEditandoFotos(true))}
          >
            <Camera size={15} /> {editandoFotos ? 'Cerrar' : 'Editar fotos'}
          </button>
        )}
      </header>

      {/* ===== Encabezado del perfil ===== */}
      <div className="perfil-encabezado">
        <div className="perfil-avatar">
          {detalle.foto_perfil ? (
            <img className="perfil-avatar-img" src={detalle.foto_perfil} alt="" />
          ) : (
            <span className="perfil-monogramo">{iniciales(detalle.nombre, '')}</span>
          )}
        </div>

        <div className="perfil-datos">
          <div className="fila" style={{ gap: '0.55rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <h1 className="perfil-nombre">{detalle.nombre}</h1>
            <span className={`badge ${detalle.tipo === 'fraccionado' ? 'badge-info' : 'badge-neutro'}`}>
              {detalle.tipo === 'fraccionado' ? 'Fraccionado' : 'Complejo deportivo'}
            </span>
            {detalle.ofrece_torneos && <span className="badge badge-advertencia">Torneos</span>}
            {detalle.ofrece_socios && <span className="badge badge-exito">Plan de socios</span>}
          </div>

          <div className="perfil-chips">
            <span className="perfil-chip"><Clock size={14} /> {HORARIO(detalle.hora_apertura)} – {HORARIO(detalle.hora_cierre)}</span>
            {(detalle.direccion || detalle.ciudad) && (
              <span className="perfil-chip">
                <MapPin size={14} /> {[detalle.direccion, detalle.ciudad].filter(Boolean).join(' · ')}
              </span>
            )}
            {detalle.telefono && <span className="perfil-chip"><Phone size={14} /> {detalle.telefono}</span>}
            {detalle.email_contacto && <span className="perfil-chip"><Mail size={14} /> {detalle.email_contacto}</span>}
          </div>
        </div>

        <div className="perfil-acciones">
          <button
            type="button"
            className="boton boton-primario"
            style={{ fontSize: '1rem', padding: '0.9rem 1.5rem' }}
            onClick={() => reservar()}
          >
            <CalendarClock size={18} /> Reservar
          </button>
          {(detalle.gym || detalle.pileta) && (
            <button type="button" className="boton boton-outline" style={{ fontSize: '0.9rem', padding: '0.75rem 1.2rem' }} onClick={pedirMensualidad}>
              Pedir mensualidad
            </button>
          )}
        </div>
      </div>

      {detalle.descripcion && <p className="perfil-descripcion">{detalle.descripcion}</p>}

      {/* ===== Editor de fotos (dueño) ===== */}
      {esDuenoDelComplejo && editandoFotos && (
        <section className="panel perfil-editor-fotos" aria-label="Editar fotos del complejo">
          <div className="fila-entre" style={{ gap: '0.6rem' }}>
            <span className="panel-titulo">Fotos del complejo</span>
            <button type="button" className="muro-borrar" aria-label="Cerrar" onClick={cerrarEditorFotos}>
              <X size={15} />
            </button>
          </div>
          <div className="perfil-editor-fotos-campos">
            <label className="perfil-editor-campo">
              <span className="texto-debil" style={{ fontSize: '0.8rem' }}>Foto de perfil</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => void elegirFoto(e, 'perfil')}
              />
              <div className="perfil-editor-preview">
                {fotoPerfilSel ? (
                  <img src={fotoPerfilSel} alt="Vista previa foto de perfil" />
                ) : detalle.foto_perfil ? (
                  <img src={detalle.foto_perfil} alt="Foto de perfil actual" />
                ) : (
                  <span className="perfil-monogramo">{iniciales(detalle.nombre, '')}</span>
                )}
              </div>
            </label>
            <label className="perfil-editor-campo">
              <span className="texto-debil" style={{ fontSize: '0.8rem' }}>Portada</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => void elegirFoto(e, 'portada')}
              />
              <div className="perfil-editor-preview perfil-editor-preview-portada">
                {fotoPortadaSel ? (
                  <img src={fotoPortadaSel} alt="Vista previa portada" />
                ) : detalle.foto_portada ? (
                  <img src={detalle.foto_portada} alt="Portada actual" />
                ) : (
                  <span className="texto-debil" style={{ fontSize: '0.8rem' }}>Sin portada</span>
                )}
              </div>
            </label>
          </div>
          {errorFotos && <p className="muro-error">{errorFotos}</p>}
          <div className="fila-entre" style={{ gap: '0.6rem', marginTop: '0.6rem' }}>
            <span className="texto-debil" style={{ fontSize: '0.78rem' }}>PNG, JPEG o WebP · hasta 6 MB</span>
            <div className="fila" style={{ gap: '0.5rem' }}>
              <button type="button" className="boton boton-ghost" style={{ fontSize: '0.85rem' }} onClick={cerrarEditorFotos}>
                Cancelar
              </button>
              <button
                type="button"
                className="boton boton-primario"
                style={{ fontSize: '0.85rem' }}
                disabled={guardandoFotos || (!fotoPerfilSel && !fotoPortadaSel)}
                onClick={() => void guardarFotos()}
              >
                {guardandoFotos ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Torneos en este complejo (si hay) */}
      {torneosLocales.length > 0 && (
        <section className="card-torneo-local" aria-label="Torneos en este complejo">
          <div className="fila-entre" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
            <div className="fila" style={{ gap: '0.55rem' }}>
              <span className="torneo-icono"><Trophy size={18} /></span>
              <div>
                <span className="pagina-eyebrow" style={{ color: 'var(--advertencia)', margin: 0 }}>Torneo en este complejo</span>
                <strong style={{ fontSize: '1.02rem' }}>{torneosLocales[0].nombre}</strong>
                <span className="texto-debil" style={{ marginLeft: '0.5rem', fontSize: '0.82rem' }}>
                  {torneosLocales[0].modalidad === 'equipos' ? 'Equipos' : 'Individual'}
                  {' · '}
                  {torneosLocales[0].formato === 'todos_contra_todos' ? 'Todos vs Todos' : 'Eliminación directa'}
                  {' · '}
                  {torneosLocales[0].estado === 'en_curso' ? 'En curso' : 'Inscripción abierta'}
                </span>
              </div>
            </div>
            <Link to="/torneos" className="boton boton-primario" style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}>
              <Swords size={15} /> Ver inscripción
            </Link>
          </div>
        </section>
      )}

      {/* ===== Muro social del complejo ===== */}
      <MuroComplejo slug={detalle.slug} puedeModerar={puedeModerar} />

      {/* ===== Canchas + columna lateral ===== */}
      <div className="grid-det-detalle">
        {/* Canchas y precios */}
        <section className="panel panel-con-altura" aria-labelledby="titulo-canchas">
          <div className="panel-header">
            <span className="panel-titulo" id="titulo-canchas">Canchas</span>
            <span className="texto-debil">{detalle.canchas.length} disponible{detalle.canchas.length === 1 ? '' : 's'}</span>
          </div>
          <div className="panel-body">
            {detalle.canchas.length === 0 ? (
              <p className="texto-debil">Todavía no hay canchas cargadas.</p>
            ) : (
              <div className="canchas-grid-panel">
                {detalle.canchas.map((c) => (
                  <div key={c.id} className="cancha-card">
                    <div className="fila-entre" style={{ gap: '0.4rem' }}>
                      <strong>{c.nombre}</strong>
                      {c.deporte && <span className="amenity-chip">{c.deporte.nombre}</span>}
                    </div>
                    {c.caracteristicas && <p className="texto-debil" style={{ margin: 0, fontSize: '0.78rem' }}>{c.caracteristicas}</p>}
                    <div className="fila-entre" style={{ marginTop: 'auto', paddingTop: '0.35rem' }}>
                      <strong style={{ fontSize: '0.98rem' }}>${c.precio_base.toLocaleString('es-AR')}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--texto-3)' }}>por hora</span>
                    </div>
                    <button
                      type="button"
                      className="boton boton-outline"
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem', marginTop: '0.4rem' }}
                      onClick={() => reservar(c.id)}
                    >
                      Reservar esta cancha
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Columna lateral: disciplinas + gym/pileta */}
        <aside className="stack" style={{ alignSelf: 'start', gap: '0.75rem' }}>
          <section className="panel" aria-labelledby="titulo-disciplinas">
            <div className="panel-header">
              <span className="panel-titulo" id="titulo-disciplinas">Disciplinas</span>
            </div>
            <div className="panel-body">
              {deportesConCanchas.length === 0 ? (
                <p className="texto-debil">El complejo todavía no publicó disciplinas.</p>
              ) : (
                deportesConCanchas.map((d) => (
                  <div key={d.id} className="fila-entre" style={{ padding: '0.45rem 0.2rem', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 600 }}>{d.nombre}</span>
                    <span className="amenity-chip">{d.canchas} {d.canchas === 1 ? 'cancha' : 'canchas'}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {(detalle.gym || detalle.pileta) && (
            <section className="panel" aria-labelledby="titulo-gym">
              <div className="panel-header">
                <span className="panel-titulo" id="titulo-gym">Gimnasio y pileta</span>
              </div>
              <div className="panel-body">
                {detalle.gym && (
                  <div className="gympileta-fila">
                    <span className="fila" style={{ gap: '0.45rem' }}><Dumbbell size={16} style={{ color: 'var(--primario-2)' }} /> <strong>Gimnasio</strong></span>
                    {detalle.precio_mensual_gym != null && <span className="amenity-chip destacada">${fmtPesos(detalle.precio_mensual_gym)}/mes</span>}
                  </div>
                )}
                {detalle.pileta && (
                  <div className="gympileta-fila">
                    <span className="fila" style={{ gap: '0.45rem' }}><Waves size={16} style={{ color: 'var(--primario-2)' }} /> <strong>Pileta</strong></span>
                    {detalle.precio_mensual_pileta != null && <span className="amenity-chip destacada">${fmtPesos(detalle.precio_mensual_pileta)}/mes</span>}
                  </div>
                )}
                <p className="texto-debil" style={{ margin: '0.2rem 0 0', fontSize: '0.8rem' }}>Uso mensual libre · pago en recepción</p>
                <button type="button" className="boton boton-primario" style={{ fontSize: '0.85rem', width: '100%', justifyContent: 'center' }} onClick={pedirMensualidad}>
                  Pedir mensualidad
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* Amenities y políticas */}
      <div className="perfil-pie">
        <div className="amenity-row">
          {detalle.ofrece_socios && <span className="amenity-chip destacada"><Users size={13} /> Plan de socios con descuentos</span>}
          {detalle.ofrece_torneos && <span className="amenity-chip destacada"><Trophy size={13} /> Torneos</span>}
          {detalle.amenidades.map((a) => (
            <span key={a} className="amenity-chip"><CircleCheck size={12} /> {a}</span>
          ))}
        </div>
        {(detalle.cancelacion_minima_horas > 0 || detalle.sena_obligatoria || detalle.descuento_turno_fijo_porcentaje > 0) && (
          <p className="texto-debil" style={{ margin: '0.5rem 0 0', fontSize: '0.8rem' }}>
            {detalle.cancelacion_minima_horas > 0 && `Cancelación sin cargo hasta ${detalle.cancelacion_minima_horas} h antes. `}
            {detalle.sena_obligatoria && 'Seña obligatoria. '}
            {detalle.descuento_turno_fijo_porcentaje > 0 && `${detalle.descuento_turno_fijo_porcentaje}% off turno fijo.`}
          </p>
        )}
      </div>
    </main>
  );
}
