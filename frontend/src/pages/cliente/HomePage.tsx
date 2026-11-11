import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import {
  Goal,
  CalendarDays,
  CalendarClock,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Grid3x3,
  Ticket,
  Wallet,
  Trophy,
  Users,
  Bell,
  BadgeDollarSign,
  ClipboardList,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

interface ReservaMia {
  id: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  cancha: string;
  deporte: string | null;
}

interface EstadisticasMias {
  veces_jugado: number;
  gasto_total: number;
  disciplina_favorita: string | null;
  cancelaciones: number;
}

interface ResumenStaff {
  reservas_hoy: number;
  pendientes_seña: number;
  ingresos_dia: number;
  abonos_por_vencer: number;
}

function fechaCorta(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function precio(n: number): string {
  return `$${n.toLocaleString('es-AR')}`;
}

/** Tarjeta de acción funcional (todo clickeable, nada decorativo) */
function AccionRapida({ to, icon: Icon, titulo, sub }: { to: string; icon: LucideIcon; titulo: string; sub: string }) {
  return (
    <Link to={to} className="acceso-rapido">
      <Icon size={22} />
      <div>
        <div className="acceso-rapido-titulo">{titulo}</div>
        <div className="acceso-rapido-sub">{sub}</div>
      </div>
      <ArrowRight size={16} className="acceso-rapido-flecha" />
    </Link>
  );
}

export function HomePage() {
  const { session, perfil } = useAuth();
  if (!session) return <LandingPublica />;
  const esStaff = perfil?.rol === 'super_admin' || perfil?.rol === 'recepcionista';
  return esStaff ? <HomeStaff /> : <HomeCliente nombre={`${perfil?.nombre ?? ''} ${perfil?.apellido ?? ''}`.trim()} />;
}

/* ============================================================
   PÚBLICO — landing compacta: cómo funciona + CTAs
   ============================================================ */
function LandingPublica() {
  const pasos = [
    { n: 1, titulo: 'Elegí el deporte', texto: 'Disciplina y cancha disponible.' },
    { n: 2, titulo: 'Elegí el horario', texto: 'Fecha y turno libre (1 h, de :15 a :15).' },
    { n: 3, titulo: 'Confirmá', texto: 'Reservá y a jugar. Seña opcional en el complejo.' },
  ];

  return (
    <main className="pantalla" style={{ paddingTop: '1rem' }}>
      <header className="hero" style={{ gridTemplateColumns: '1fr', textAlign: 'center', justifyItems: 'center', paddingBottom: '1.25rem' }}>
        <div className="hero-texto" style={{ maxWidth: '44rem' }}>
          <span className="hero-badge">
            <Goal size={14} /> El complejo, bajo control
          </span>
          <h1 className="hero-titulo">
            Reservá tu cancha.<br />
            <span className="hero-gradiente">Jugá hoy.</span>
          </h1>
          <p className="hero-sub" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
            Reservá en segundos, gestioná tus turnos y participá en torneos — todo en un solo lugar.
          </p>
          <div className="fila" style={{ justifyContent: 'center', gap: '0.75rem' }}>
            <Link to="/reservar" className="boton boton-primario" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
              Reservar turno <ArrowRight size={17} />
            </Link>
            <Link to="/complejo" className="boton boton-outline" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
              Ver el complejo
            </Link>
          </div>
          <div className="hero-puntos" style={{ justifyContent: 'center' }}>
            <span><CheckCircle2 size={14} /> Turnos de 1 h</span>
            <span><CheckCircle2 size={14} /> Cancelación gratis 2 h antes</span>
            <span><CheckCircle2 size={14} /> Seña opcional</span>
          </div>
        </div>
      </header>

      {/* Cómo funciona */}
      <section>
        <h2 className="titulo" style={{ fontSize: '1.1rem', margin: '0.25rem 0 0.85rem' }}>Cómo funciona</h2>
        <div className="metricas" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          {pasos.map((p) => {
            return (
              <Link key={p.n} to="/reservar" className="acceso-rapido" style={{ textDecoration: 'none' }}>
                <span className="paso-num" style={{ width: '2rem', height: '2rem', fontSize: '0.9rem' }}>{p.n}</span>
                <div>
                  <div className="acceso-rapido-titulo">{p.titulo}</div>
                  <div className="acceso-rapido-sub">{p.texto}</div>
                </div>
                <ArrowRight size={16} className="acceso-rapido-flecha" />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

/* ============================================================
   CLIENTE — home personal con datos reales
   ============================================================ */
function HomeCliente({ nombre }: { nombre: string }) {
  const [proximas, setProximas] = useState<ReservaMia[]>([]);
  const [stats, setStats] = useState<EstadisticasMias | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    Promise.allSettled([
      api<{ proximas: ReservaMia[] }>('/reservas/mias'),
      api<EstadisticasMias>('/reservas/mias/estadisticas'),
    ]).then(([reservasRes, statsRes]) => {
      if (cancelado) return;
      if (reservasRes.status === 'fulfilled') {
        const ahora = new Date();
        const futuras = (reservasRes.value.proximas ?? [])
          .filter((r) => r.estado === 'confirmada' || r.estado === 'pendiente_seña')
          .filter((r) => new Date(`${r.fecha}T${r.hora_fin.slice(0, 5)}:00`) >= ahora)
          .slice(0, 3);
        setProximas(futuras);
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      setCargando(false);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <main className="pantalla" style={{ paddingTop: '1.25rem' }}>
      <div className="contenedor">
        {/* Saludo */}
        <div className="fila-entre" style={{ marginBottom: '1.1rem' }}>
          <div>
            <h1 className="titulo" style={{ fontSize: '1.6rem', marginBottom: '0.1rem' }}>
              {nombre ? `¡Hola, ${nombre}!` : '¡Hola!'}
            </h1>
            <p className="subtitulo" style={{ margin: 0, textTransform: 'capitalize' }}>
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <Link to="/reservar" className="boton boton-primario">
            Reservar <ArrowRight size={16} />
          </Link>
        </div>
        <h2 className="titulo" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', marginBottom: '0.5rem' }}>
          Tus próximos turnos
        </h2>
        {cargando ? (
          <div className="stack" style={{ marginBottom: '1.25rem' }}>
            {[0, 1].map((i) => (
              <div key={i} className="skeleton" style={{ height: '4.5rem' }} />
            ))}
          </div>
        ) : proximas.length === 0 ? (
          <div className="tarjeta caja-vacia" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
            <CalendarDays size={26} style={{ color: 'var(--primario-2)', margin: '0 auto 0.5rem', display: 'block' }} />
            <p className="texto-sec" style={{ margin: 0 }}>Todavía no tenés turnos reservados.</p>
            <Link to="/reservar" className="boton boton-primario" style={{ marginTop: '0.75rem' }}>
              Reservar mi primera cancha <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            <div className="proximas-grid">
              {proximas.map((r) => (
                <Link key={r.id} to="/mis-reservas" className="proximo-card">
                  <div className="proximo-card-top">
                    <span className="proximo-icono"><CalendarDays size={17} /></span>
                    <span className={`badge ${r.estado === 'confirmada' ? 'badge-exito' : 'badge-advertencia'}`}>
                      {r.estado === 'confirmada' ? 'Confirmada' : 'Pendiente seña'}
                    </span>
                  </div>
                  <div className="proximo-cancha">{r.cancha}</div>
                  <div className="proximo-linea" style={{ textTransform: 'capitalize' }}>{r.deporte}</div>
                  <div className="proximo-linea" style={{ textTransform: 'capitalize' }}>
                    {fechaCorta(r.fecha)} · {r.hora_inicio.slice(0, 5)}–{r.hora_fin.slice(0, 5)}
                  </div>
                </Link>
              ))}
            </div>
            <Link to="/mis-reservas" className="boton boton-ghost" style={{ marginBottom: '1.25rem' }}>
              Ver todas mis reservas <ArrowRight size={15} />
            </Link>
          </>
        )}

        {/* Tus números */}
        {stats && (
          <>
            <h2 className="titulo" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', marginBottom: '0.5rem' }}>
              Tus números
            </h2>
            <div className="metricas" style={{ marginBottom: '1.25rem', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
              <div className="metrica" style={{ padding: '0.8rem 1rem' }}>
                <div className="metrica-label">Veces jugado</div>
                <div className="metrica-valor" style={{ fontSize: '1.4rem' }}>{stats.veces_jugado}</div>
              </div>
              <div className="metrica" style={{ padding: '0.8rem 1rem' }}>
                <div className="metrica-label">Gasto total</div>
                <div className="metrica-valor" style={{ fontSize: '1.4rem' }}>{precio(stats.gasto_total)}</div>
              </div>
              <div className="metrica" style={{ padding: '0.8rem 1rem' }}>
                <div className="metrica-label">Disciplina favorita</div>
                <div className="metrica-valor" style={{ fontSize: '1.05rem' }}>{stats.disciplina_favorita ?? '—'}</div>
              </div>
            </div>
          </>
        )}

        {/* Accesos rápidos */}
        <h2 className="titulo" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', marginBottom: '0.5rem' }}>
          Accesos rápidos
        </h2>
        <div className="metricas" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          <AccionRapida to="/reservar" icon={CalendarClock} titulo="Reservar cancha" sub="Turnos de 1 h, :15 a :15" />
          <AccionRapida to="/mis-reservas" icon={CalendarDays} titulo="Mis reservas" sub="Próximos turnos e historial" />
          <AccionRapida to="/mis-abonos" icon={Ticket} titulo="Mis abonos" sub="Gym y pileta mensuales" />
          <AccionRapida to="/torneos" icon={Trophy} titulo="Torneos" sub="Inscripciones y partidos" />
          <AccionRapida to="/notificaciones" icon={Bell} titulo="Notificaciones" sub="Avisos del complejo" />
          <AccionRapida to="/complejo" icon={Goal} titulo="El complejo" sub="Canchas, precios y horarios" />
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   STAFF / DUEÑO — panel del día con datos reales
   ============================================================ */
function HomeStaff() {
  const { perfil } = useAuth();
  const [resumen, setResumen] = useState<ResumenStaff | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    api<ResumenStaff>('/dashboard/resumen')
      .then((d) => {
        if (!cancelado) setResumen(d);
      })
      .catch(() => {
        /* si falla, igual mostramos los accesos */
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const esSuper = perfil?.rol === 'super_admin';

  return (
    <main className="pantalla" style={{ paddingTop: '1.25rem' }}>
      <div className="contenedor-ancho">
        {/* Saludo */}
        <div className="fila-entre" style={{ marginBottom: '1.1rem' }}>
          <div>
            <h1 className="titulo" style={{ fontSize: '1.6rem', marginBottom: '0.1rem' }}>
              {perfil?.nombre ? `¡Hola, ${perfil.nombre}!` : 'Panel del complejo'}
            </h1>
            <p className="subtitulo" style={{ margin: 0, textTransform: 'capitalize' }}>
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <Link to="/complejo" className="boton boton-outline">Ver sitio público</Link>
        </div>

        {/* El complejo hoy */}
        <h2 className="titulo" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', marginBottom: '0.5rem' }}>
          El complejo hoy
        </h2>
        {cargando ? (
          <div className="metricas" style={{ marginBottom: '1.25rem' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: '6rem' }} />
            ))}
          </div>
        ) : resumen ? (
          <div className="metricas" style={{ marginBottom: '1.25rem' }}>
            <div className="metrica">
              <div className="metrica-icono verde"><CalendarDays size={19} /></div>
              <div className="metrica-label">Reservas hoy</div>
              <div className="metrica-valor">{resumen.reservas_hoy}</div>
            </div>
            <div className="metrica">
              <div className="metrica-icono verde"><BadgeDollarSign size={19} /></div>
              <div className="metrica-label">Ingresos hoy</div>
              <div className="metrica-valor">{precio(resumen.ingresos_dia)}</div>
            </div>
            <div className="metrica">
              <div className="metrica-icono ambar"><ClipboardList size={19} /></div>
              <div className="metrica-label">Pendientes de seña</div>
              <div className="metrica-valor">{resumen.pendientes_seña}</div>
            </div>
            <div className="metrica">
              <div className="metrica-icono rojo"><AlertTriangle size={19} /></div>
              <div className="metrica-label">Abonos por vencer</div>
              <div className="metrica-valor">{resumen.abonos_por_vencer}</div>
            </div>
          </div>
        ) : null}

        {/* Accesos al panel */}
        <h2 className="titulo" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', marginBottom: '0.5rem' }}>
          Tu panel
        </h2>
        <div className="metricas" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          <AccionRapida to="/admin/dashboard" icon={LayoutDashboard} titulo="Panel general" sub="Métricas y resumen del día" />
          <AccionRapida to="/admin/grilla" icon={Grid3x3} titulo="Grilla del día" sub="Turnos, bloqueos y carga rápida" />
          <AccionRapida to="/admin/vender-abono" icon={Ticket} titulo="Vender abono" sub="Gym y pileta mensuales" />
          {esSuper ? (
            <AccionRapida to="/admin/caja" icon={Wallet} titulo="Caja" sub="Ingresos, egresos y CSV" />
          ) : (
            <AccionRapida to="/admin/torneos" icon={Trophy} titulo="Torneos" sub="Equipos y partidos" />
          )}
          <AccionRapida to="/admin/socios" icon={Users} titulo="Socios" sub="Altas, directorio y beneficios" />
          {esSuper ? (
            <AccionRapida to="/admin/reportes" icon={BadgeDollarSign} titulo="Reportes" sub="Recaudación y estadísticas" />
          ) : (
            <AccionRapida to="/admin/configuracion" icon={Goal} titulo="Configuración" sub="Deportes, canchas y políticas" />
          )}
        </div>
      </div>
    </main>
  );
}
