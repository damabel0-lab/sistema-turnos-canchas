import { Route, Routes } from 'react-router-dom';

// Páginas cliente (públicas)
import { HomePage } from './pages/cliente/HomePage';
import { ReservarPage } from './pages/cliente/ReservarPage';
import { MisReservasPage } from './pages/cliente/MisReservasPage';

// Auth
import { LoginPage } from './pages/auth/LoginPage';

// Páginas admin (protegidas por rol)
import { GrillaPage } from './pages/admin/GrillaPage';
import { CanchasPage } from './pages/admin/CanchasPage';
import { CajaPage } from './pages/admin/CajaPage';
import { TorneosPage } from './pages/admin/TorneosPage';

export function App() {
  return (
    <Routes>
      {/* Cliente */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reservar" element={<ReservarPage />} />
      <Route path="/mis-reservas" element={<MisReservasPage />} />

      {/* Admin */}
      <Route path="/admin/grilla" element={<GrillaPage />} />
      <Route path="/admin/canchas" element={<CanchasPage />} />
      <Route path="/admin/caja" element={<CajaPage />} />
      <Route path="/admin/torneos" element={<TorneosPage />} />
    </Routes>
  );
}
