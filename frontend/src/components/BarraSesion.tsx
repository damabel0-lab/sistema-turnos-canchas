import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

/** Barra de navegación superior */
export function BarraSesion() {
  const { session, perfil, salir } = useAuth();

  if (!session) {
    return (
      <nav className="nav-barra">
        <Link to="/">Inicio</Link>
        <Link to="/login">Iniciar sesión</Link>
      </nav>
    );
  }

  return (
    <nav className="nav-barra">
      <Link to="/">Inicio</Link>
      <Link to="/mis-reservas">Mis reservas</Link>
      {perfil && (perfil.rol === 'super_admin' || perfil.rol === 'recepcionista') && (
        <Link to="/admin/grilla">Panel</Link>
      )}
      <div className="nav-derecha">
        <span className="texto-sec">
          {perfil ? `${perfil.nombre} ${perfil.apellido}` : session.user.email}
        </span>
        <button className="boton boton-ghost" onClick={() => salir()}>
          Salir
        </button>
      </div>
    </nav>
  );
}
