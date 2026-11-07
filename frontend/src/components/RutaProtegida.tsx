import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface Props {
  children: ReactNode;
  /** Roles permitidos. Si se omite, alcanza con estar logueado. */
  roles?: Array<'super_admin' | 'recepcionista'>;
}

/** Protege rutas: exige sesión y, opcionalmente, rol (staff de admin). */
export function RutaProtegida({ children, roles }: Props) {
  const { session, perfil, cargando } = useAuth();
  const location = useLocation();

  if (cargando) return <p style={{ padding: 16 }}>Cargando…</p>;

  if (!session) {
    // Guarda a dónde quería ir para volver ahí tras el login
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }

  if (roles && perfil && !roles.includes(perfil.rol as 'super_admin' | 'recepcionista')) {
    return <p style={{ padding: 16 }}>No tenés permiso para ver esta sección.</p>;
  }

  return <>{children}</>;
}
