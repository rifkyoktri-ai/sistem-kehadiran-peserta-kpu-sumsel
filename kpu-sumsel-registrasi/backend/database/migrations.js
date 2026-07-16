// =============================================================================
// MIGRASI DATABASE — Pembuatan tabel, index, dan migrasi skema multi-acara
// =============================================================================

const fs = require('fs');
const path = require('path');
const { ambilKoneksiDB } = require('./db');

/**
 * Membuat tabel 'acara' jika belum ada.
 */
function buatTabelAcara(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS acara (
      id                  TEXT PRIMARY KEY,
      kode_acara          TEXT UNIQUE NOT NULL,
      nama_acara          TEXT NOT NULL,
      tanggal_acara       TEXT NOT NULL,
      waktu_acara         TEXT NOT NULL,
      lokasi_acara        TEXT NOT NULL,
      kuota_maksimal      INTEGER DEFAULT 500,
      deadline_registrasi TEXT DEFAULT '',
      status_registrasi   TEXT DEFAULT 'buka',
      password_petugas    TEXT NOT NULL,
      waktu_dibuat        TEXT NOT NULL
    )
  `);
}

/**
 * Melakukan backup file database sebelum migrasi destruktif.
 */
function backupDatabaseLama(lokasiDb) {
  try {
    if (fs.existsSync(lokasiDb)) {
      const lokasiBackup = lokasiDb + '.bak';
      fs.copyFileSync(lokasiDb, lokasiBackup);
      console.log(`[MIGRASI] Backup database berhasil dibuat di: ${lokasiBackup}`);
    }
  } catch (err) {
    console.error('[MIGRASI] Gagal membuat backup database:', err.message);
  }
}

/**
 * Menjalankan migrasi skema database utama.
 */
function jalankanMigrasi() {
  const db = ambilKoneksiDB();
  const lokasiDb = db._lokasiDb;

  console.log('[MIGRASI] Memeriksa dan memigrasi tabel database...');

  // 1. Buat tabel acara terlebih dahulu
  buatTabelAcara(db);

  // 2. Periksa apakah tabel peserta sudah ada
  let tabelPesertaAda = false;
  let sudahMultiAcara = false;

  try {
    const infoPeserta = db.prepare('PRAGMA table_info(peserta)').all();
    if (infoPeserta.length > 0) {
      tabelPesertaAda = true;
      sudahMultiAcara = infoPeserta.some(col => col.name === 'acara_id');
    }
  } catch (_) {
    tabelPesertaAda = false;
  }

  if (tabelPesertaAda && !sudahMultiAcara) {
    console.log('[MIGRASI] Terdeteksi database versi lama. Memulai migrasi ke multi-acara...');
    backupDatabaseLama(lokasiDb);

    db.transaction(() => {
      // Ambil data pengaturan lama untuk dijadikan acara default
      const rowsPengaturan = db.prepare('SELECT kunci, nilai FROM pengaturan_acara').all();
      const oldSettings = Object.fromEntries(rowsPengaturan.map(r => [r.kunci, r.nilai]));

      const namaAcara = oldSettings.nama_acara || 'Acara KPU Provinsi Sumatera Selatan';
      const tanggalAcara = oldSettings.tanggal_acara || new Date().toISOString().slice(0, 10);
      const waktuAcara = oldSettings.waktu_acara || '08:00';
      const lokasiAcara = oldSettings.lokasi_acara || 'Kantor KPU Sumsel';
      const kuotaMaksimal = parseInt(oldSettings.kuota_maksimal || '500', 10);
      const deadlineRegistrasi = oldSettings.deadline_registrasi || '';
      const statusRegistrasi = oldSettings.status_registrasi || 'buka';
      const passwordPetugas = process.env.PASSWORD_PETUGAS || 'KPU2026checkin';
      const waktuDibuat = new Date().toISOString();

      // Insert default event
      db.prepare(`
        INSERT OR IGNORE INTO acara (id, kode_acara, nama_acara, tanggal_acara, waktu_acara, lokasi_acara, kuota_maksimal, deadline_registrasi, status_registrasi, password_petugas, waktu_dibuat)
        VALUES ('ACR-DEFAULT', 'DEFAULT', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(namaAcara, tanggalAcara, waktuAcara, lokasiAcara, kuotaMaksimal, deadlineRegistrasi, statusRegistrasi, passwordPetugas, waktuDibuat);

      // Buat peserta_temp baru
      db.exec(`
        CREATE TABLE peserta_temp (
          id              TEXT PRIMARY KEY,
          acara_id        TEXT NOT NULL REFERENCES acara(id) ON DELETE CASCADE,
          nomor_urut      INTEGER NOT NULL,
          nama_lengkap    TEXT NOT NULL,
          instansi        TEXT NOT NULL,
          jabatan         TEXT NOT NULL,
          email           TEXT NOT NULL,
          no_hp           TEXT NOT NULL,
          catatan         TEXT DEFAULT '',
          status          TEXT DEFAULT 'terdaftar',
          id_pengganti    TEXT DEFAULT NULL,
          id_digantikan   TEXT DEFAULT NULL,
          waktu_daftar    TEXT NOT NULL,
          waktu_checkin   TEXT DEFAULT NULL,
          petugas_checkin TEXT DEFAULT NULL,
          adalah_walkin   INTEGER DEFAULT 0,
          UNIQUE(acara_id, nomor_urut),
          UNIQUE(acara_id, email)
        )
      `);

      // Salin data ke peserta_temp
      db.exec(`
        INSERT INTO peserta_temp (id, acara_id, nomor_urut, nama_lengkap, instansi, jabatan, email, no_hp, catatan, status, id_pengganti, id_digantikan, waktu_daftar, waktu_checkin, petugas_checkin, adalah_walkin)
        SELECT id, 'ACR-DEFAULT', nomor_urut, nama_lengkap, instansi, jabatan, email, no_hp, catatan, status, id_pengganti, id_digantikan, waktu_daftar, waktu_checkin, petugas_checkin, adalah_walkin
        FROM peserta
      `);

      // Buat audit_log_temp baru
      db.exec(`
        CREATE TABLE audit_log_temp (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          acara_id   TEXT REFERENCES acara(id) ON DELETE CASCADE,
          waktu      TEXT NOT NULL,
          aktor      TEXT NOT NULL,
          aksi       TEXT NOT NULL,
          id_peserta TEXT NOT NULL,
          detail     TEXT DEFAULT ''
        )
      `);

      // Salin audit log ke audit_log_temp
      db.exec(`
        INSERT INTO audit_log_temp (id, acara_id, waktu, aktor, aksi, id_peserta, detail)
        SELECT id, 'ACR-DEFAULT', waktu, aktor, aksi, id_peserta, detail
        FROM audit_log
      `);

      // Drop tabel lama
      db.exec('DROP TABLE peserta');
      db.exec('DROP TABLE audit_log');

      // Rename tabel temp ke tabel utama
      db.exec('ALTER TABLE peserta_temp RENAME TO peserta');
      db.exec('ALTER TABLE audit_log_temp RENAME TO audit_log');

      // Reset pengaturan_acara menjadi link acara aktif saja
      db.exec('DROP TABLE pengaturan_acara');
      db.exec(`
        CREATE TABLE pengaturan_acara (
          kunci TEXT PRIMARY KEY,
          nilai TEXT NOT NULL
        )
      `);
      db.prepare("INSERT INTO pengaturan_acara (kunci, nilai) VALUES ('id_acara_aktif', 'ACR-DEFAULT')").run();
    })();

    console.log('[MIGRASI] Skema database berhasil dimigrasi ke versi multi-acara.');

  } else if (!tabelPesertaAda) {
    console.log('[MIGRASI] Database kosong. Memulai pembuatan skema baru...');

    db.transaction(() => {
      // 1. Buat event default
      const namaAcara = 'Pilkada Sumsel 2026';
      const tanggalAcara = new Date().toISOString().slice(0, 10);
      const waktuAcara = '08:00';
      const lokasiAcara = 'Aula KPU Provinsi Sumatera Selatan';
      const kuotaMaksimal = 500;
      const passwordPetugas = process.env.PASSWORD_PETUGAS || 'KPU2026checkin';
      const waktuDibuat = new Date().toISOString();

      db.prepare(`
        INSERT OR IGNORE INTO acara (id, kode_acara, nama_acara, tanggal_acara, waktu_acara, lokasi_acara, kuota_maksimal, deadline_registrasi, status_registrasi, password_petugas, waktu_dibuat)
        VALUES ('ACR-DEFAULT', 'DEFAULT', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(namaAcara, tanggalAcara, waktuAcara, lokasiAcara, kuotaMaksimal, '', 'buka', passwordPetugas, waktuDibuat);

      // 2. Buat tabel peserta baru
      db.exec(`
        CREATE TABLE peserta (
          id              TEXT PRIMARY KEY,
          acara_id        TEXT NOT NULL REFERENCES acara(id) ON DELETE CASCADE,
          nomor_urut      INTEGER NOT NULL,
          nama_lengkap    TEXT NOT NULL,
          instansi        TEXT NOT NULL,
          jabatan         TEXT NOT NULL,
          email           TEXT NOT NULL,
          no_hp           TEXT NOT NULL,
          catatan         TEXT DEFAULT '',
          status          TEXT DEFAULT 'terdaftar',
          id_pengganti    TEXT DEFAULT NULL,
          id_digantikan   TEXT DEFAULT NULL,
          waktu_daftar    TEXT NOT NULL,
          waktu_checkin   TEXT DEFAULT NULL,
          petugas_checkin TEXT DEFAULT NULL,
          adalah_walkin   INTEGER DEFAULT 0,
          UNIQUE(acara_id, nomor_urut),
          UNIQUE(acara_id, email)
        )
      `);

      // 3. Buat tabel audit_log baru
      db.exec(`
        CREATE TABLE audit_log (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          acara_id   TEXT REFERENCES acara(id) ON DELETE CASCADE,
          waktu      TEXT NOT NULL,
          aktor      TEXT NOT NULL,
          aksi       TEXT NOT NULL,
          id_peserta TEXT NOT NULL,
          detail     TEXT DEFAULT ''
        )
      `);

      // 4. Buat tabel pengaturan_acara baru
      db.exec(`
        CREATE TABLE pengaturan_acara (
          kunci TEXT PRIMARY KEY,
          nilai TEXT NOT NULL
        )
      `);
      db.prepare("INSERT INTO pengaturan_acara (kunci, nilai) VALUES ('id_acara_aktif', 'ACR-DEFAULT')").run();
    })();
    console.log('[MIGRASI] Skema baru multi-acara berhasil dibuat.');
  }

  // Migrasi: tambah kolom tipe_peserta jika belum ada
  try {
    const colsPeserta = db.prepare('PRAGMA table_info(peserta)').all();
    const sudahAdaTipe = colsPeserta.some(c => c.name === 'tipe_peserta');
    if (!sudahAdaTipe) {
      db.exec("ALTER TABLE peserta ADD COLUMN tipe_peserta TEXT NOT NULL DEFAULT 'internal'");
      console.log('[MIGRASI] Kolom tipe_peserta berhasil ditambahkan ke tabel peserta.');
    }
  } catch (err) {
    console.error('[MIGRASI] Gagal menambah kolom tipe_peserta:', err.message);
  }

  // Migrasi: tambah kolom foto_path jika belum ada
  try {
    const colsPeserta2 = db.prepare('PRAGMA table_info(peserta)').all();
    const sudahAdaFoto = colsPeserta2.some(c => c.name === 'foto_path');
    if (!sudahAdaFoto) {
      db.exec("ALTER TABLE peserta ADD COLUMN foto_path TEXT DEFAULT NULL");
      console.log('[MIGRASI] Kolom foto_path berhasil ditambahkan ke tabel peserta.');
    }
  } catch (err) {
    console.error('[MIGRASI] Gagal menambah kolom foto_path:', err.message);
  }

  // Aktifkan foreign keys & buat index
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_email ON peserta(email)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_status ON peserta(status)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_nomor_urut ON peserta(nomor_urut)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_acara ON peserta(acara_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_tipe ON peserta(tipe_peserta)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_log_peserta ON audit_log(id_peserta)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_log_aksi ON audit_log(aksi)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_log_acara ON audit_log(acara_id)');

  console.log('[MIGRASI] Semua prasyarat, index, dan foreign key berhasil diperiksa.');
}

module.exports = { jalankanMigrasi };
