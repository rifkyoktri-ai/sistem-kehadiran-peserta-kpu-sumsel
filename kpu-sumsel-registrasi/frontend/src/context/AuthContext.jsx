import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState('');
  const [level, setLevel] = useState('');
  const [acaraId, setAcaraId] = useState('');

  const login = (jwtToken, lvl, acId) => {
    setToken(jwtToken);
    setLevel(lvl);
    setAcaraId(acId || '');
  };

  const logout = () => {
    setToken('');
    setLevel('');
    setAcaraId('');
  };

  const isAuthenticated = token !== '' && level !== '';

  return (
    <AuthContext.Provider value={{ token, level, acaraId, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);