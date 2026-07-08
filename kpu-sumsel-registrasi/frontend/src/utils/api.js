// =============================================================================
// API UTILS – Wrapper fetch dengan header otentikasi
// =============================================================================

import { AUTH_HEADER } from '@/constants/auth';
import { useAuth } from '@/context/AuthContext';

/**
 * getAuthHeader – mengembalikan header otentikasi berdasarkan password dari context
 */
export const getAuthHeader = () => {
  // Hook cannot be used outside component, so we expose a function that expects password
  // In components we will call useAuth() to get password and pass to this helper.
  return {};
};

/**
 * apiRequest – wrapper fetch yang menambahkan header x-password dan handling error.
 * @param {string} method HTTP method (GET, POST, PUT, DELETE)
 * @param {string} url endpoint relatif (mis: '/api/checkin/validasi')
 * @param {object} body payload (akan di-JSON.stringify) atau null
 * @param {string} password password otentikasi
 */
export const apiRequest = async (method, url, body, password) => {
  const headers = {
    'Content-Type': 'application/json',
    [AUTH_HEADER]: password,
  };
  const options = {
    method,
    headers,
    credentials: 'include',
  };
  if (body) options.body = JSON.stringify(body);
  const resp = await fetch(url, options);
  if (resp.status === 401) {
    throw new Error('401');
  }
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(txt || resp.statusText);
  }
  return resp.json();
};
