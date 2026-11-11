import { Link } from 'react-router-dom';
import {
  Goal,
  CalendarDays,
  CalendarClock,
  Trophy,
  Wallet,
  Users,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const features = [
  { icon: CalendarClock, titulo: 'Reservá en segundos', texto: 'Elegí disciplina, cancha y horario. Turnos fijos de 1 hora, sin vueltas.' },
  { icon: CalendarDays, titulo: 'Grilla en vivo', texto: 'El complejo entero en una pantalla: libre, ocupada o bloqueada al instante.' },
  { icon: Wallet, titulo: 'Caja y seña', texto: 'Señas, cobranzas, egresos y CSV exportable para tu contador.' },
  { icon: Users, titulo: 'Socios y beneficios', texto: 'Descuentos por socio, abonos mensuales de gym y pileta.' },
  { icon: Trophy, titulo: 'Torneos', texto: 'Creá el torneo, gestioná equipos y partidos desde el panel.' },
  { icon: BarChart3, titulo: 'Reportes', texto: 'Recaudación del día, por disciplina y por origen. Datos, no pálpitos.' },
];

export function HomePage() {
  return (
    <main className="pantalla" style={{ paddingTop: '1rem' }}>
      {/* ===== HERO ===== */}
      <header className="hero">
        <div className="hero-texto">
          <span className="hero-badge">
            <span className="live-dot" /> El complejo, bajo control
          </span>
          <h1 className="hero-titulo">
            Reservá tu cancha.
            <br />
            <span className="hero-gradiente">Administrá tu club.</span>
          </h1>
          <p className="hero-sub">
            PlayControl es el sistema integral para complejos deportivos: turnos, caja,
            socios, abonos y torneos en una sola plataforma.
          </p>
          <div className="fila" style={{ gap: '0.75rem' }}>
            <Link to="/reservar" className="boton boton-primario" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
              Reservar turno <ArrowRight size={17} />
            </Link>
            <Link to="/complejo" className="boton boton-outline" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
              Ver el complejo
            </Link>
          </div>
          <div className="hero-puntos">
            <span><CheckCircle2 size={14} /> Turnos de 1 h, de :15 a :15</span>
            <span><CheckCircle2 size={14} /> Seña online opcional</span>
            <span><CheckCircle2 size={14} /> Cancelación gratis 2 h antes</span>
          </div>
        </div>

        {/* Panel preview (decorativo) */}
        <div className="hero-panel" aria-hidden>
          <div className="hero-panel-header">
            <Goal size={15} /> Grilla del día
            <span className="hero-panel-live"><span className="live-dot" /> En vivo</span>
          </div>
          <div className="hero-panel-grid">
            {[
              ['20:15', 'libre'], ['20:15', 'ocupada'], ['20:15', 'libre'],
              ['20:15', 'libre'], ['21:15', 'ocupada'], ['21:15', 'bloqueo'],
            ].map(([hora, estado], i) => (
              <div key={i} className={`hero-celda ${estado}`}>{hora}</div>
            ))}
          </div>
          <div className="hero-panel-foot">
            <span>Cancha 1 · Fútbol 5</span>
            <span className="hero-panel-badge">$35.000/h</span>
          </div>
        </div>
      </header>

      {/* ===== FEATURES ===== */}
      <section>
        <h2 className="titulo" style={{ fontSize: '1.15rem', margin: '0.5rem 0 1rem' }}>
          Todo lo que pasa en el complejo, en un solo lugar
        </h2>
        <div className="grilla-tarjetas" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.titulo} className="feature-card">
                <span className="feature-icono">
                  <Icon size={19} />
                </span>
                <h3 className="feature-titulo">{f.titulo}</h3>
                <p className="feature-texto">{f.texto}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="hero-cta">
        <div>
          <h2 className="titulo" style={{ margin: 0 }}>¿Todavía estás reservando por teléfono?</h2>
          <p className="subtitulo" style={{ margin: '0.35rem 0 0' }}>Sumate a PlayControl y dejá que el sistema labure por vos.</p>
        </div>
        <Link to="/reservar" className="boton boton-primario" style={{ padding: '0.75rem 1.5rem' }}>
          Reservar mi próxima cancha <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
