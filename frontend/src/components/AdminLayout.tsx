import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Goal,
  LayoutDashboard,
  CalendarDays,
  Users,
  BadgePercent,
  Ticket,
  Trophy,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useComplejo } from '../hooks/useComplejo';
import { useNoLeidas } from '../hooks/useNoLeidas';
import { ThemeToggle } from './ThemeToggle';

interface ItemSide {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Si se define, solo visible para dueños del complejo activo (finanzas y configuración) */
  ownerOnly?: boolean;
}

interface GrupoSide {
  titulo: string;
  items: ItemSide[];
}

const GRUPOS: GrupoSide[] = [
  {
    titulo: 'Principal',
    items: [
      { to: '/admin/dashboard', label: 'Panel general', icon: LayoutDashboard },
      { to: '/admin/grilla', label: 'Grilla del día', icon: CalendarDays },
    ],
  },
  {
    titulo: 'Operación',
    items: [
      { to: '/admin/canchas', label: 'Canchas y tarifas', icon: Goal },
      { to: '/admin/socios', label: 'Socios', icon: Users },
      { to: '/admin/beneficios', label: 'Beneficios', icon: BadgePercent },
      { to: '/admin/vender-abono', label: 'Vender abono', icon: Ticket },
      { to: '/admin/torneos', label: 'Torneos', icon: Trophy },
    ],
  },
  {
    titulo: 'Finanzas',
    items: [
      { to: '/admin/caja', label: 'Caja', icon: Wallet, ownerOnly: true },
      { to: '/admin/reportes', label: 'Reportes', icon: BarChart3, ownerOnly: true },
    ],
  },
  {
    titulo: 'Sistema',
    items: [{ to: '/admin/configuracion', label: 'Configuración', icon: Settings }],
  },
];

const SECCIONES: Record<string, string> = {
  dashboard: 'Panel general',
  grilla: 'Grilla del día',
  canchas: 'Canchas y tarifas',
  socios: 'Socios',
  beneficios: 'Beneficios',
  'vender-abono': 'Vender abono',
  torneos: 'Torneos',
  caja: 'Caja',
  reportes: 'Reportes',
  configuracion: 'Configuración',
  plataforma: 'Plataforma',
  configurar: 'Asistente de configuración',
};

export function AdminLayout() {
  const { perfil, salir } = useAuth();
  const { esDuenoActivo, esSuperAdmin, membresias, membresiaActiva, vigenteActivo, activoId, seleccionar } = useComplejo();
  const location = useLocation();
  const noLeidas = useNoLeidas();

  const nombreComplejo = membresiaActiva?.complejo?.nombre ?? 'Mi complejo';
  const suscripcion = membresiaActiva?.suscripcion ?? null;
  const badgeSusc = suscripcion
    ? suscripcion.estado === 'prueba'
      ? { cls: 'badge-info', texto: 'Trial' }
      : suscripcion.estado === 'activa'
        ? Number(suscripcion.monto) === 0
          ? { cls: 'badge-exito', texto: 'Cortesía' }
          : { cls: 'badge-exito', texto: 'Activa' }
        : { cls: 'badge-peligro', texto: suscripcion.estado === 'vencida' ? 'Vencida' : 'Cancelada' }
    : null;

  const nombreCompleto = perfil ? `${perfil.nombre} ${perfil.apellido}` : 'Usuario';
  const iniciales = nombreCompleto
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  const rol = esSuperAdmin
    ? 'Super admin plataforma'
    : membresiaActiva?.rol === 'dueno'
      ? 'Dueño'
      : membresiaActiva?.rol === 'recepcionista'
        ? 'Recepcionista'
        : 'Staff';

  const seccion = SECCIONES[location.pathname.split('/').pop() ?? ''] ?? 'Panel';
  const puedeVer = (item: ItemSide) => !item.ownerOnly || esDuenoActivo;
  const grupos = esSuperAdmin
    ? [...GRUPOS, { titulo: 'Plataforma', items: [{ to: '/admin/plataforma', label: 'Suscripciones y planes', icon: ShieldCheck }] }]
    : GRUPOS;

  return (
    <div className="admin-layout">
      {/* ===== Sidebar ===== */}
      <aside className="admin-sidebar" aria-label="Navegación de administración">
        <Link to="/" className="admin-brand" aria-label="PlayControl — inicio">
          <span className="brand-mark">
            <Goal size={20} strokeWidth={2.2} />
          </span>
          <span>
            <span className="admin-brand-name">PlayControl</span>
            <span className="admin-brand-tag">Panel de administración</span>
          </span>
        </Link>

        {/* Contexto: qué complejo estás administrando */}
        <div className="admin-complejo" aria-label="Complejo administrado">
          <div className="admin-complejo-nombre" title={nombreComplejo}>{nombreComplejo}</div>
          <div className="fila" style={{ gap: '0.35rem', marginTop: '0.35rem' }}>
            {badgeSusc && <span className={`badge ${badgeSusc.cls}`}>{badgeSusc.texto}</span>}
            {membresias.length > 1 && (
              <select
                className="input"
                style={{ padding: '0.22rem 0.35rem', fontSize: '0.74rem', maxWidth: '11rem' }}
                value={activoId ?? ''}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const m = membresias.find((x) => x.complejo_id === id);
                  seleccionar(id, m?.complejo?.slug);
                }}
                aria-label="Cambiar de complejo"
              >
                {membresias.map((m) => (
                  <option key={m.complejo_id} value={m.complejo_id}>
                    {m.complejo?.nombre ?? `Complejo #${m.complejo_id}`}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <nav className="admin-nav-scroll">
          {grupos.map((grupo) => {
            const visibles = grupo.items.filter(puedeVer);
            if (visibles.length === 0) return null;
            return (
              <div key={grupo.titulo} className="admin-nav-grupo">
                <div className="admin-nav-titulo">{grupo.titulo}</div>
                {visibles.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `side-link${isActive ? ' activo' : ''}`}
                    >
                      <Icon size={17} strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <div className="admin-user-avatar" aria-hidden>
              {iniciales || 'PC'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nombreCompleto}
              </div>
              <div className="texto-debil">{rol}</div>
            </div>
          </div>
          <button type="button" className="boton boton-outline boton-block" onClick={() => void salir()}>
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ===== Contenido ===== */}
      <section className="admin-content">
        <div className="admin-topbar">
          <div className="admin-breadcrumb">PlayControl&nbsp;&nbsp;/&nbsp;&nbsp;{seccion}</div>
          <div className="fila" style={{ gap: '0.5rem' }}>
            <span className="live-indicador" title="Datos en tiempo real">
              <span className="live-dot" /> Live
            </span>
            <ThemeToggle />
            <Link
              to="/notificaciones"
              className="theme-toggle"
              style={{ position: 'relative' }}
              aria-label={`Notificaciones${noLeidas > 0 ? `, ${noLeidas} sin leer` : ''}`}
            >
              <Bell size={17} />
              {noLeidas > 0 && (
                <span className="nav-badge">
                  {noLeidas > 99 ? '99+' : noLeidas}
                </span>
              )}
            </Link>
          </div>
        </div>
        <div className="admin-contenido-top">
          {vigenteActivo === false && (
            <div className="susc-banner vencida" role="alert">
              <strong>Suscripción suspendida.</strong> Tu complejo no aparece en el catálogo y los jugadores no pueden reservar.
              Contactá a PlayControl para regularizarla.
            </div>
          )}
          {vigenteActivo === true && membresiaActiva?.suscripcion?.estado === 'prueba' && (
            <div className="susc-banner prueba">
              <strong>Período de prueba.</strong> Tu suscripción es de 14 días{membresiaActiva.suscripcion.fin ? ` y vence el ${membresiaActiva.suscripcion.fin}` : ''}.
              Después tu complejo solo se desactiva del catálogo hasta que regularices el pago.
            </div>
          )}
        </div>
        <Outlet />
      </section>
    </div>
  );
}
