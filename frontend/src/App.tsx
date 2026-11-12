import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { RutaProtegida } from './components/RutaProtegida';
import { BarraSesion } from './components/BarraSesion';
import { api } from './lib/api';
import { useAuth } from './hooks/useAuth';
import { useComplejo } from './hooks/useComplejo';

// Páginas públicas / cliente autenticado
import { HomePage } from './pages/cliente/HomePage';
import { ReservarPage } from './pages/cliente/ReservarPage';
import { MisReservasPage } from './pages/cliente/MisReservasPage';
import { MisAbonosPage } from './pages/cliente/MisAbonosPage';
import { TorneosClientePage } from './pages/cliente/TorneosClientePage';
import { NotificacionesPage } from './pages/cliente/NotificacionesPage';
import { ComplejosPage } from './pages/publico/ComplejosPage';
import { ComplejoDetallePage } from './pages/publico/ComplejoDetallePage';
import { RegistrarComplejoPage } from './pages/publico/RegistrarComplejoPage';

// Auth
import { LoginPage } from './pages/auth/LoginPage';

// Páginas admin (staff del complejo activo / dueño / plataforma)
import { AdminLayout } from './components/AdminLayout';
import { CierreCajaPage } from './pages/admin/CierreCajaPage';
import { GrillaPage } from './pages/admin/GrillaPage';
import { CanchasPage } from './pages/admin/CanchasPage';
import { SociosPage } from './pages/admin/SociosPage';
import { BeneficiosPage } from './pages/admin/BeneficiosPage';
import { VenderAbonoPage } from './pages/admin/VenderAbonoPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { ConfiguracionPage } from './pages/admin/ConfiguracionPage';
import { ConfigurarPage } from './pages/admin/ConfigurarPage';
import { CajaPage } from './pages/admin/CajaPage';
import { ReportesPage } from './pages/admin/ReportesPage';
import { TorneosPage } from './pages/admin/TorneosPage';
import { PlataformaPage } from './pages/admin/PlataformaPage';

export function App() {
  const { perfil } = useAuth();
  const { esStaffActivo } = useComplejo();
  const location = useLocation();

  useEffect(() => {
    if (!perfil) return;
    if (!esStaffActivo) return;

    // No redirigir si ya estamos en el wizard o en login
    if (location.pathname.startsWith('/admin/configurar') || location.pathname.startsWith('/login')) {
      return;
    }

    // Verificar si el setup del complejo activo está completo
    api<{ setup_completado: boolean }>('/admin/setup')
      .then((data) => {
        if (!data.setup_completado && !location.pathname.startsWith('/admin/configurar')) {
          window.location.href = '/admin/configurar';
        }
      })
      .catch(() => {
        // si falla, no bloqueamos al usuario
      });
  }, [perfil, esStaffActivo, location.pathname]);

  return (
    <>
      <BarraSesion />
      <Routes>
        {/* Cliente / público */}
        <Route path="/" element={<HomePage />} />
        <Route path="/complejo" element={<Navigate to="/complejos" replace />} />
        <Route
          path="/complejos"
          element={
            <RutaProtegida>
              <ComplejosPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/complejos/:slug"
          element={
            <RutaProtegida>
              <ComplejoDetallePage />
            </RutaProtegida>
          }
        />
        <Route
          path="/registra-tu-complejo"
          element={
            <RutaProtegida>
              <RegistrarComplejoPage />
            </RutaProtegida>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/reservar"
          element={
            <RutaProtegida>
              <ReservarPage />
            </RutaProtegida>
          }
        />
        <Route path="/mis-reservas" element={<MisReservasPage />} />
        <Route path="/mis-abonos" element={<MisAbonosPage />} />
        <Route path="/torneos" element={<TorneosClientePage />} />
        <Route path="/notificaciones" element={<NotificacionesPage />} />

        {/* Asistente de configuración inicial (a pantalla completa, sin sidebar) */}
        <Route
          path="/admin/configurar"
          element={
            <RutaProtegida>
              <ConfigurarPage />
            </RutaProtegida>
          }
        />

        {/* Cierre de caja imprimible (PDF) — fuera del layout admin, solo dueño */}
        <Route
          path="/admin/caja/cierre"
          element={
            <RutaProtegida requireOwner>
              <CierreCajaPage />
            </RutaProtegida>
          }
        />

        {/* Admin — layout con sidebar. Staff del complejo activo (membresía).
            Caja y Reportes: solo dueño del complejo activo.
            Plataforma: la página misma bloquea a quien no sea super_admin. */}
        <Route element={<AdminLayout />}>
        <Route path="/admin/plataforma" element={<RutaProtegida><PlataformaPage /></RutaProtegida>} />
        <Route path="/admin/configuracion" element={<RutaProtegida><ConfiguracionPage /></RutaProtegida>} />
        <Route path="/admin/dashboard" element={<RutaProtegida><DashboardPage /></RutaProtegida>} />
        <Route path="/admin/grilla" element={<RutaProtegida><GrillaPage /></RutaProtegida>} />
        <Route path="/admin/canchas" element={<RutaProtegida><CanchasPage /></RutaProtegida>} />
        <Route path="/admin/socios" element={<RutaProtegida><SociosPage /></RutaProtegida>} />
        <Route path="/admin/beneficios" element={<RutaProtegida><BeneficiosPage /></RutaProtegida>} />
        <Route path="/admin/vender-abono" element={<RutaProtegida><VenderAbonoPage /></RutaProtegida>} />
        <Route path="/admin/caja" element={<RutaProtegida requireOwner><CajaPage /></RutaProtegida>} />
        <Route path="/admin/reportes" element={<RutaProtegida requireOwner><ReportesPage /></RutaProtegida>} />
        <Route path="/admin/torneos" element={<RutaProtegida><TorneosPage /></RutaProtegida>} />
        </Route>
      </Routes>
    </>
  );
}
