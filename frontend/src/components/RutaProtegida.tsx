import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useComplejo } from '../hooks/useComplejo';

interface Props {
  children: ReactNode;
  /** Exige ser DUEÑO del complejo activo (o super_admin plataforma) — para finanzas y configuración */
  requireOwner?: boolean;
}

/** Protege rutas: exige sesión y membresía de staff en el complejo activo (o super_admin plataforma).
 *  Con requireOwner, además exige ser dueño de ESE complejo (finanzas, configuración, torneos-admin). */
export function RutaProtegida({ children, requireOwner }: Props) {
  const { session, cargando } = useAuth();
  const { esStaffActivo, esDuenoActivo, cargando: cargandoComplejo } = useComplejo();
  const location = useLocation();

  if (cargando || cargandoComplejo) return <p style={{ padding: 16 }}>Cargando…</p>;

  if (!session) {
    // Guarda a dónde quería ir para volver ahí tras el login
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }

  if (requireOwner ? !esDuenoActivo : !esStaffActivo) {
    return <p style={{ padding: 16 }}>No tenés permiso para ver esta sección.</p>;
  }

  return <>{children}</>;
}
