import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [acaraAktif, setAcaraAktif] = useState(null);

  const nilai = { acaraAktif, setAcaraAktif };

  return <AppContext.Provider value={nilai}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
