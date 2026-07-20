// =============================================================================
// LOGIN PANEL – Komponen login reusable untuk panel internal (petugas & admin)
// =============================================================================

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { AUTH_HEADER } from '@/constants/auth';

/**
 * LoginPanel
 * @param {string} judul - Nama panel (mis: "Panel Petugas Check‑in")
 * @param {function} onLoginBerhasil - Callback dipanggil dengan password saat login sukses
 * @param {string} levelAkses - 'petugas' atau 'admin'
 */
const LoginPanel = ({ judul, onLoginBerhasil, levelAkses }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // endpoint dummy – backend dapat mengubah nama sesuai kebutuhan
      const resp = await fetch(`/api/${levelAkses}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [AUTH_HEADER]: password,
        },
        body: JSON.stringify({}),
      });
      if (resp.status === 401) {
        setError('Password salah. Silakan coba lagi.');
        return;
      }
      if (!resp.ok) {
        setError('Terjadi kesalahan, coba lagi nanti.');
        return;
      }
      // login berhasil – simpan password di state lokal dan panggil callback
      setLoggedIn(true);
      onLoginBerhasil(password);
    } catch (err) {
      console.error(err);
      setError('Tidak dapat terhubung ke server.');
    }
  };

  const handleLogout = () => {
    setPassword('');
    setLoggedIn(false);
    setError('');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-center" style={{ color: '#6B0F1A' }}>
        {judul}
      </h2>
      {loggedIn ? (
        <div className="text-center">
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          >
            Keluar
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
          >
            Masuk
          </button>
        </form>
      )}
    </div>
  );
};

LoginPanel.propTypes = {
  judul: PropTypes.string.isRequired,
  onLoginBerhasil: PropTypes.func.isRequired,
  levelAkses: PropTypes.oneOf(['petugas', 'admin']).isRequired,
};

export default LoginPanel;
