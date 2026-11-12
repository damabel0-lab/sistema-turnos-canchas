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

  const reservar = () => {
    seleccionar(detalle.id, detalle.slug);
    navigate(`/reservar?complejo=${detalle.slug}`);
  };

  return (
    <main className="contenedor" style={{ paddingTop: '1.15rem', paddingBottom: '2.5rem', maxWidth: '1120px' }}>
      <Link to="/complejos" className="fila" style={{ gap: '0.4rem', marginBottom: '0.7rem', color: 'var(--texto-2)', width: 'fit-content' }}>
        <ArrowLeft size={16} /> Todos los complejos
      </Link>

      {/* ===== Hero compacto ===== */}
      <header className="complejo-hero" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '1rem', alignItems: 'center' }}>
        <div>
          <div className="fila-entre" style={{ gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className={`badge ${detalle.tipo === 'fraccionado' ? 'badge-info' : 'badge-neutro'}`}>
              {detalle.tipo === 'fraccionado' ? 'Fraccionado' : 'Complejo deportivo'}
            </span>
            <span className="fila" style={{ gap: '0.35rem', color: 'var(--texto-2)', fontSize: '0.85rem' }}>
              <Clock size={13} /> {HORARIO(detalle.hora_apertura)} – {HORARIO(detalle.hora_cierre)}
            </span>
          </div>
          <h1 style={{ margin: '0.15rem 0 0.3rem' }}>{detalle.nombre}</h1>
          <div className="stack" style={{ gap: '0.22rem', color: 'var(--texto-2)', fontSize: '0.88rem' }}>
            {(detalle.direccion || detalle.ciudad) && (
              <span className="fila" style={{ gap: '0.4rem' }}>
                <MapPin size={14} /> {[detalle.direccion, detalle.ciudad].filter(Boolean).join(' · ')}
              </span>
            )}
            <span className="fila" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
              {detalle.telefono && <span className="fila" style={{ gap: '0.3rem' }}><Phone size={13} /> {detalle.telefono}</span>}
              {detalle.email_contacto && <span className="fila" style={{ gap: '0.3rem' }}><Mail size={13} /> {detalle.email_contacto}</span>}
            </span>
          </div>
          {detalle.descripcion && (
            <p style={{ margin: '0.55rem 0 0', color: 'var(--texto-2)', fontSize: '0.88rem', maxWidth: '62ch' }}>
              {detalle.descripcion}
            </p>
          )}
          <div className="amenity-row" style={{ marginTop: '0.6rem' }}>
            {detalle.gym && <span className="amenity-chip destacada"><Dumbbell size={13} /> Gym{detalle.precio_mensual_gym ? ` · ${fmtPesos(detalle.precio_mensual_gym)}/mes` : ''}</span>}
            {detalle.pileta && <span className="amenity-chip destacada"><Waves size={13} /> Pileta{detalle.precio_mensual_pileta ? ` · ${fmtPesos(detalle.precio_mensual_pileta)}/mes` : ''}</span>}
            {detalle.ofrece_socios && <span className="amenity-chip destacada"><Users size={13} /> Socios</span>}
            {detalle.ofrece_torneos && <span className="amenity-chip destacada"><Trophy size={13} /> Torneos</span>}
            {detalle.amenidades.map((a) => (
              <span key={a} className="amenity-chip"><CircleCheck size={12} /> {a}</span>
            ))}
          </div>
          {(detalle.cancelacion_minima_horas > 0 || detalle.sena_obligatoria || detalle.descuento_turno_fijo_porcentaje > 0) && (
            <div className="fila" style={{ gap: '0.7rem', marginTop: '0.5rem', fontSize: '0.76rem', color: 'var(--texto-3)' }}>
              {detalle.cancelacion_minima_horas > 0 && <span>Cancelación sin cargo hasta {detalle.cancelacion_minima_horas} h antes</span>}
              {detalle.sena_obligatoria && <span>· Seña obligatoria</span>}
              {detalle.descuento_turno_fijo_porcentaje > 0 && <span>· {detalle.descuento_turno_fijo_porcentaje}% off turno fijo</span>}
            </div>
          )}
        </div>
        <button
          type="button"
          className="boton boton-primario"
          style={{ fontSize: '1.02rem', padding: '0.85rem 1.4rem', whiteSpace: 'nowrap' }}
          onClick={reservar}
        >
          <CalendarClock size={18} /> Reservar turno
        </button>
      </header>

      {/* ===== Canchas + Disciplinas ===== */}
      <div className="grid-det-detalle">
        {/* Canchas y precios — panel con scroll */}
        <section className="panel panel-con-altura" aria-labelledby="titulo-canchas">
          <div className="panel-header">
            <span className="panel-titulo" id="titulo-canchas">Canchas y precios</span>
            <span className="texto-debil">{detalle.canchas.length} cancha{detalle.canchas.length === 1 ? '' : 's'}</span>
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
                    {c.caracteristicas && <p className="texto-debil" style={{ margin: 0, fontSize: '0.8rem' }}>{c.caracteristicas}</p>}
                    <div className="fila-entre" style={{ marginTop: 'auto', paddingTop: '0.3rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--texto-3)' }}>por hora</span>
                      <strong style={{ fontSize: '0.98rem' }}>${c.precio_base.toLocaleString('es-AR')}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Disciplinas */}
        <aside className="panel" style={{ alignSelf: 'start' }} aria-labelledby="titulo-disciplinas">
          <div className="panel-header">
            <span className="panel-titulo" id="titulo-disciplinas">Disciplinas</span>
          </div>
          <div className="panel-body">
            {deportesConCanchas.map((d) => (
              <div key={d.id} className="fila-entre" style={{ padding: '0.5rem 0.25rem', borderBottom: '1px solid var(--border)' }}>
                <span>{d.nombre}</span>
                <span className="amenity-chip">{d.canchas} {d.canchas === 1 ? 'cancha' : 'canchas'}</span>
              </div>
            ))}
            {detalle.ofrece_torneos && (
              <Link to="/torneos" className="fila" style={{ gap: '0.4rem', margin: '0.35rem 0 0', color: 'var(--primario-2)', fontWeight: 600, fontSize: '0.86rem' }}>
                <Trophy size={15} /> Ver torneos de este lugar
              </Link>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
