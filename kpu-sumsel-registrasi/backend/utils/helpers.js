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

function menentukanKategoriInstansi(instansi) {
  const { VALID_INSTANSI, VALID_INSTANSI_EKSTERNAL } = require('../constants');
  const upper = (instansi || '').toUpperCase().trim();
  const setInternal = new Set(
    VALID_INSTANSI.filter(i => i !== 'Lainnya').map(i => i.toUpperCase())
  );
  const setEksternal = new Set(
    VALID_INSTANSI_EKSTERNAL.filter(i => i !== 'Lainnya').map(i => i.toUpperCase())
  );
  if (setInternal.has(upper)) return 'internal_kpu';
  if (setEksternal.has(upper)) return 'eksternal';
  return 'lainnya';
}

/**
 * Mendapatkan stempel waktu saat ini terformat YYYY-MM-DD HH:mm:ss pada zona Asia/Jakarta (WIB).
 */
function getWaktuWIB() {
  const d = new Date();
  const options = { timeZone: 'Asia/Jakarta', hour12: false };
  
  const tahun = d.toLocaleString('en-US', { ...options, year: 'numeric' });
  const bulan = String(d.toLocaleString('en-US', { ...options, month: 'numeric' })).padStart(2, '0');
  const tanggal = String(d.toLocaleString('en-US', { ...options, day: 'numeric' })).padStart(2, '0');
  
  const jamVal = d.toLocaleString('en-US', { ...options, hour: 'numeric' });
  const jam = String(jamVal === '24' ? '00' : jamVal).padStart(2, '0');
  const menit = String(d.toLocaleString('en-US', { ...options, minute: 'numeric' })).padStart(2, '0');
  const detik = String(d.toLocaleString('en-US', { ...options, second: 'numeric' })).padStart(2, '0');
  
  return `${tahun}-${bulan}-${tanggal} ${jam}:${menit}:${detik}`;
}

module.exports = { generateIdPeserta, normalizePhone, menentukanKategoriInstansi, getWaktuWIB };
