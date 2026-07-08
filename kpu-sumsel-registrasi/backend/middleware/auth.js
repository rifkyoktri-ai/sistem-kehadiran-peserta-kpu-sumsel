// =============================================================================
// MIDDLEWARE AUTENTIKASI — Sistem Registrasi KPU Provinsi Sumatera Selatan
// =============================================================================
// Password dikirim via HTTP header: x-password
// Level akses:
//   - petugas : dapat mengakses endpoint check-in
//   - admin   : dapat mengakses semua endpoint termasuk manajemen data
// =============================================================================

const { PASSWORD_PETUGAS, PASSWORD_ADMIN } = require('../constants');

/**
 * Memformat response penolakan autentikasi secara konsisten.
 */
function tolakAkses(res) {
  return res.status(401).json({
    sukses: false,
    pesan : 'Akses ditolak. Password tidak valid.',
    data  : null,
  });
}

/**
 * Middleware untuk endpoint level petugas.
 * Menerima password petugas ATAU password admin.
 * Admin dapat mengakses semua yang bisa diakses petugas.
 */
function authPetugas(req, res, next) {
  const passwordDiterima = req.headers['x-password'];

  const passwordValid =
    passwordDiterima === PASSWORD_PETUGAS ||
    passwordDiterima === PASSWORD_ADMIN;

  if (!passwordValid) {
    return tolakAkses(res);
  }

  // Tandai siapa yang mengakses (untuk keperluan audit log)
  req.aktor = passwordDiterima === PASSWORD_ADMIN ? 'admin' : 'petugas';

  return next();
}

/**
 * Middleware untuk endpoint level admin.
 * Hanya menerima password admin.
 */
function authAdmin(req, res, next) {
  const passwordDiterima = req.headers['x-password'];

  if (passwordDiterima !== PASSWORD_ADMIN) {
    return tolakAkses(res);
  }

  req.aktor = 'admin';

  return next();
}

module.exports = { authPetugas, authAdmin };
