// =============================================================================
// UTILITAS HELPERS — Fungsi-fungsi umum yang digunakan di berbagai controller
// =============================================================================

const { PREFIX_ID } = require('../constants');

/**
 * Menghasilkan ID peserta dari nomor urut dan kode acara.
 * Format: KODE-ACARA-XXXX atau KPU-SUMSEL-2026-XXXX (fallback)
 * @param {number} nomorUrut - Nomor urut peserta
 * @param {string} kodeAcara - Kode unik acara
 * @returns {string} ID peserta
 */
function generateIdPeserta(nomorUrut, kodeAcara, tipePeserta) {
  const prefixMap = {
    internal: 'KPU-',
    eksternal: 'EKS-'
  };
  const prefix = tipePeserta ? prefixMap[tipePeserta] : (kodeAcara ? `${kodeAcara}-` : PREFIX_ID);
  return prefix + String(nomorUrut).padStart(4, '0');
}

module.exports = { generateIdPeserta };
