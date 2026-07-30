// =============================================================================
// APP.JSX — Routing utama aplikasi
// =============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Registrasi from './pages/Registrasi';
import Konfirmasi from './pages/Konfirmasi';
import CekStatus  from './pages/CekStatus';
import CheckIn    from './pages/CheckIn';
import MobileCheckin from './pages/MobileCheckin';
import Admin      from './pages/Admin';

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF2F7] px-4">
      <div className="text-center">
        <div className="text-8xl font-bold text-[#6B0F1A] mb-4 font-display">404</div>
        <h2 className="text-2xl font-bold text-[#3A0708] mb-2 font-display">Halaman Tidak Ditemukan</h2>
        <p className="text-[#5A6A8A] font-body mb-6">Halaman yang Anda cari tidak tersedia.</p>
        <a href="/" className="btn-kpu inline-block">Kembali ke Beranda</a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <Routes>
              <Route path="/"                  element={<Registrasi />} />
              <Route path="/konfirmasi/:id"     element={<Konfirmasi />} />
              <Route path="/cek-status"        element={<CekStatus />} />
              <Route path="/checkin"           element={<CheckIn />} />
              <Route path="/admin"             element={<Admin />} />
              <Route path="/mobile-checkin"    element={<MobileCheckin />} />
              <Route path="*"                  element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </AppProvider>
  );
}
