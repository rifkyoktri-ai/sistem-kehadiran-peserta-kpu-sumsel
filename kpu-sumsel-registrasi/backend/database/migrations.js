// =============================================================================
// MIGRASI DATABASE — Pembuatan tabel dan data default
// =============================================================================
// Dijalankan otomatis saat server pertama kali jalan.
// Semua statement menggunakan IF NOT EXISTS agar aman dijalankan berulang kali.
// =============================================================================

const { ambilKoneksiDB } = require('./db');

/**
 * Membuat tabel 'peserta' jika belum ada.
 * Tabel ini menyimpan semua data registrasi peserta acara.
 */
function buatTabelPeserta(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS peserta (
      id              TEXT PRIMARY KEY,
      nomor_urut      INTEGER UNIQUE,
      nama_lengkap    TEXT NOT NULL,
      instansi        TEXT NOT NULL,
      jabatan         TEXT NOT NULL,
      email           TEXT NOT NULL UNIQUE,
      no_hp           TEXT NOT NULL,
      catatan         TEXT DEFAULT '',
      status          TEXT DEFAULT 'terdaftar',
      id_pengganti    TEXT DEFAULT NULL,
      id_digantikan   TEXT DEFAULT NULL,
      waktu_daftar    TEXT NOT NULL,
      waktu_checkin   TEXT DEFAULT NULL,
      petugas_checkin TEXT DEFAULT NULL,
      adalah_walkin   INTEGER DEFAULT 0
    )
  `);
}

/**
 * Membuat tabel 'audit_log' jika belum ada.
 * Tabel ini mencatat semua aksi yang terjadi di sistem untuk keperluan audit.
 */
function buatTabelAuditLog(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      waktu      TEXT NOT NULL,
      aktor      TEXT NOT NULL,
      aksi       TEXT NOT NULL,
      id_peserta TEXT NOT NULL,
      detail     TEXT DEFAULT ''
    )
  `);
}

/**
 * Membuat tabel 'pengaturan_acara' dan mengisi data default jika belum ada.
 * Menggunakan INSERT OR IGNORE agar data default tidak ditimpa.
 */
function buatTabelPengaturanAcara(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS pengaturan_acara (
      kunci TEXT PRIMARY KEY,
      nilai TEXT NOT NULL
    )
  `);

  // Isi data default — gunakan INSERT OR IGNORE agar tidak menimpa yang sudah ada
  const pengaturanDefault = [
    ['nama_acara'          , '[NAMA ACARA]'],
    ['tanggal_acara'       , '[TANGGAL ACARA]'],
    ['waktu_acara'         , '[WAKTU ACARA]'],
    ['lokasi_acara'        , '[LOKASI ACARA]'],
    ['kuota_maksimal'      , '500'],
    ['deadline_registrasi' , ''],
    ['status_registrasi'   , 'buka'],
  ];

  const insertPengaturan = db.prepare(
    'INSERT OR IGNORE INTO pengaturan_acara (kunci, nilai) VALUES (?, ?)'
  );

  const insertBanyak = db.transaction((daftarPengaturan) => {
    for (const [kunci, nilai] of daftarPengaturan) {
      insertPengaturan.run(kunci, nilai);
    }
  });

  insertBanyak(pengaturanDefault);
}

/**
 * Menjalankan semua migrasi secara berurutan.
 * Fungsi ini dipanggil dari server.js saat startup.
 */
function jalankanMigrasi() {
  const db = ambilKoneksiDB();

  console.log('[MIGRASI] Memeriksa dan membuat tabel database...');

  buatTabelPeserta(db);
  buatTabelAuditLog(db);
  buatTabelPengaturanAcara(db);

  console.log('[MIGRASI] Semua tabel berhasil diperiksa/dibuat.');
}

module.exports = { jalankanMigrasi };
