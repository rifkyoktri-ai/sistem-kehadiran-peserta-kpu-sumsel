// =============================================================================
// UTILITAS JWT — Pembuatan & verifikasi token autentikasi
// =============================================================================

const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRY } = require('../constants');

function buatToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifikasiToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { buatToken, verifikasiToken };
