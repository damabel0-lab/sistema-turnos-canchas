import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useComplejo } from '../../hooks/useComplejo';
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

interface ThumbnailComplejo {
  id: number;
  nombre: string;
  slug: string;
  ciudad: string | null;
  gym: boolean;
  pileta: boolean;
  ofrece_torneos: boolean;
  deportes: Array<{ id: number; nombre: string }>;
  precio_desde: number | null;
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
  const { esStaffActivo } = useComplejo();
  if (!session) return <LandingPublica />;
  const esStaff = perfil?.rol === 'super_admin' || esStaffActivo;
  return esStaff ? <HomeStaff /> : <HomeCliente nombre={`${perfil?.nombre ?? ''} ${perfil?.apellido ?? ''}`.trim()} />;
}

/* ============================================================
   PÚBLICO — landing compacta: cómo funciona + CTAs
   ============================================================ */
function LandingPublica() {
  const pasos = [
    { n: 1, titulo: 'Elegí tu complejo', texto: 'Canchas, gym, pileta y torneos de la zona en un solo lugar.' },
    { n: 2, titulo: 'Elegí deporte y horario', texto: 'Turno de 1 h, garantizado en el complejo que prefieras.' },
    { n: 3, titulo: 'Confirmá y a jugar', texto: 'Reservá gratis como jugador. Seña opcional en el complejo.' },
  ];

  return (
    <main className="pantalla" style={{ paddingTop: '1rem' }}>
      <header className="hero" style={{ gridTemplateColumns: '1fr', textAlign: 'center', justifyItems: 'center', paddingBottom: '1.25rem' }}>
        <div className="hero-texto" style={{ maxWidth: '44rem' }}>
          <span className="hero-badge">
            <Goal size={14} /> La plataforma de complejos
          </span>
          <h1 className="hero-titulo">
            Todos los complejos,<br />
            <span className="hero-gradiente">una sola plataforma.</span>
          </h1>
          <p className="hero-sub" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
            Jugadores reservan gratis en cualquier complejo adherido; los dueños gestionan turnos, caja, abonos y torneos desde su panel.
          </p>
          <div className="fila" style={{ justifyContent: 'center', gap: '0.75rem' }}>
            <Link to="/login" state={{ desde: '/complejos' }} className="boton boton-primario" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
              Crear cuenta gratis <ArrowRight size={17} />
            </Link>
            <Link to="/login" state={{ desde: '/complejos' }} className="boton boton-outline" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
              Explorar complejos
            </Link>
          </div>
          <div className="hero-puntos" style={{ justifyContent: 'center' }}>
            <span><CheckCircle2 size={14} /> Gratis para jugadores</span>
            <span><CheckCircle2 size={14} /> Turnos de 1 h</span>
            <span><CheckCircle2 size={14} /> 14 días de prueba para dueños</span>
          </div>
          <p className="texto-sec" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
            ¿Sos dueño de un complejo?{' '}
            <Link to="/login" state={{ desde: '/registra-tu-complejo' }} style={{ color: 'var(--primario-2)', fontWeight: 700 }}>
              Registrate y publicalo en PlayControl →
            </Link>
          </p>
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
  const [ofreceTorneos, setOfreceTorneos] = useState(true);
  const [destacados, setDestacados] = useState<ThumbnailComplejo[]>([]);

  useEffect(() => {
    let cancelado = false;
    Promise.allSettled([
      api<{ proximas: ReservaMia[] }>('/reservas/mias'),
      api<EstadisticasMias>('/reservas/mias/estadisticas'),
      api<{ ofrece_torneos?: boolean }>('/config'),
    ]).then(([reservasRes, statsRes, configRes]) => {
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
      if (configRes.status === 'fulfilled') setOfreceTorneos(configRes.value.ofrece_torneos !== false);
      setCargando(false);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    api<ThumbnailComplejo[]>('/complejos')
      .then((d) => setDestacados(Array.isArray(d) ? d.slice(0, 3) : []))
      .catch(() => setDestacados([]));
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

        {/* Explorá complejos */}
        {destacados.length > 0 && (
          <>
            <h2 className="titulo" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', marginBottom: '0.5rem' }}>
              Explorá complejos
            </h2>
            <div className="complejos-grid" style={{ marginBottom: '1.1rem' }}>
              {destacados.map((c) => (
                <Link key={c.id} to={`/complejos/${c.slug}`} className="complejo-card">
                  <div className="fila-entre">
                    <h3 className="complejo-card-nombre" style={{ fontSize: '0.98rem' }}>{c.nombre}</h3>
                    {c.precio_desde != null && (
                      <span className="badge badge-exito">desde ${c.precio_desde.toLocaleString('es-AR')}</span>
                    )}
                  </div>
                  {c.ciudad && <p className="texto-debil" style={{ margin: 0, fontSize: '0.8rem' }}>{c.ciudad}</p>}
                  <div className="amenity-row">
                    {c.gym && <span className="amenity-chip destacada">Gym</span>}
                    {c.pileta && <span className="amenity-chip destacada">Pileta</span>}
                    {c.ofrece_torneos && <span className="amenity-chip destacada">Torneos</span>}
                    {c.deportes.slice(0, 2).map((d) => (
                      <span key={d.id} className="amenity-chip">{d.nombre}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* CTA para dueños */}
        <div className="dueno-cta" style={{ marginBottom: '1.25rem' }}>
          <div>
            <strong>¿Sos dueño de un complejo?</strong>
            <p className="texto-sec" style={{ margin: '0.15rem 0 0', fontSize: '0.88rem' }}>
              Publicalo en PlayControl y gestioná turnos, caja, socios, abonos y torneos desde un panel. 14 días de prueba.
            </p>
          </div>
          <Link to="/registra-tu-complejo" className="boton boton-primario" style={{ whiteSpace: 'nowrap' }}>
            Registrar mi complejo <ArrowRight size={16} />
          </Link>
        </div>

        {/* Accesos rápidos */}
        <h2 className="titulo" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--texto-3)', marginBottom: '0.5rem' }}>
          Accesos rápidos
        </h2>
        <div className="metricas" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          <AccionRapida to="/reservar" icon={CalendarClock} titulo="Reservar cancha" sub="Turnos de 1 h, :15 a :15" />
          <AccionRapida to="/mis-reservas" icon={CalendarDays} titulo="Mis reservas" sub="Próximos turnos e historial" />
          <AccionRapida to="/mis-abonos" icon={Ticket} titulo="Mis abonos" sub="Gym y pileta mensuales" />
          {ofreceTorneos && (
            <AccionRapida to="/torneos" icon={Trophy} titulo="Torneos" sub="Inscripciones y partidos" />
          )}
          <AccionRapida to="/notificaciones" icon={Bell} titulo="Notificaciones" sub="Avisos del complejo" />
          <AccionRapida to="/complejos" icon={Goal} titulo="Explorar complejos" sub="Canchas, precios y reservas" />
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
  const [ofreceTorneos, setOfreceTorneos] = useState(true);

  useEffect(() => {
    let cancelado = false;
    Promise.allSettled([
      api<ResumenStaff>('/dashboard/resumen'),
      api<{ ofrece_torneos?: boolean }>('/config'),
    ]).then(([resumenRes, configRes]) => {
      if (cancelado) return;
      if (resumenRes.status === 'fulfilled') setResumen(resumenRes.value);
      if (configRes.status === 'fulfilled') setOfreceTorneos(configRes.value.ofrece_torneos !== false);
      setCargando(false);
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
          ) : ofreceTorneos ? (
            <AccionRapida to="/admin/torneos" icon={Trophy} titulo="Torneos" sub="Equipos y partidos" />
          ) : (
            <AccionRapida to="/admin/configuracion" icon={Goal} titulo="Configuración" sub="Deportes, canchas y políticas" />
          )}
          <AccionRapida to="/admin/socios" icon={Users} titulo="Socios" sub="Altas, directorio y beneficios" />
          {esSuper ? (
            <AccionRapida to="/admin/reportes" icon={BadgeDollarSign} titulo="Reportes" sub="Recaudación y estadísticas" />
          ) : null}
        </div>
      </div>
    </main>
  );
}
