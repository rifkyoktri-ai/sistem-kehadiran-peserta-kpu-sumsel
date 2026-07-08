// =============================================================================
// AUTH CONTEXT – Menyimpan password sesi login selama halaman terbuka
// =============================================================================

import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [password, setPassword] = useState('');
  const [level, setLevel] = useState('');

  const login = (pwd, lvl) => {
    setPassword(pwd);
    setLevel(lvl);
  };

  const logout = () => {
    setPassword('');
    setLevel('');
  };

  const isAuthenticated = password !== '' && level !== '';

  return (
    <AuthContext.Provider value={{ password, level, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
