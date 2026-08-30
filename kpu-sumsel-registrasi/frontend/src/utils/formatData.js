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
