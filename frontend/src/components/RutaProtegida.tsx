import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useComplejo } from '../hooks/useComplejo';

interface Props {
  children: ReactNode;
  /** Exige membresía de staff en el complejo activo (dueno o recepcionista) — para el panel admin */
  requireStaff?: boolean;
  /** Además de staff, exige ser DUEÑO de ESE complejo — para finanzas y configuración */
  requireOwner?: boolean;
  /** Exige super_admin (propietario de la plataforma PlayControl) — para /admin/plataforma */
  requireSuperAdmin?: boolean;
}

/** Protege rutas:
 *  - por defecto, alcanza con estar logueado (páginas de jugador tipo /complejos, /reservar);
 *  - requireStaff: exige membresía de staff en el complejo activo (dueno o recepcionista);
 *  - requireOwner: además, ser dueño de ESE complejo;
 *  - requireSuperAdmin: super_admin de la plataforma PlayControl. */
export function RutaProtegida({ children, requireStaff, requireOwner, requireSuperAdmin }: Props) {
  const { session, perfil, cargando } = useAuth();
  const { esStaffActivo, esDuenoActivo, cargando: cargandoComplejo } = useComplejo();
  const location = useLocation();

  if (cargando || (requireStaff || requireOwner) && cargandoComplejo) {
    return <p style={{ padding: 16 }}>Cargando…</p>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }

  if (requireSuperAdmin && perfil?.rol !== 'super_admin') {
    return <Navigate to="/complejos" replace />;
  }
  if (requireOwner ? !esDuenoActivo : requireStaff ? !esStaffActivo : false) {
    return <p style={{ padding: 16 }}>No tenés permiso para ver esta sección.</p>;
  }

  return <>{children}</>;
}
