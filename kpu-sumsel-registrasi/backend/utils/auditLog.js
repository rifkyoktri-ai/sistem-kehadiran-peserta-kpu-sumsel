// =============================================================================
// UTILITAS AUDIT LOG — Fungsi pencatatan log terpusat
// =============================================================================

const { ambilKoneksiDB } = require('../database/db');

/**
 * Mencatat aksi ke tabel audit_log.
 * @param {object} db - Koneksi database (opsional, jika tidak disediakan akan diambil otomatis)
 * @param {string} aktor - Siapa yang melakukan aksi ('sistem', 'petugas', 'admin')
 * @param {string} aksi - Kode aksi (dari AKSI_LOG)
 * @param {string} idPeserta - ID peserta yang terkait
 * @param {string} detail - Detail tambahan (JSON string)
 * @param {string} acaraId - ID acara yang terkait (opsional)
 */
function catatAuditLog(db, aktor, aksi, idPeserta, detail = '', acaraId = null) {
  if (!db) db = ambilKoneksiDB();
  db.prepare(`
    INSERT INTO audit_log (waktu, aktor, aksi, id_peserta, detail, acara_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(new Date().toISOString(), aktor, aksi, idPeserta, detail, acaraId);
}

module.exports = { catatAuditLog };
