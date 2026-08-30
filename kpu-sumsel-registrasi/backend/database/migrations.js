// =============================================================================
// MIGRASI DATABASE — Pembuatan tabel, index, dan migrasi skema multi-acara
// =============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { ambilKoneksiDB } = require('./db');
const logger = require('../utils/logger');

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
      logger.info(`[MIGRASI] Backup database berhasil dibuat di: ${lokasiBackup}`);
    }
  } catch (err) {
    logger.error('[MIGRASI] Gagal membuat backup database:', err.message);
  }
}

/**
 * Menjalankan migrasi skema database utama.
 */
function jalankanMigrasi() {
  const db = ambilKoneksiDB();
  const lokasiDb = db._lokasiDb;

  logger.info('[MIGRASI] Memeriksa dan memigrasi tabel database...');

  // 1. Buat tabel acara terlebih dahulu
  buatTabelAcara(db);

  // 2. Periksa apakah tabel peserta sudah ada
  let tabelPesertaAda = false;
  let sudahMultiAcara = false;

  const USE_POSTGRES = Boolean(process.env.DATABASE_URL);

  try {
    if (USE_POSTGRES) {
      const row = db.prepare(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'peserta'
        ) AS exists
      `).get();
      tabelPesertaAda = row && (row.exists === true || row.exists === 'true' || row.exists === 1);
      
      if (tabelPesertaAda) {
        const colRow = db.prepare(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'peserta' AND column_name = 'acara_id'
          ) AS exists
        `).get();
        sudahMultiAcara = colRow && (colRow.exists === true || colRow.exists === 'true' || colRow.exists === 1);
      }
    } else {
      const infoPeserta = db.prepare('PRAGMA table_info(peserta)').all();
      if (infoPeserta.length > 0) {
        tabelPesertaAda = true;
        sudahMultiAcara = infoPeserta.some(col => col.name === 'acara_id');
      }
    }
  } catch (_) {
    tabelPesertaAda = false;
  }

  if (tabelPesertaAda && !sudahMultiAcara) {
    logger.info('[MIGRASI] Terdeteksi database versi lama. Memulai migrasi ke multi-acara...');
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
      const passwordPetugas = process.env.PASSWORD_PETUGAS || crypto.randomBytes(16).toString('hex');
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
          nomor_urut      TEXT NOT NULL,
          nama_lengkap    TEXT NOT NULL,
          instansi        TEXT NOT NULL,
          jabatan         TEXT NOT NULL,
          email           TEXT DEFAULT NULL,
          no_hp           TEXT NOT NULL,
          catatan         TEXT DEFAULT '',
          status          TEXT DEFAULT 'terdaftar',
          id_pengganti    TEXT DEFAULT NULL,
          id_digantikan   TEXT DEFAULT NULL,
          waktu_daftar    TEXT NOT NULL,
          waktu_checkin   TEXT DEFAULT NULL,
          petugas_checkin TEXT DEFAULT NULL,
          adalah_walkin   INTEGER DEFAULT 0,
          UNIQUE(acara_id, nomor_urut)
        )
      `);



      // Salin data ke peserta_temp
      db.exec(`
        INSERT INTO peserta_temp (id, acara_id, nomor_urut, nama_lengkap, instansi, jabatan, email, no_hp, catatan, status, id_pengganti, id_digantikan, waktu_daftar, waktu_checkin, petugas_checkin, adalah_walkin)
        SELECT id, 'ACR-DEFAULT', nomor_urut, nama_lengkap, instansi, jabatan, email, no_hp, catatan, status, id_pengganti, id_digantikan, waktu_daftar, waktu_checkin, petugas_checkin, adalah_walkin
        FROM peserta
      `);

      // Buat audit_log_temp baru
      if (USE_POSTGRES) {
        db.exec(`
          CREATE TABLE audit_log_temp (
            id         SERIAL PRIMARY KEY,
            acara_id   TEXT REFERENCES acara(id) ON DELETE CASCADE,
            waktu      TEXT NOT NULL,
            aktor      TEXT NOT NULL,
            aksi       TEXT NOT NULL,
            id_peserta TEXT NOT NULL,
            detail     TEXT DEFAULT ''
          )
        `);
      } else {
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
      }

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

    logger.info('[MIGRASI] Skema database berhasil dimigrasi ke versi multi-acara.');

  } else if (!tabelPesertaAda) {
    logger.info('[MIGRASI] Database kosong. Memulai pembuatan skema baru...');

    db.transaction(() => {
      // 1. Buat event default
      const namaAcara = 'Pilkada Sumsel 2026';
      const tanggalAcara = new Date().toISOString().slice(0, 10);
      const waktuAcara = '08:00';
      const lokasiAcara = 'Aula KPU Provinsi Sumatera Selatan';
      const kuotaMaksimal = 500;
      const passwordPetugas = process.env.PASSWORD_PETUGAS || crypto.randomBytes(16).toString('hex');
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
          nomor_urut      TEXT NOT NULL,
          nama_lengkap    TEXT NOT NULL,
          instansi        TEXT NOT NULL,
          jabatan         TEXT NOT NULL,
          email           TEXT DEFAULT NULL,
          no_hp           TEXT NOT NULL,
          catatan         TEXT DEFAULT '',
          status          TEXT DEFAULT 'terdaftar',
          id_pengganti    TEXT DEFAULT NULL,
          id_digantikan   TEXT DEFAULT NULL,
          waktu_daftar    TEXT NOT NULL,
          waktu_checkin   TEXT DEFAULT NULL,
          petugas_checkin TEXT DEFAULT NULL,
          adalah_walkin   INTEGER DEFAULT 0,
          UNIQUE(acara_id, nomor_urut)
        )
      `);

      // 3. Buat tabel audit_log baru
      if (USE_POSTGRES) {
        db.exec(`
          CREATE TABLE audit_log (
            id         SERIAL PRIMARY KEY,
            acara_id   TEXT REFERENCES acara(id) ON DELETE CASCADE,
            waktu      TEXT NOT NULL,
            aktor      TEXT NOT NULL,
            aksi       TEXT NOT NULL,
            id_peserta TEXT NOT NULL,
            detail     TEXT DEFAULT ''
          )
        `);
      } else {
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
      }

      // 4. Buat tabel pengaturan_acara baru
      db.exec(`
        CREATE TABLE pengaturan_acara (
          kunci TEXT PRIMARY KEY,
          nilai TEXT NOT NULL
        )
      `);
      db.prepare("INSERT INTO pengaturan_acara (kunci, nilai) VALUES ('id_acara_aktif', 'ACR-DEFAULT')").run();
    })();
    logger.info('[MIGRASI] Skema baru multi-acara berhasil dibuat.');
  }

  // Migrasi: tambah kolom tipe_peserta jika belum ada
  try {
    const colsPeserta = db.prepare('PRAGMA table_info(peserta)').all();
    const sudahAdaTipe = colsPeserta.some(c => c.name === 'tipe_peserta');
    if (!sudahAdaTipe) {
      db.exec("ALTER TABLE peserta ADD COLUMN tipe_peserta TEXT NOT NULL DEFAULT 'internal'");
      logger.info('[MIGRASI] Kolom tipe_peserta berhasil ditambahkan ke tabel peserta.');
    }
  } catch (err) {
    logger.error('[MIGRASI] Gagal menambah kolom tipe_peserta:', err.message);
  }

  // Migrasi: tambah kolom kategori_instansi jika belum ada
  try {
    const colsPesertaInfo = db.prepare('PRAGMA table_info(peserta)').all();
    const sudahAdaKategori = colsPesertaInfo.some(c => c.name === 'kategori_instansi');
    if (!sudahAdaKategori) {
      db.exec("ALTER TABLE peserta ADD COLUMN kategori_instansi TEXT DEFAULT 'internal_kpu'");
      logger.info('[MIGRASI] Kolom kategori_instansi berhasil ditambahkan ke tabel peserta.');

      // Isi data untuk peserta yang sudah ada berdasarkan constants
      const { VALID_INSTANSI, VALID_INSTANSI_EKSTERNAL } = require('../constants');
      const setInternal = new Set(VALID_INSTANSI.filter(i => i !== 'Lainnya').map(i => i.toUpperCase()));
      const setEksternal = new Set(VALID_INSTANSI_EKSTERNAL.filter(i => i !== 'Lainnya').map(i => i.toUpperCase()));

      const semuaPeserta = db.prepare('SELECT id, instansi FROM peserta').all();
      const stmtUpdate = db.prepare('UPDATE peserta SET kategori_instansi = ? WHERE id = ?');

      db.transaction(() => {
        let jumlahInternal = 0;
        let jumlahEksternal = 0;
        let jumlahLainnya = 0;

        for (const p of semuaPeserta) {
          const instansiUpper = (p.instansi || '').toUpperCase().trim();
          let kategori;
          if (setInternal.has(instansiUpper)) {
            kategori = 'internal_kpu';
            jumlahInternal++;
          } else if (setEksternal.has(instansiUpper)) {
            kategori = 'eksternal';
            jumlahEksternal++;
          } else {
            kategori = 'lainnya';
            jumlahLainnya++;
          }
          stmtUpdate.run(kategori, p.id);
        }

        logger.info(`[MIGRASI] Selesai mengisi kategori_instansi: internal_kpu: ${jumlahInternal}, eksternal: ${jumlahEksternal}, lainnya: ${jumlahLainnya}`);
      })();
    }
  } catch (err) {
    logger.error('[MIGRASI] Gagal menambah kolom kategori_instansi:', err.message);
  }

  // Migrasi: tambah kolom foto_path jika belum ada
  try {
    const colsPeserta2 = db.prepare('PRAGMA table_info(peserta)').all();
    const sudahAdaFoto = colsPeserta2.some(c => c.name === 'foto_path');
    if (!sudahAdaFoto) {
      db.exec("ALTER TABLE peserta ADD COLUMN foto_path TEXT DEFAULT NULL");
      logger.info('[MIGRASI] Kolom foto_path berhasil ditambahkan ke tabel peserta.');
    }
  } catch (err) {
    logger.error('[MIGRASI] Gagal menambah kolom foto_path:', err.message);
  }

  // Migrasi: tambah kolom email_status & email_terakhir_dicoba jika belum ada
  try {
    const colsPeserta3 = db.prepare('PRAGMA table_info(peserta)').all();
    const sudahAdaEmailStatus = colsPeserta3.some(c => c.name === 'email_status');
    const sudahAdaEmailDicoba = colsPeserta3.some(c => c.name === 'email_terakhir_dicoba');
    if (!sudahAdaEmailStatus || !sudahAdaEmailDicoba) {
      backupDatabaseLama(lokasiDb);
    }
    if (!sudahAdaEmailStatus) {
      db.exec("ALTER TABLE peserta ADD COLUMN email_status TEXT NOT NULL DEFAULT 'tidak_ada_email'");
      logger.info('[MIGRASI] Kolom email_status berhasil ditambahkan ke tabel peserta.');
    }
    if (!sudahAdaEmailDicoba) {
      db.exec("ALTER TABLE peserta ADD COLUMN email_terakhir_dicoba TEXT DEFAULT NULL");
      logger.info('[MIGRASI] Kolom email_terakhir_dicoba berhasil ditambahkan ke tabel peserta.');
    }
  } catch (err) {
    logger.error('[MIGRASI] Gagal menambah kolom email:', err.message);
  }

  // Migrasi: partial unique index untuk email (mencegah duplikat email dalam satu acara)
  try {
    let indexAda = false;
    if (USE_POSTGRES) {
      const row = db.prepare("SELECT indexname AS name FROM pg_indexes WHERE indexname = 'idx_peserta_email_unique'").get();
      indexAda = Boolean(row);
    } else {
      const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_peserta_email_unique'").get();
      indexAda = Boolean(row);
    }
    
    if (!indexAda) {
      db.exec("CREATE UNIQUE INDEX idx_peserta_email_unique ON peserta(acara_id, email) WHERE email IS NOT NULL AND email != ''");
      logger.info('[MIGRASI] Partial unique index idx_peserta_email_unique berhasil diperiksa/ditambahkan.');
    }
  } catch (err) {
    logger.error('[MIGRASI] Gagal menambah partial unique index email:', err.message);
  }

  // Migrasi: tambah kolom dihapus_pada & dihapus_oleh untuk soft delete
  try {
    const colsPesertaSD = db.prepare('PRAGMA table_info(peserta)').all();
    if (!colsPesertaSD.some(c => c.name === 'dihapus_pada')) {
      db.exec("ALTER TABLE peserta ADD COLUMN dihapus_pada TEXT DEFAULT NULL");
      logger.info('[MIGRASI] Kolom dihapus_pada berhasil ditambahkan ke tabel peserta.');
    }
    if (!colsPesertaSD.some(c => c.name === 'dihapus_oleh')) {
      db.exec("ALTER TABLE peserta ADD COLUMN dihapus_oleh TEXT DEFAULT NULL");
      logger.info('[MIGRASI] Kolom dihapus_oleh berhasil ditambahkan ke tabel peserta.');
    }
  } catch (err) {
    logger.error('[MIGRASI] Gagal menambah kolom soft delete:', err.message);
  }

  // Migrasi: hash password_petugas yang masih plaintext di tabel acara
  try {
    const acaraList = db.prepare('SELECT id, password_petugas FROM acara').all();
    for (const ac of acaraList) {
      if (ac.password_petugas && !ac.password_petugas.startsWith('$2b$')) {
        const hashed = bcrypt.hashSync(ac.password_petugas, 12);
        db.prepare('UPDATE acara SET password_petugas = ? WHERE id = ?').run(hashed, ac.id);
        logger.info({ id: ac.id }, '[MIGRASI] Password petugas di-hash untuk acara');
      }
    }
  } catch (err) {
    logger.error('[MIGRASI] Gagal hash password petugas:', err.message);
  }

  // Aktifkan foreign keys & buat index
  if (!USE_POSTGRES) {
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_status ON peserta(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_nomor_urut ON peserta(nomor_urut)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_acara ON peserta(acara_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_tipe ON peserta(tipe_peserta)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_kategori ON peserta(kategori_instansi)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_log_peserta ON audit_log(id_peserta)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_log_aksi ON audit_log(aksi)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_log_acara ON audit_log(acara_id)');
  } else {
    // Di PostgreSQL, IF NOT EXISTS didukung penuh
    db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_status ON peserta(status)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_nomor_urut ON peserta(nomor_urut)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_acara ON peserta(acara_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_tipe ON peserta(tipe_peserta)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_peserta_kategori ON peserta(kategori_instansi)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_log_peserta ON audit_log(id_peserta)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_log_aksi ON audit_log(aksi)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_log_acara ON audit_log(acara_id)');
  }

  logger.info('[MIGRASI] Semua prasyarat, index, dan foreign key berhasil diperiksa.');
}

module.exports = { jalankanMigrasi };
