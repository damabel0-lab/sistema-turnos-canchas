import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
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
} from 'lucide-react';
import { api } from '../../lib/api';
import { useComplejo } from '../../hooks/useComplejo';

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

export function ComplejoDetallePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { seleccionar } = useComplejo();
  const [detalle, setDetalle] = useState<ComplejoDetalle | null>(null);
  const [torneos, setTorneos] = useState<TorneoLocal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

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

  const reservar = (canchaId?: number) => {
    seleccionar(detalle.id, detalle.slug);
    navigate(`/reservar?complejo=${detalle.slug}${canchaId != null ? `&cancha=${canchaId}` : ''}`);
  };

  const pedirMensualidad = () => {
    seleccionar(detalle.id, detalle.slug);
    navigate('/mis-abonos');
  };

  return (
    <main className="contenedor" style={{ paddingTop: '1.1rem', paddingBottom: '2.5rem', maxWidth: '1120px' }}>
      <Link to="/complejos" className="fila" style={{ gap: '0.4rem', marginBottom: '0.7rem', color: 'var(--texto-2)', width: 'fit-content' }}>
        <ArrowLeft size={16} /> Todos los complejos
      </Link>

      {/* ===== Perfil del complejo ===== */}
      <header className="perfil-complejo">
        <div className="perfil-main">
          <div className="fila-entre" style={{ gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className={`badge ${detalle.tipo === 'fraccionado' ? 'badge-info' : 'badge-neutro'}`}>
              {detalle.tipo === 'fraccionado' ? 'Fraccionado' : 'Complejo deportivo'}
            </span>
            <span className="fila" style={{ gap: '0.3rem', color: 'var(--texto-2)', fontSize: '0.83rem' }}>
              <Clock size={13} /> {HORARIO(detalle.hora_apertura)} – {HORARIO(detalle.hora_cierre)}
            </span>
          </div>
          <h1>{detalle.nombre}</h1>
          <div className="stack" style={{ gap: '0.22rem', color: 'var(--texto-2)', fontSize: '0.9rem' }}>
            {(detalle.direccion || detalle.ciudad) && (
              <span className="fila" style={{ gap: '0.4rem' }}>
                <MapPin size={14} /> {[detalle.direccion, detalle.ciudad].filter(Boolean).join(' · ')}
              </span>
            )}
            <span className="fila" style={{ gap: '0.7rem', flexWrap: 'wrap' }}>
              {detalle.telefono && <span className="fila" style={{ gap: '0.3rem' }}><Phone size={13} /> {detalle.telefono}</span>}
              {detalle.email_contacto && <span className="fila" style={{ gap: '0.3rem' }}><Mail size={13} /> {detalle.email_contacto}</span>}
            </span>
          </div>
          {detalle.descripcion && (
            <p style={{ margin: '0.55rem 0 0', color: 'var(--texto-2)', fontSize: '0.9rem', maxWidth: '62ch' }}>
              {detalle.descripcion}
            </p>
          )}
        </div>
        <button
          type="button"
          className="boton boton-primario"
          style={{ fontSize: '1rem', padding: '0.9rem 1.5rem', alignSelf: 'center' }}
          onClick={() => reservar()}
        >
          <CalendarClock size={18} /> Reservar
        </button>
      </header>

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
