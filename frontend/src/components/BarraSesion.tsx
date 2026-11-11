import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Bell, Goal } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNoLeidas } from '../hooks/useNoLeidas';
import { ThemeToggle } from './ThemeToggle';
import { api } from '../lib/api';

/** Barra de navegación superior (cliente / público). En rutas /admin la reemplaza el sidebar. */
export function BarraSesion() {
  const { session, perfil, salir } = useAuth();
  const { pathname } = useLocation();
  const noLeidas = useNoLeidas();
  const [ofreceTorneos, setOfreceTorneos] = useState(true);

  // Config pública del complejo (hoy solo usamos si ofrece torneos)
  useEffect(() => {
    api<{ ofrece_torneos?: boolean }>('/config')
      .then((d) => setOfreceTorneos(d.ofrece_torneos !== false))
      .catch(() => {
        /* si falla, mostramos torneos por defecto */
      });
  }, []);

  // Las pantallas de administración usan el AdminLayout (sidebar)
  if (pathname.startsWith('/admin')) return null;

  const esStaff = perfil && (perfil.rol === 'super_admin' || perfil.rol === 'recepcionista');

  const brand = (
    <Link to="/" className="nav-brand" aria-label="PlayControl — inicio">
      <span className="brand-mark">
        <Goal size={17} strokeWidth={2.2} />
      </span>
      PlayControl
    </Link>
  );

  if (!session) {
    return (
      <nav className="nav-barra" aria-label="Navegación principal">
        {brand}
        <Link to="/complejo">Complejo</Link>
        <div className="nav-derecha">
          <ThemeToggle />
          <Link to="/login" className="boton boton-primario" style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}>
            Iniciar sesión
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="nav-barra" aria-label="Navegación principal">
      {brand}
      <Link to="/complejo">Complejo</Link>
      <Link to="/reservar">Reservar</Link>
      <span className="nav-separador" aria-hidden />
      <Link to="/mis-reservas">Mis reservas</Link>
      <Link to="/mis-abonos">Mis abonos</Link>
      {ofreceTorneos && <Link to="/torneos">Torneos</Link>}
      {esStaff && (
        <>
          <span className="nav-separador" aria-hidden />
          <Link to="/admin/dashboard" className="nav-link-staff">Panel</Link>
          <Link to="/admin/configuracion" className="nav-link-staff">Configuración</Link>
        </>
      )}
      <div className="nav-derecha">
        <ThemeToggle />
        <Link
          to="/notificaciones"
          className="theme-toggle"
          style={{ position: 'relative' }}
          aria-label={`Notificaciones${noLeidas > 0 ? `, ${noLeidas} sin leer` : ''}`}
        >
          <Bell size={17} />
          {noLeidas > 0 && <span className="nav-badge">{noLeidas > 99 ? '99+' : noLeidas}</span>}
        </Link>
        <span className="texto-sec" style={{ fontSize: '0.85rem', maxWidth: '10rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {perfil ? `${perfil.nombre} ${perfil.apellido}` : session.user.email}
        </span>
        <button type="button" className="boton boton-ghost" onClick={() => void salir()}>
          Salir
        </button>
      </div>
    </nav>
  );
}
