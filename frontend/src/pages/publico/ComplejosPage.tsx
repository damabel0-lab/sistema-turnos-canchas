import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Dumbbell, MapPin, Search, Trophy, Users, Waves, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';

interface ComplejoCatalogo {
  id: number;
  nombre: string;
  slug: string;
  tipo: string;
  ciudad: string | null;
  direccion: string | null;
  gym: boolean;
  pileta: boolean;
  ofrece_torneos: boolean;
  ofrece_socios: boolean;
  amenidades: string[];
  canchas: number;
}

export function ComplejosPage() {
  const [complejos, setComplejos] = useState<ComplejoCatalogo[]>([]);
  const [q, setQ] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);

    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());

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
  }, [q]);

  return (
    <main className="contenedor" style={{ paddingTop: '1.5rem', paddingBottom: '3rem', maxWidth: '1120px' }}>
      {/* Encabezado */}
      <header className="pagina-encabezado" style={{ marginBottom: '0.9rem', alignItems: 'flex-end' }}>
        <div>
          <span className="pagina-eyebrow">Jugadores</span>
          <h1 className="pagina-titulo" style={{ marginBottom: '0.15rem' }}>Elegí dónde jugar</h1>
          <p className="pagina-sub">Todos los complejos de la zona en un solo lugar — elegí tu cancha y reservá.</p>
        </div>
      </header>

      {/* Buscador */}
      <label className="label" style={{ margin: '0 0 1rem' }}>
        <span className="sr-only">Buscar complejos</span>
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

      {/* Resultados */}
      {error && <div className="alerta-error" role="alert">{error}</div>}

      {cargando ? (
        <div className="complejos-grid" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: '11rem' }} />)}
        </div>
      ) : complejos.length === 0 ? (
        <div className="empty-state">
          <Building2 size={36} strokeWidth={1.6} style={{ color: 'var(--texto-3)' }} />
          <h2 className="titulo" style={{ margin: 0 }}>Nada por acá</h2>
          <p className="texto-sec" style={{ margin: 0 }}>
            {q
              ? `Ningún complejo coincide con “${q}”.`
              : 'Por ahora no hay complejos disponibles. Volvé pronto.'}
          </p>
          {q && (
            <button type="button" className="boton boton-outline" onClick={() => setQ('')} style={{ marginTop: '0.3rem' }}>
              Quitar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="complejos-grid">
          {complejos.map((c) => (
            <Link key={c.id} to={`/complejos/${c.slug}`} className="complejo-card" aria-label={`Ver complejo ${c.nombre}`}>
              <div className="fila-entre" style={{ gap: '0.4rem' }}>
                <span className={`badge ${c.tipo === 'fraccionado' ? 'badge-info' : 'badge-neutro'}`}>
                  {c.tipo === 'fraccionado' ? 'Fraccionado' : 'Complejo'}
                </span>
                {c.ofrece_torneos && <span className="badge badge-exito"><Trophy size={11} /> Torneos</span>}
              </div>

              <h2 className="complejo-card-nombre">{c.nombre}</h2>

              <p className="complejo-card-meta" style={{ margin: 0 }}>
                <MapPin size={13} aria-hidden />
                {c.direccion ?? 'Sin dirección publicada'}{c.ciudad ? ` · ${c.ciudad}` : ''}
              </p>

              <div className="amenity-row">
                {c.gym && <span className="amenity-chip destacada"><Dumbbell size={13} /> Gym</span>}
                {c.pileta && <span className="amenity-chip destacada"><Waves size={13} /> Pileta</span>}
                {c.ofrece_socios && <span className="amenity-chip destacada"><Users size={13} /> Socios</span>}
                {c.amenidades.slice(0, 3).map((a) => (
                  <span key={a} className="amenity-chip">{a}</span>
                ))}
              </div>

              <div className="complejo-card-foot">
                <span className="texto-debil" style={{ fontSize: '0.8rem' }}>{c.canchas} cancha{c.canchas === 1 ? '' : 's'}</span>
                <span className="fila" style={{ gap: '0.3rem', color: 'var(--primario-2)', fontWeight: 700, fontSize: '0.83rem' }}>
                  Ver complejo <ArrowRight size={14} aria-hidden />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
