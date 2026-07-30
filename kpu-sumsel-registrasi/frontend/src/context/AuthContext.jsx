import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'kpu_auth';
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => sessionStorage.getItem(`${STORAGE_KEY}_token`) || '');
  const [level, setLevel] = useState(() => sessionStorage.getItem(`${STORAGE_KEY}_level`) || '');
  const [acaraId, setAcaraId] = useState(() => sessionStorage.getItem(`${STORAGE_KEY}_acaraId`) || '');

  useEffect(() => {
    if (token) sessionStorage.setItem(`${STORAGE_KEY}_token`, token);
    else sessionStorage.removeItem(`${STORAGE_KEY}_token`);
  }, [token]);

  useEffect(() => {
    if (level) sessionStorage.setItem(`${STORAGE_KEY}_level`, level);
    else sessionStorage.removeItem(`${STORAGE_KEY}_level`);
  }, [level]);

  useEffect(() => {
    if (acaraId) sessionStorage.setItem(`${STORAGE_KEY}_acaraId`, acaraId);
    else sessionStorage.removeItem(`${STORAGE_KEY}_acaraId`);
  }, [acaraId]);

  const login = (jwtToken, lvl, acId) => {
    setToken(jwtToken);
    setLevel(lvl);
    setAcaraId(acId || '');
  };

  const logout = () => {
    setToken('');
    setLevel('');
    setAcaraId('');
    sessionStorage.removeItem(`${STORAGE_KEY}_token`);
    sessionStorage.removeItem(`${STORAGE_KEY}_level`);
    sessionStorage.removeItem(`${STORAGE_KEY}_acaraId`);
  };

  const isAuthenticated = token !== '' && level !== '';

  return (
    <AuthContext.Provider value={{ token, level, acaraId, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
