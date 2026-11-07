import { useAuth } from '../hooks/useAuth';

/** Barra simple con sesión activa y cierre. Mejorar con estilos después. */
export function BarraSesion() {
  const { session, perfil, salir } = useAuth();

  if (!session) {
    return (
      <nav style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid #ddd' }}>
        <a href="/">Inicio</a>
        <a href="/login">Iniciar sesión</a>
      </nav>
    );
  }

  return (
    <nav style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid #ddd', alignItems: 'center' }}>
      <a href="/">Inicio</a>
      <a href="/mis-reservas">Mis reservas</a>
      {perfil && (perfil.rol === 'super_admin' || perfil.rol === 'recepcionista') && (
        <a href="/admin/grilla">Panel</a>
      )}
      <span style={{ marginLeft: 'auto' }}>
        {perfil ? `${perfil.nombre} ${perfil.apellido} (${perfil.rol})` : session.user.email}
      </span>
      <button type="button" onClick={() => salir()}>Salir</button>
    </nav>
  );
}
