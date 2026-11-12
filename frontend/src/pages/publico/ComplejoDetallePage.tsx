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
        <Link to="/complejos" className="fila" style={{ gap: '0.4rem', marginBottom: '1rem', color: 'var(--texto-2)' }}>
          <ArrowLeft size={16} /> Volver al catálogo
        </Link>
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <Building2 size={40} strokeWidth={1.5} style={{ margin: '0 auto 0.6rem', color: 'var(--texto-3)' }} />
          <h1 className="titulo">No pudimos mostrar este complejo</h1>
          <p className="subtitulo" style={{ margin: 0 }}>{error ?? 'Puede que no exista o no esté disponible.'}</p>
        </div>
      </main>
    );
  }

  const deportesConCanchas = detalle.deportes.filter((d) =>
    detalle.canchas.some((c) => c.deporte_id === d.id),
  );

  const reservar = () => {
    seleccionar(detalle.id, detalle.slug);
    navigate(`/reservar?complejo=${detalle.slug}`);
  };

  return (
    <main className="contenedor" style={{ paddingTop: '1.25rem', paddingBottom: '3rem' }}>
      <Link to="/complejos" className="fila" style={{ gap: '0.4rem', marginBottom: '0.85rem', color: 'var(--texto-2)', width: 'fit-content' }}>
        <ArrowLeft size={16} /> Todos los complejos
      </Link>

      {/* ===== Hero ===== */}
      <header className="complejo-hero">
        <div className="fila-entre">
          <span className={`badge ${detalle.tipo === 'fraccionado' ? 'badge-info' : 'badge-neutro'}`}>
            {detalle.tipo === 'fraccionado' ? 'Fraccionado' : 'Complejo deportivo'}
          </span>
          <div className="fila" style={{ gap: '0.4rem', color: 'var(--texto-2)', fontSize: '0.85rem' }}>
            <Clock size={14} /> {HORARIO(detalle.hora_apertura)} – {HORARIO(detalle.hora_cierre)}
          </div>
        </div>

        <h1>{detalle.nombre}</h1>

        <div className="stack" style={{ gap: '0.3rem', color: 'var(--texto-2)', fontSize: '0.9rem' }}>
          {(detalle.direccion || detalle.ciudad) && (
            <span className="fila" style={{ gap: '0.4rem' }}>
              <MapPin size={15} /> {[detalle.direccion, detalle.ciudad].filter(Boolean).join(' · ')}
            </span>
          )}
          <span className="fila" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
            {detalle.telefono && <span className="fila" style={{ gap: '0.35rem' }}><Phone size={14} /> {detalle.telefono}</span>}
            {detalle.email_contacto && <span className="fila" style={{ gap: '0.35rem' }}><Mail size={14} /> {detalle.email_contacto}</span>}
          </span>
        </div>

        {detalle.descripcion && (
          <p style={{ margin: '0.75rem 0 0', color: 'var(--texto-2)', maxWidth: '62ch' }}>
            {detalle.descripcion}
          </p>
        )}

        {/* Amenities + políticas */}
        <div className="amenity-row" style={{ marginTop: '0.8rem' }}>
          {detalle.gym && <span className="amenity-chip destacada"><Dumbbell size={13} /> Gym{detalle.precio_mensual_gym ? ` · ${fmtPesos(detalle.precio_mensual_gym)}/mes` : ''}</span>}
          {detalle.pileta && <span className="amenity-chip destacada"><Waves size={13} /> Pileta{detalle.precio_mensual_pileta ? ` · ${fmtPesos(detalle.precio_mensual_pileta)}/mes` : ''}</span>}
          {detalle.ofrece_socios && <span className="amenity-chip destacada"><Users size={13} /> Socios</span>}
          {detalle.ofrece_torneos && <span className="amenity-chip destacada"><Trophy size={13} /> Torneos</span>}
          {detalle.amenidades.map((a) => (
            <span key={a} className="amenity-chip"><CircleCheck size={12} /> {a}</span>
          ))}
        </div>

        <div className="fila" style={{ gap: '0.9rem', marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--texto-3)' }}>
          {detalle.cancelacion_minima_horas > 0 && <span>Cancelación sin cargo hasta {detalle.cancelacion_minima_horas} h antes</span>}
          {detalle.sena_obligatoria && <span>· Seña obligatoria</span>}
          {detalle.descuento_turno_fijo_porcentaje > 0 && <span>· {detalle.descuento_turno_fijo_porcentaje}% off turno fijo</span>}
        </div>
      </header>

      <div className="grilla-2-eq" style={{ alignItems: 'start' }}>
        {/* ===== Canchas y precios ===== */}
        <section aria-labelledby="titulo-canchas">
          <h2 id="titulo-canchas" className="titulo" style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>
            Canchas y precios
          </h2>
          {detalle.canchas.length === 0 ? (
            <p className="texto-debil">El complejo todavía no cargó sus canchas.</p>
          ) : (
            <div className="grilla-tarjetas">
              {detalle.canchas.map((c) => (
                <div key={c.id} className="cancha-card">
                  <div className="fila-entre">
                    <strong>{c.nombre}</strong>
                    {c.deporte && <span className="amenity-chip">{c.deporte.nombre}</span>}
                  </div>
                  {c.caracteristicas && <p className="texto-debil" style={{ margin: 0, fontSize: '0.82rem' }}>{c.caracteristicas}</p>}
                  <div className="fila-entre" style={{ marginTop: 'auto', paddingTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--texto-3)' }}>por hora</span>
                    <strong style={{ fontSize: '1.05rem' }}>${c.precio_base.toLocaleString('es-AR')}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== Disciplinas para reservar ===== */}
        <section aria-labelledby="titulo-disciplinas">
          <h2 id="titulo-disciplinas" className="titulo" style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>
            Disciplinas con canchas
          </h2>
          <div className="stack">
            {deportesConCanchas.map((d) => (
              <div key={d.id} className="fila-entre" style={{ padding: '0.55rem 0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radio)' }}>
                <span>{d.nombre}</span>
                <button type="button" className="boton boton-outline" style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }} onClick={reservar}>
                  Reservar
                </button>
              </div>
            ))}
          </div>

          {detalle.ofrece_torneos && (
            <Link to="/torneos" className="fila" style={{ gap: '0.4rem', marginTop: '0.8rem', color: 'var(--primario-2)', fontWeight: 600, fontSize: '0.88rem' }}>
              <Trophy size={16} /> Ver torneos de este lugar
            </Link>
          )}
        </section>
      </div>

      {/* ===== CTA sticky ===== */}
      <div className="complejo-cta-bar">
        <button type="button" className="boton boton-primario" style={{ fontSize: '1rem', padding: '0.7rem 2.2rem' }} onClick={reservar}>
          <CalendarClock size={17} /> Reservar turno en {detalle.nombre}
        </button>
      </div>
    </main>
  );
}
