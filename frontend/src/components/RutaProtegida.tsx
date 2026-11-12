import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useComplejo } from '../hooks/useComplejo';

interface Props {
  children: ReactNode;
  /** Exige membresía de staff en el complejo activo (o super_admin plataforma) — para el panel admin */
  requireStaff?: boolean;
  /** Además de staff, exige ser DUEÑO de ESE complejo — para finanzas y configuración */
  requireOwner?: boolean;
}

/** Protege rutas:
 *  - por defecto, alcanza con estar logueado (páginas de jugador tipo /complejos, /reservar);
 *  - requireStaff: exige membresía de staff en el complejo activo (o super_admin plataforma);
 *  - requireOwner: además, ser dueño de ESE complejo (o super_admin plataforma). */
export function RutaProtegida({ children, requireStaff, requireOwner }: Props) {
  const { session, cargando } = useAuth();
  const { esStaffActivo, esDuenoActivo, cargando: cargandoComplejo } = useComplejo();
  const location = useLocation();

  if (cargando || (requireStaff || requireOwner) && cargandoComplejo) {
    return <p style={{ padding: 16 }}>Cargando…</p>;
  }

  if (!session) {
    // Guarda a dónde quería ir para volver ahí tras el login
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }

  if (requireOwner ? !esDuenoActivo : requireStaff ? !esStaffActivo : false) {
    return <p style={{ padding: 16 }}>No tenés permiso para ver esta sección.</p>;
  }

  return <>{children}</>;
}
