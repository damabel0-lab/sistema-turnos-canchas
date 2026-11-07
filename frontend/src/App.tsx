import { Route, Routes } from 'react-router-dom';
import { RutaProtegida } from './components/RutaProtegida';
import { BarraSesion } from './components/BarraSesion';

// Páginas cliente (públicas)
import { HomePage } from './pages/cliente/HomePage';
import { ReservarPage } from './pages/cliente/ReservarPage';
import { MisReservasPage } from './pages/cliente/MisReservasPage';
import { MisAbonosPage } from './pages/cliente/MisAbonosPage';
import { TorneosClientePage } from './pages/cliente/TorneosClientePage';

// Auth
import { LoginPage } from './pages/auth/LoginPage';

// Páginas admin (protegidas por rol)
import { GrillaPage } from './pages/admin/GrillaPage';
import { CanchasPage } from './pages/admin/CanchasPage';
import { SociosPage } from './pages/admin/SociosPage';
import { BeneficiosPage } from './pages/admin/BeneficiosPage';
import { VenderAbonoPage } from './pages/admin/VenderAbonoPage';
import { CajaPage } from './pages/admin/CajaPage';
import { ReportesPage } from './pages/admin/ReportesPage';
import { TorneosPage } from './pages/admin/TorneosPage';

export function App() {
  return (
    <>
      <BarraSesion />
      <Routes>
        {/* Cliente */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reservar" element={<ReservarPage />} />
        <Route path="/mis-reservas" element={<MisReservasPage />} />
        <Route path="/mis-abonos" element={<MisAbonosPage />} />
        <Route path="/torneos" element={<TorneosClientePage />} />

        {/* Admin — requiere sesión + rol staff (super_admin o recepcionista).
            Caja además es solo super_admin (verificar dentro de la página). */}
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
