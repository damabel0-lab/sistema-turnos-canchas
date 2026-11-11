import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { RutaProtegida } from './components/RutaProtegida';
import { BarraSesion } from './components/BarraSesion';
import { api } from './lib/api';
import { useAuth } from './hooks/useAuth';

// Páginas cliente (públicas)
import { HomePage } from './pages/cliente/HomePage';
import { ReservarPage } from './pages/cliente/ReservarPage';
import { MisReservasPage } from './pages/cliente/MisReservasPage';
import { MisAbonosPage } from './pages/cliente/MisAbonosPage';
import { TorneosClientePage } from './pages/cliente/TorneosClientePage';
import { NotificacionesPage } from './pages/cliente/NotificacionesPage';

// Auth
import { LoginPage } from './pages/auth/LoginPage';

// Páginas admin (protegidas por rol)
import { GrillaPage } from './pages/admin/GrillaPage';
import { CanchasPage } from './pages/admin/CanchasPage';
import { SociosPage } from './pages/admin/SociosPage';
import { BeneficiosPage } from './pages/admin/BeneficiosPage';
import { VenderAbonoPage } from './pages/admin/VenderAbonoPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { ConfigurarPage } from './pages/admin/ConfigurarPage';
import { CajaPage } from './pages/admin/CajaPage';
import { ComplejoPublicoPage } from './pages/publico/ComplejoPublicoPage';
import { ReportesPage } from './pages/admin/ReportesPage';
import { TorneosPage } from './pages/admin/TorneosPage';

export function App() {
  const { perfil } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!perfil) return;
    const esStaff = perfil.rol === 'super_admin' || perfil.rol === 'recepcionista';
    if (!esStaff) return;

    // No redirigir si ya estamos en el wizard o en login
    if (location.pathname.startsWith('/admin/configurar') || location.pathname.startsWith('/login')) {
      return;
    }

    // Verificar si el setup está completo
    api<{ setup_completado: boolean }>('/admin/setup')
      .then((data) => {
        if (!data.setup_completado && !location.pathname.startsWith('/admin/configurar')) {
          window.location.href = '/admin/configurar';
        }
      })
      .catch(() => {
        // si falla, no bloqueamos al usuario
      });
  }, [perfil, location.pathname]);

  return (
    <>
      <BarraSesion />
      <Routes>
        {/* Cliente */}
        <Route path="/" element={<HomePage />} />
        <Route path="/complejo" element={<ComplejoPublicoPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reservar" element={<ReservarPage />} />
        <Route path="/mis-reservas" element={<MisReservasPage />} />
        <Route path="/mis-abonos" element={<MisAbonosPage />} />
        <Route path="/torneos" element={<TorneosClientePage />} />
        <Route path="/notificaciones" element={<NotificacionesPage />} />

        {/* Admin — requiere sesión + rol staff (super_admin o recepcionista).
            Caja además es solo super_admin (verificar dentro de la página). */}
        <Route
          path="/admin/configurar"
          element={
            <RutaProtegida roles={['super_admin', 'recepcionista']}>
              <ConfigurarPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <RutaProtegida roles={['super_admin', 'recepcionista']}>
              <DashboardPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/grilla"
          element={
            <RutaProtegida roles={['super_admin', 'recepcionista']}>
              <GrillaPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/canchas"
          element={
            <RutaProtegida roles={['super_admin', 'recepcionista']}>
              <CanchasPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/socios"
          element={
            <RutaProtegida roles={['super_admin', 'recepcionista']}>
              <SociosPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/beneficios"
          element={
            <RutaProtegida roles={['super_admin', 'recepcionista']}>
              <BeneficiosPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/vender-abono"
          element={
            <RutaProtegida roles={['super_admin', 'recepcionista']}>
              <VenderAbonoPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/caja"
          element={
            <RutaProtegida roles={['super_admin']}>
              <CajaPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/reportes"
          element={
            <RutaProtegida roles={['super_admin']}>
              <ReportesPage />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin/torneos"
          element={
            <RutaProtegida roles={['super_admin', 'recepcionista']}>
              <TorneosPage />
            </RutaProtegida>
          }
        />
      </Routes>
    </>
  );
}
