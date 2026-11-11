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
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNoLeidas } from '../hooks/useNoLeidas';
import { ThemeToggle } from './ThemeToggle';

interface ItemSide {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Si se define, solo visible para esos roles */
  roles?: Array<'super_admin' | 'recepcionista'>;
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
      { to: '/admin/caja', label: 'Caja', icon: Wallet, roles: ['super_admin'] },
      { to: '/admin/reportes', label: 'Reportes', icon: BarChart3, roles: ['super_admin'] },
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
  configurar: 'Asistente de configuración',
};

export function AdminLayout() {
  const { perfil, salir } = useAuth();
  const location = useLocation();
  const noLeidas = useNoLeidas();

  const nombreCompleto = perfil ? `${perfil.nombre} ${perfil.apellido}` : 'Usuario';
  const iniciales = nombreCompleto
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  const rol =
    perfil?.rol === 'super_admin' ? 'Dueño / Super admin' : perfil?.rol === 'recepcionista' ? 'Recepcionista' : '';

  const seccion = SECCIONES[location.pathname.split('/').pop() ?? ''] ?? 'Panel';
  const puedeVer = (item: ItemSide) => !item.roles || (perfil ? item.roles.includes(perfil.rol as 'super_admin') : false);

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

        <nav className="admin-nav-scroll">
          {GRUPOS.map((grupo) => {
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
        <Outlet />
      </section>
    </div>
  );
}
