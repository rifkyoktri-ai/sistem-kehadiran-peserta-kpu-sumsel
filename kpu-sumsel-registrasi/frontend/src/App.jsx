// =============================================================================
// APP.JSX — Routing utama aplikasi
// =============================================================================

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import Registrasi from './pages/Registrasi';
import Konfirmasi from './pages/Konfirmasi';
import CekStatus  from './pages/CekStatus';
import CheckIn    from './pages/CheckIn';
import Admin      from './pages/Admin';

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"                  element={<Registrasi />} />
            <Route path="/konfirmasi/:id"     element={<Konfirmasi />} />
            <Route path="/cek-status"        element={<CekStatus />} />
            <Route path="/checkin"           element={<CheckIn />} />
            <Route path="/admin"             element={<Admin />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppProvider>
  );
}
