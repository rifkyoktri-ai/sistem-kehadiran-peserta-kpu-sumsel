// =============================================================================
// CONTEXT GLOBAL — State management menggunakan React Context API
// =============================================================================
// Akan diimplementasikan penuh di Prompt 2.
// Placeholder ini menjaga struktur folder tetap sesuai spesifikasi.
// =============================================================================

import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

/**
 * Provider global untuk seluruh aplikasi.
 * Membungkus semua halaman di App.jsx.
 */
export function AppProvider({ children }) {
  // State global akan ditambahkan di Prompt 2
  const [infoPeserta, setInfoPeserta] = useState(null);

  const nilai = {
    infoPeserta,
    setInfoPeserta,
  };

  return <AppContext.Provider value={nilai}>{children}</AppContext.Provider>;
}

/**
 * Hook untuk mengakses context dari komponen manapun.
 */
export function useAppContext() {
  return useContext(AppContext);
}
