// =============================================================================
// MIDDLEWARE AUTENTIKASI — Dual auth: JWT (Bearer) + Password header (legacy)
// =============================================================================

const { ambilKoneksiDB } = require('../database/db');
const { PASSWORD_ADMIN } = require('../constants');
const { verifikasiToken } = require('../utils/jwt');

function tolakAkses(res) {
  return res.status(401).json({
    sukses: false,
    pesan: 'Akses ditolak. Token atau password tidak valid.',
    data: null,
  });
}

/**
 * Mencoba autentikasi via JWT Bearer token.
 * Mengembalikan { aktor, acaraId } jika sukses, atau null.
 */
function cobaJwt(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const payload = verifikasiToken(authHeader.slice(7));
    return { aktor: payload.aktor, acaraId: payload.acara_id || null };
  } catch {
    return null;
  }
}

/**
 * Mencoba autentikasi via x-password header (legacy).
 */
function cobaPasswordPetugas(req) {
  const passwordDiterima = req.headers['x-password'];
  const acaraIdDiterima = req.headers['x-acara-id'];
  if (!passwordDiterima || !acaraIdDiterima) return null;

  if (passwordDiterima === PASSWORD_ADMIN) {
    return { aktor: 'admin', acaraId: acaraIdDiterima || null };
  }

  try {
    const db = ambilKoneksiDB();
    const acara = db.prepare('SELECT password_petugas FROM acara WHERE id = ?').get(acaraIdDiterima);
    if (acara && passwordDiterima === acara.password_petugas) {
      return { aktor: 'petugas', acaraId: acaraIdDiterima };
    }
  } catch { /* lanjut ke tolak */ }
  return null;
}

function authPetugas(req, res, next) {
  const jwtResult = cobaJwt(req);
  if (jwtResult) {
    req.aktor = jwtResult.aktor;
    // Use acara_id from JWT, but fallback to x-acara-id header if JWT doesn't have it
    req.acaraId = jwtResult.acaraId || req.headers['x-acara-id'] || null;
    return next();
  }

  const pwdResult = cobaPasswordPetugas(req);
  if (pwdResult) {
    req.aktor = pwdResult.aktor;
    req.acaraId = pwdResult.acaraId;
    return next();
  }

  return tolakAkses(res);
}

function authAdmin(req, res, next) {
  const jwtResult = cobaJwt(req);
  if (jwtResult && jwtResult.aktor === 'admin') {
    req.aktor = 'admin';
    return next();
  }

  const passwordDiterima = req.headers['x-password'];
  if (passwordDiterima && passwordDiterima === PASSWORD_ADMIN) {
    req.aktor = 'admin';
    return next();
  }

  return tolakAkses(res);
}

module.exports = { authPetugas, authAdmin };
