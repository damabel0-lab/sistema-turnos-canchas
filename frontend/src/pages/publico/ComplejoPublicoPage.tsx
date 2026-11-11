import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  Clock,
  ShieldCheck,
  BadgePercent,
  Dumbbell,
  Waves,
  Users,
  Goal,
  ArrowRight,
  Info,
  RefreshCw,
} from 'lucide-react';

interface ConfigComplejo {
  nombre: string | null;
  tipo: string | null;
  hora_apertura: number;
  hora_cierre: number;
  cancelacion_minima_horas: number;
  descuento_turno_fijo_porcentaje: number;
  seña_obligatoria: boolean;
  amenidades: {
    gym: boolean;
    pileta: boolean;
    precio_mensual_gym: number | null;
    precio_mensual_pileta: number | null;
  };
  ofrece_socios: boolean;
  ofrece_torneos?: boolean;
  canchas?: Array<{
    id: number;
    nombre: string;
    deporte: string | null;
    caracteristicas: string | null;
    precio_base: number;
  }>;
}

export function ComplejoPublicoPage() {
  const [config, setConfig] = useState<ConfigComplejo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setConfig(await api<ConfigComplejo>('/config'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando datos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const hora = (h: number) => `${String(h).padStart(2, '0')}:00`;
  const esComplejo = config?.tipo === 'complejo_deportivo';
  const titulo = config?.nombre ?? 'Nuestro complejo';
  const subtitulo = esComplejo
    ? 'Todo lo deportivo en un mismo lugar — información abierta a todos los visitantes.'
    : 'Canchas individuales — horarios, precios y turnos.';

  return (
    <main className="pantalla" style={{ paddingTop: '1.5rem' }}>
      <div className="contenedor-ancho">
        {/* Encabezado */}
        <div className="fila-entre" style={{ marginBottom: '1.25rem', gap: '1rem' }}>
          <div>
            <div className="fila" style={{ gap: '0.6rem', marginBottom: '0.3rem' }}>
              <span className="hero-badge" style={{ marginBottom: 0 }}>
                <Goal size={14} /> {esComplejo ? 'Complejo deportivo' : 'Canchas individuales'}
              </span>
            </div>
            <h1 className="titulo" style={{ fontSize: '1.9rem', marginBottom: '0.2rem' }}>
              {titulo}
            </h1>
            <p className="subtitulo" style={{ margin: 0 }}>{subtitulo}</p>
          </div>
          <Link to="/reservar" className="boton boton-primario" style={{ whiteSpace: 'nowrap' }}>
            Reservar <ArrowRight size={16} />
          </Link>
        </div>

        {error && (
          <div className="alerta-error" role="alert">
            {error}
            <div style={{ marginTop: '0.5rem' }}>
              <button type="button" className="boton boton-outline" onClick={() => void cargar()}>
                <RefreshCw size={14} /> Reintentar
              </button>
            </div>
          </div>
        )}

        {cargando && !config && (
          <div className="grilla-tarjetas" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '8rem' }} />
            ))}
          </div>
        )}

        {config && (
          <div className="grilla-tarjetas" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {/* Horarios */}
            <div className="tarjeta-plana" style={{ padding: '1.15rem' }}>
              <div className="fila" style={{ gap: '0.55rem', marginBottom: '0.5rem' }}>
                <span className="metrica-icono azul"><Clock size={18} /></span>
                <h2 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>Horarios de atención</h2>
              </div>
              <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 850, letterSpacing: '-0.02em' }}>
                {hora(config.hora_apertura)} – {hora(config.hora_cierre)}
              </p>
              <p className="texto-sec" style={{ margin: '0.25rem 0 0' }}>hs. Todos los días, sujeto a disponibilidad.</p>
            </div>

            {/* Cancelaciones */}
            <div className="tarjeta-plana" style={{ padding: '1.15rem' }}>
              <div className="fila" style={{ gap: '0.55rem', marginBottom: '0.5rem' }}>
                <span className="metrica-icono verde"><ShieldCheck size={18} /></span>
                <h2 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>Políticas</h2>
              </div>
              <p style={{ margin: 0 }}>
                {config.cancelacion_minima_horas > 0
                  ? `Podés cancelar tu turno hasta ${config.cancelacion_minima_horas} h antes del horario, sin costo.`
                  : 'Las cancelaciones se pueden gestionar en el complejo.'}
              </p>
              {config.seña_obligatoria && (
                <p className="texto-sec" style={{ margin: '0.35rem 0 0' }}>
                  La seña es obligatoria para confirmar el turno.
                </p>
              )}
            </div>

            {/* Turno fijo */}
            {config.descuento_turno_fijo_porcentaje > 0 && (
              <div className="tarjeta-plana" style={{ padding: '1.15rem' }}>
                <div className="fila" style={{ gap: '0.55rem', marginBottom: '0.5rem' }}>
                  <span className="metrica-icono ambar"><BadgePercent size={18} /></span>
                  <h2 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>Turno fijo</h2>
                </div>
                <p style={{ margin: 0 }}>
                  Clientes con turno fijo: <strong>{config.descuento_turno_fijo_porcentaje}% de descuento</strong> automático.
                </p>
                <p className="texto-sec" style={{ margin: '0.35rem 0 0' }}>Mismo horario todas las semanas. Consultá en recepción.</p>
              </div>
            )}

            {/* Gimnasio */}
            {config.amenidades.gym && (
              <div className="tarjeta-plana" style={{ padding: '1.15rem' }}>
                <div className="fila" style={{ gap: '0.55rem', marginBottom: '0.5rem' }}>
                  <span className="metrica-icono verde"><Dumbbell size={18} /></span>
                  <h2 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>Gimnasio</h2>
                </div>
                <p style={{ margin: 0 }}>
                  {config.amenidades.precio_mensual_gym
                    ? <strong>Mensual {config.amenidades.precio_mensual_gym.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}</strong>
                    : 'Mensualidad disponible.'}
                </p>
                <p className="texto-sec" style={{ margin: '0.35rem 0 0' }}>Bono mensual sin límite de horarios. Preguntá en recepción.</p>
              </div>
            )}

            {/* Pileta */}
            {config.amenidades.pileta && (
              <div className="tarjeta-plana" style={{ padding: '1.15rem' }}>
                <div className="fila" style={{ gap: '0.55rem', marginBottom: '0.5rem' }}>
                  <span className="metrica-icono azul"><Waves size={18} /></span>
                  <h2 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>Pileta</h2>
                </div>
                <p style={{ margin: 0 }}>
                  {config.amenidades.precio_mensual_pileta
                    ? <strong>Mensual {config.amenidades.precio_mensual_pileta.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}</strong>
                    : 'Mensualidad disponible.'}
                </p>
                <p className="texto-sec" style={{ margin: '0.35rem 0 0' }}>Natación y entrenamiento libre. Consultá horarios de natación.</p>
              </div>
            )}

            {/* Socios */}
            {config.ofrece_socios && (
              <div className="tarjeta-plana" style={{ padding: '1.15rem' }}>
                <div className="fila" style={{ gap: '0.55rem', marginBottom: '0.5rem' }}>
                  <span className="metrica-icono ambar"><Users size={18} /></span>
                  <h2 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>Socios</h2>
                </div>
                <p style={{ margin: 0 }}>Tenemos <strong>socios con beneficios</strong> en turnos y abonos del complejo.</p>
                <p className="texto-sec" style={{ margin: '0.35rem 0 0' }}>Preguntá en recepción cómo asociarte.</p>
              </div>
            )}
          </div>
        )}

        {/* Canchas y precios */}
        {config?.canchas && config.canchas.length > 0 && (
          <section style={{ marginTop: '1.25rem' }}>
            <h2 className="titulo" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', margin: '0 0 0.6rem 0.15rem' }}>
              Canchas y precios
            </h2>
            <div className="grilla-tarjetas" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
              {config.canchas.map((c) => (
                <Link
                  key={c.id}
                  to="/reservar"
                  className="tarjeta-plana"
                  style={{ padding: '0.9rem 1rem', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}
                  aria-label={`Reservar ${c.nombre}`}
                >
                  <div className="fila-entre" style={{ gap: '0.5rem' }}>
                    <div className="fila" style={{ gap: '0.5rem', minWidth: 0 }}>
                      <span className="cal-cancha-icono" style={{ width: '1.9rem', height: '1.9rem' }}>
                        <Goal size={16} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '0.95rem' }}>{c.nombre}</div>
                        <div className="texto-debil">{c.deporte ?? 'Cancha'}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 850, fontSize: '1rem', whiteSpace: 'nowrap' }}>
                      ${c.precio_base.toLocaleString('es-AR')}<span className="texto-debil" style={{ fontSize: '0.72rem', fontWeight: 600 }}>/h</span>
                    </div>
                  </div>
                  {c.caracteristicas && <p className="texto-sec" style={{ margin: 0, fontSize: '0.8rem' }}>{c.caracteristicas}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Cómo reservar */}
        <div className="tarjeta-plana" style={{ padding: '1.25rem', marginTop: '1rem' }}>
          <div className="fila" style={{ gap: '0.55rem', marginBottom: '0.6rem' }}>
            <Info size={18} style={{ color: 'var(--primario-2)' }} />
            <h2 className="titulo" style={{ fontSize: '1rem', margin: 0 }}>¿Cómo reservar?</h2>
          </div>
          <ol style={{ margin: 0, paddingLeft: '1.15rem', color: 'var(--texto-2)', lineHeight: 1.9, fontSize: '0.92rem' }}>
            <li>Registrá tu cuenta o iniciá sesión.</li>
            <li>Elegí el deporte y la cancha que querés.</li>
            <li>Elegí fecha y horario disponible (turnos de 1 h, de :15 a :15).</li>
            <li>Confirmá la reserva. Si tiene seña, se paga en el complejo.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
