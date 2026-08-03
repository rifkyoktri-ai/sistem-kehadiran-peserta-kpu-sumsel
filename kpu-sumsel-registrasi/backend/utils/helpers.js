// =============================================================================
// UTILITAS HELPERS — Fungsi-fungsi umum yang digunakan di berbagai controller
// =============================================================================

/**
 * Menghasilkan ID peserta dari nomor urut dan kode acara.
 * @param {number} nomorUrut - Nomor urut peserta
 * @param {string} kodeAcara - Kode unik acara
 * @param {string} tipePeserta - internal/eksternal
 * @returns {string} ID peserta
 */
function generateIdPeserta(nomorUrut, kodeAcara, tipePeserta) {
  const prefixMap = {
    internal: 'KPU-',
    eksternal: 'EKS-'
  };
  const typePrefix = tipePeserta ? prefixMap[tipePeserta] : 'KPU-';
  const eventPrefix = kodeAcara ? `${kodeAcara.trim().toUpperCase()}-` : '';
  return eventPrefix + typePrefix + String(nomorUrut).padStart(4, '0');
}

/**
 * Normalisasi nomor HP Indonesia (format internasional 62xx).
 * - Hapus semua spasi, strip, tanda kurung
 * - Ubah "08xx" jadi "628xx"
 * - Ubah "+628xx" jadi "628xx"
 * - Biarkan "628xx" tetap
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('628')) return digits;
  if (digits.startsWith('62')) return digits;
  return digits;
}

module.exports = { generateIdPeserta, normalizePhone };
