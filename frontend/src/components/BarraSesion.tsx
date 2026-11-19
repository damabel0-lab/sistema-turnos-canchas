import { Link, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Bell, Goal, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useComplejo } from '../hooks/useComplejo';
import { useNoLeidas } from '../hooks/useNoLeidas';
import { ThemeToggle } from './ThemeToggle';
import { api } from '../lib/api';

/** Barra de navegación superior (cliente / público). En rutas /admin la reemplaza el sidebar. */
export function BarraSesion() {
  const { session, perfil, salir } = useAuth();
  const { esStaffActivo } = useComplejo();
  void esStaffActivo;
  const { pathname, search } = useLocation();
  const noLeidas = useNoLeidas();
  const [ofreceTorneos, setOfreceTorneos] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  // Config pública del complejo (hoy solo usamos si ofrece torneos)
  useEffect(() => {
    api<{ ofrece_torneos?: boolean }>('/config')
      .then((d) => setOfreceTorneos(d.ofrece_torneos !== false))
      .catch(() => {
        /* si falla, mostramos torneos por defecto */
      });
  }, []);

  // Cerrar el menú al navegar
  useEffect(() => {
    setMenuAbierto(false);
  }, [pathname, search]);

  // Escape y click afuera cierran el menú
  useEffect(() => {
    if (!menuAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAbierto(false);
    };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMenuAbierto(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [menuAbierto]);

  // Las pantallas de administración usan el AdminLayout (sidebar)
  if (pathname.startsWith('/admin')) return null;

  // Detectar si estamos en flujo dueño (/login?modo=registrarse&tipo=dueno) o jugador
  const params = new URLSearchParams(search);
  const flowDueno = params.get('tipo') === 'dueno';
  const destinoFlow = flowDueno
    ? '/login?modo=registrarse&tipo=jugador'
    : '/login?modo=registrarse&tipo=dueno';
  const labelFlow = flowDueno ? '¿Sos jugador?' : '¿Tenés un complejo?';

  const esStaff = esStaffActivo && !!session;
  const esSuper = perfil?.rol === 'super_admin';

  const enlacesPublicos = session
    ? [
        { to: '/complejos', label: 'Complejos' },
        { to: '/reservar', label: 'Reservar' },
        { to: '/mis-reservas', label: 'Mis reservas' },
        { to: '/mis-abonos', label: 'Mis abonos' },
        ...(ofreceTorneos ? [{ to: '/torneos', label: 'Torneos' }] : []),
      ]
    : [{ to: '/complejos', label: 'Complejos' }];

  const enlacesStaff = esStaff
    ? [
        { to: '/admin/dashboard', label: 'Panel' },
        { to: '/admin/configuracion', label: 'Configuración' },
      ]
    : [];

  const enlacesSuper = esSuper ? [{ to: '/admin/plataforma', label: 'Plataforma' }] : [];

  const brand = (
    <Link to="/" className="nav-brand" aria-label="PlayControl — inicio">
      <span className="brand-mark">
        <Goal size={17} strokeWidth={2.2} />
      </span>
      PlayControl
    </Link>
  );

  const badgeNotif =
    noLeidas > 0 ? <span className="nav-badge">{noLeidas > 99 ? '99+' : noLeidas}</span> : null;

  return (
    <nav ref={navRef} className="nav-barra" aria-label="Navegación principal">
      {brand}

      {/* Links en escritorio */}
      <div className="nav-links-desktop">
        {enlacesPublicos.map((l) => (
          <Link key={l.to} to={l.to}>
            {l.label}
          </Link>
        ))}
        {enlacesStaff.length > 0 && (
          <>
            <span className="nav-separador" aria-hidden />
            {enlacesStaff.map((l) => (
              <Link key={l.to} to={l.to} className="nav-link-staff">
                {l.label}
              </Link>
            ))}
          </>
        )}
        {enlacesSuper.length > 0 && (
          <>
            {enlacesStaff.length === 0 && <span className="nav-separador" aria-hidden />}
            {enlacesSuper.map((l) => (
              <Link key={l.to} to={l.to} className="nav-link-staff">
                {l.label}
              </Link>
            ))}
          </>
        )}
      </div>

      {/* Derecha: tema, notif, usuario / flujo dueño, y burger en mobile */}
      <div className="nav-derecha">
        <ThemeToggle />
        {session && (
          <Link
            to="/notificaciones"
            className="theme-toggle"
            style={{ position: 'relative' }}
            aria-label={`Notificaciones${noLeidas > 0 ? `, ${noLeidas} sin leer` : ''}`}
          >
            <Bell size={17} />
            {badgeNotif}
          </Link>
        )}
        {session ? (
          <>
            <span className="texto-sec nav-derecha-nombre" style={{ fontSize: '0.85rem', maxWidth: '10rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {perfil ? `${perfil.nombre} ${perfil.apellido}` : session.user.email}
            </span>
            <button type="button" className="boton boton-ghost nav-derecha-salir" onClick={() => void salir()}>
              Salir
            </button>
          </>
        ) : (
          <>
            <Link to={destinoFlow} className="nav-dueno-link nav-derecha-flow">
              {labelFlow}
            </Link>
            <Link to="/login" className="boton boton-primario nav-derecha-login" style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}>
              Iniciar sesión
            </Link>
          </>
        )}
        {/* Burger solo visible en mobile (CSS) */}
        <button
          type="button"
          className="nav-burger"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
          aria-controls="nav-movil"
          onClick={() => setMenuAbierto((v) => !v)}
        >
          {menuAbierto ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Dropdown mobile */}
      {menuAbierto && (
        <div className="nav-movil" id="nav-movil">
          {enlacesPublicos.map((l) => (
            <Link key={l.to} to={l.to}>
              {l.label}
            </Link>
          ))}
          {(enlacesStaff.length > 0 || enlacesSuper.length > 0) && <div className="nav-separador" aria-hidden />}
          {enlacesStaff.map((l) => (
            <Link key={l.to} to={l.to} className="nav-movil-acento">
              {l.label}
            </Link>
          ))}
          {enlacesSuper.map((l) => (
            <Link key={l.to} to={l.to} className="nav-movil-acento">
              {l.label}
            </Link>
          ))}
          <div className="nav-separador" aria-hidden />
          {session ? (
            <>
              <div className="nav-movil-usuario">
                {perfil ? `${perfil.nombre} ${perfil.apellido}` : session.user.email}
              </div>
              <button type="button" className="nav-movil-boton" onClick={() => void salir()}>
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to={destinoFlow} className="nav-movil-acento">
                {labelFlow}
              </Link>
              <Link to="/login" className="nav-movil-boton primario">
                Iniciar sesión
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
