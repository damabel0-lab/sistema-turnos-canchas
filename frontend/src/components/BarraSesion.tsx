import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Bell } from 'lucide-react';

/** Barra de navegación superior */
export function BarraSesion() {
  const { session, perfil, salir } = useAuth();
  const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);

  useEffect(() => {
    if (!session) return;

    let cancelado = false;

    async function cargar() {
      try {
        const datos = await api<Array<{ leida: boolean }>>('/notificaciones');
        if (!cancelado) setNotificacionesNoLeidas(datos.filter((n) => !n.leida).length);
      } catch {
        // no bloquear la navegación por un error de notificaciones
      }
    }

    cargar();
    const intervalo = setInterval(cargar, 30000); // refrescar cada 30 segundos

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [session]);

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
        <Link
          to="/notificaciones"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            position: 'relative',
            textDecoration: 'none',
            color: 'inherit',
          }}
          aria-label="Notificaciones"
        >
          <Bell size={18} />
          {notificacionesNoLeidas > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-0.35rem',
                right: '-0.35rem',
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                borderRadius: '9999px',
                padding: '0.1rem 0.35rem',
                lineHeight: 1,
              }}
            >
              {notificacionesNoLeidas}
            </span>
          )}
        </Link>

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
