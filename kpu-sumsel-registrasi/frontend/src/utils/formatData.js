// =============================================================================
// UTILITAS FORMAT DATA — helper untuk tampilan data di UI
// =============================================================================

/**
 * Memformat ISO timestamp menjadi format tanggal Indonesia.
 * Contoh: "2026-07-08T10:00:00.000Z" → "08 Juli 2026, 17:00 WIB"
 */
export function formatTanggal(isoString) {
  if (!isoString) return '-';

  return new Date(isoString).toLocaleString('id-ID', {
    day    : '2-digit',
    month  : 'long',
    year   : 'numeric',
    hour   : '2-digit',
    minute : '2-digit',
    timeZone: 'Asia/Jakarta',
  }) + ' WIB';
}

/**
 * Memformat nomor HP menjadi format yang lebih mudah dibaca.
 * Contoh: "081234567890" → "0812-3456-7890"
 */
export function formatNomorHP(noHP) {
  if (!noHP) return '-';
  const bersih = noHP.replace(/\D/g, '');
  return bersih.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
}

/**
 * Menghasilkan nama file yang aman untuk download.
 * Mengganti spasi dengan underscore dan hapus karakter khusus.
 */
export function formatNamaFile(teks) {
  return teks
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}
