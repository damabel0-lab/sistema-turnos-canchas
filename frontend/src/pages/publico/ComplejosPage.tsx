import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Dumbbell, MapPin, Search, Trophy, Users, Waves, Goal } from 'lucide-react';
import { api } from '../../lib/api';

interface Deporte {
  id: number;
  nombre: string;
  tipo: string;
}

interface ComplejoCatalogo {
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
  deportes: Array<{ id: number; nombre: string }>;
  canchas: number;
  precio_desde: number | null;
}

export function ComplejosPage() {
  const [complejos, setComplejos] = useState<ComplejoCatalogo[]>([]);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [q, setQ] = useState('');
  const [deporteId, setDeporteId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Deporte[]>('/deportes')
      .then(setDeportes)
      .catch(() => setDeportes([]));
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);

    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (deporteId) params.set('deporteId', String(deporteId));

    const t = setTimeout(() => {
      api<ComplejoCatalogo[]>(`/complejos${params.size ? `?${params.toString()}` : ''}`)
        .then((data) => {
          if (!cancelado) setComplejos(Array.isArray(data) ? data : []);
        })
        .catch((e) => {
          if (!cancelado) setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo');
        })
        .finally(() => {
          if (!cancelado) setCargando(false);
        });
    }, q ? 250 : 0);

    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [q, deporteId]);

  return (
    <main className="contenedor" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
      {/* Encabezado */}
      <div className="fila-entre" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 className="titulo" style={{ margin: 0 }}>Explorá complejos</h1>
          <p className="subtitulo" style={{ margin: '0.25rem 0 0' }}>
            Encontrá dónde jugar: canchas, gym, pileta y torneos en los mejores complejos de la zona.
          </p>
        </div>
        <Goal size={34} strokeWidth={1.6} style={{ color: 'var(--primario)' }} aria-hidden />
      </div>

      {/* Buscador + filtros por deporte */}
      <div className="stack" style={{ gap: '0.6rem', marginBottom: '1.1rem' }}>
        <label className="label" style={{ margin: 0 }}>
          <span style={{ position: 'relative', display: 'block' }}>
            <Search size={17} aria-hidden style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-3)' }} />
            <input
              className="input"
              style={{ paddingLeft: '2.4rem' }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, ciudad o dirección…"
              aria-label="Buscar complejos"
            />
          </span>
        </label>
        <div className="fila" role="group" aria-label="Filtrar por disciplina">
          <button
            type="button"
            className={`opcion-chip${deporteId === null ? ' activo' : ''}`}
            onClick={() => setDeporteId(null)}
          >
            Todos
          </button>
          {deportes.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`opcion-chip${deporteId === d.id ? ' activo' : ''}`}
              onClick={() => setDeporteId(deporteId === d.id ? null : d.id)}
            >
              {d.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      {error && <div className="alerta-error" role="alert">{error}</div>}

      {cargando ? (
        <p className="texto-sec">Cargando complejos…</p>
      ) : complejos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <Building2 size={40} strokeWidth={1.5} style={{ margin: '0 auto 0.6rem', color: 'var(--texto-3)' }} />
          <h2 className="titulo" style={{ marginBottom: '0.35rem' }}>No encontramos complejos</h2>
          <p className="subtitulo" style={{ margin: 0 }}>
            {q || deporteId
              ? 'Probá con otra búsqueda o quitá el filtro de disciplina.'
              : 'Por ahora no hay complejos disponibles. Volvé pronto.'}
          </p>
          {(q || deporteId) && (
            <button
              type="button"
              className="boton boton-outline"
              style={{ marginTop: '0.85rem' }}
              onClick={() => { setQ(''); setDeporteId(null); }}
            >
              Quitar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="complejos-grid">
          {complejos.map((c) => (
            <Link key={c.id} to={`/complejos/${c.slug}`} className="complejo-card" aria-label={`Ver complejo ${c.nombre}`}>
              <div className="fila-entre" style={{ gap: '0.5rem' }}>
                <span className={`badge ${c.tipo === 'fraccionado' ? 'badge-info' : 'badge-neutro'}`}>
                  {c.tipo === 'fraccionado' ? 'Fraccionado' : 'Complejo deportivo'}
                </span>
                {c.ofrece_torneos && (
                  <span className="badge badge-exito"><Trophy size={12} /> Torneos</span>
                )}
              </div>

              <h2 className="complejo-card-nombre">{c.nombre}</h2>

              <div className="stack" style={{ gap: '0.25rem' }}>
                {c.direccion && (
                  <span className="complejo-card-meta"><MapPin size={13} /> {c.direccion}{c.ciudad ? ` · ${c.ciudad}` : ''}</span>
                )}
                {!c.direccion && c.ciudad && (
                  <span className="complejo-card-meta"><MapPin size={13} /> {c.ciudad}</span>
                )}
              </div>

              {/* Deportes disponibles */}
              <div className="amenity-row">
                {c.deportes.slice(0, 4).map((d) => (
                  <span key={d.id} className="amenity-chip">{d.nombre}</span>
                ))}
                {c.deportes.length > 4 && <span className="amenity-chip">+{c.deportes.length - 4}</span>}
              </div>

              {/* Amenities */}
              <div className="amenity-row">
                {c.gym && <span className="amenity-chip destacada"><Dumbbell size={13} /> Gym</span>}
                {c.pileta && <span className="amenity-chip destacada"><Waves size={13} /> Pileta</span>}
                {c.ofrece_socios && <span className="amenity-chip destacada"><Users size={13} /> Socios</span>}
                {c.amenidades.slice(0, 3).map((a) => (
                  <span key={a} className="amenity-chip">{a}</span>
                ))}
              </div>

              <div className="complejo-foot">
                <div className="complejo-precio">
                  {c.precio_desde != null ? (
                    <>
                      <small>desde</small>
                      <strong>${c.precio_desde.toLocaleString('es-AR')}</strong>
                      <small> /h</small>
                    </>
                  ) : (
                    <small>{c.canchas} canchas</small>
                  )}
                </div>
                <span className="boton boton-primario" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
                  Ver complejo
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
