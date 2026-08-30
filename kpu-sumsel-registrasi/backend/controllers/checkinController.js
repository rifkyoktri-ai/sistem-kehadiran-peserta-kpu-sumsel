// =============================================================================
// CONTROLLER CHECK-IN — Logika bisnis check-in hari-H (Multi-Acara)
// =============================================================================

const fs = require('fs');
const path = require('path');
const { ambilKoneksiDB, simpanKeDisk } = require('../database/db');
const { STATUS_PESERTA, AKSI_LOG } = require('../constants');
const { catatAuditLog } = require('../utils/auditLog');
const { generateIdPeserta, getWaktuWIB } = require('../utils/helpers');
const { saveBase64Photo, generateFilename } = require('../utils/photo');
const logger = require('../utils/logger');
const { sanitizeInput } = require('../utils/sanitize');

/**
 * Mencari peserta berdasarkan ID, nomor urut, no HP, atau nama (LIKE parsial).
 * Urutan prioritas: id → nomor_urut → no_hp → nama_lengkap
 */
function cariPeserta(db, identifier, acaraId) {
  const kw = identifier.trim();
  const scopeWhere = acaraId ? 'acara_id = ? AND ' : '';
  const scopeParam = acaraId ? [acaraId] : [];

  // 1. Cari exact match berdasarkan ID registrasi
  let row = db.prepare(`SELECT * FROM peserta WHERE ${scopeWhere}id = ?`).get(...[...scopeParam, kw]);
  if (row) return row;

  // 2. Cari exact match berdasarkan nomor urut (mis: KPU-0001 / EKS-0001)
  row = db.prepare(`SELECT * FROM peserta WHERE ${scopeWhere}UPPER(nomor_urut) = UPPER(?)`).get(...[...scopeParam, kw]);
  if (row) return row;

  // 3. Cari berdasarkan nomor HP
  row = db.prepare(`SELECT * FROM peserta WHERE ${scopeWhere}no_hp = ?`).get(...[...scopeParam, kw]);
  if (row) return row;

  // 4. Cari berdasarkan nama lengkap (parsial, case-insensitive)
  row = db.prepare(`SELECT * FROM peserta WHERE ${scopeWhere}nama_lengkap LIKE ? LIMIT 1`).get(...[...scopeParam, `%${kw}%`]);
  if (row) return row;

  return null;
}

exports.validasiPeserta = (req, res) => {
  try {
    const identifier = req.body.identifier || req.body.id;
    if (!identifier) {
      return res.status(400).json({ sukses: false, pesan: 'ID registrasi wajib diisi.', data: null });
    }

    const db = ambilKoneksiDB();
    const targetAcaraId = req.acaraId || db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get()?.nilai;
    
    const peserta = cariPeserta(db, identifier.trim(), targetAcaraId);

    if (!peserta) {
      return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan pada acara ini.', data: null });
    }
    return res.json({ sukses: true, pesan: 'Peserta ditemukan.', data: peserta });
  } catch (err) {
    logger.error({ err }, 'validasiPeserta error');
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

exports.tandaiHadir = (req, res) => {
  try {
    const identifier = req.body.identifier || req.body.id;
    if (!identifier) {
      return res.status(400).json({ sukses: false, pesan: 'ID registrasi wajib diisi.', data: null });
    }

    const db = ambilKoneksiDB();
    const targetAcaraId = req.acaraId || db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get()?.nilai;

    const peserta = cariPeserta(db, identifier.trim(), targetAcaraId);

    if (!peserta) {
      return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.', data: null });
    }

    const waktuCheckin = getWaktuWIB();

    // Atomic Update: Update hanya jika status saat ini adalah 'terdaftar'
    const result = db.prepare(`
      UPDATE peserta 
      SET status = ?, waktu_checkin = ?, petugas_checkin = ? 
      WHERE id = ? AND status = ?
    `).run(STATUS_PESERTA.HADIR, waktuCheckin, req.aktor, peserta.id, STATUS_PESERTA.TERDAFTAR);

    if (result.changes === 0) {
      // Dapatkan data terkini untuk memberikan pesan yang akurat
      const pesertaTerkini = db.prepare('SELECT status FROM peserta WHERE id = ?').get(peserta.id);
      let pesanError = 'Peserta sudah tercatat hadir atau status tidak valid.';
      if (pesertaTerkini) {
        if (pesertaTerkini.status === STATUS_PESERTA.HADIR) {
          pesanError = 'Peserta ini sudah melakukan check-in.';
        } else if (pesertaTerkini.status === STATUS_PESERTA.MEMBATALKAN) {
          pesanError = 'Peserta telah membatalkan kehadiran.';
        } else if (pesertaTerkini.status === STATUS_PESERTA.DIGANTIKAN) {
          pesanError = 'Peserta ini sudah digantikan.';
        }
      }
      return res.status(409).json({ sukses: false, pesan: pesanError, data: peserta });
    }

    catatAuditLog(db, req.aktor, AKSI_LOG.CHECKIN, peserta.id, JSON.stringify({ waktu_checkin: waktuCheckin }), targetAcaraId);
    simpanKeDisk();

    return res.json({
      sukses: true,
      pesan: `Check-in berhasil. Selamat datang, ${peserta.nama_lengkap}!`,
      data: db.prepare('SELECT * FROM peserta WHERE id = ?').get(peserta.id),
    });
  } catch (err) {
    logger.error({ err }, 'tandaiHadir error');
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

exports.daftarWalkin = (req, res) => {
  let fotoPath = null;
  try {
    const { nama_lengkap, instansi, jabatan, no_hp, foto_base64, tipe_peserta = 'internal' } = req.body;
    const bersih = sanitizeInput({ nama_lengkap, instansi, jabatan }, ['nama_lengkap', 'instansi', 'jabatan']);
    if (!nama_lengkap || !instansi || !jabatan || !no_hp) {
      return res.status(400).json({ sukses: false, pesan: 'Semua field wajib diisi.', data: null });
    }
    if (!foto_base64) {
      return res.status(400).json({ sukses: false, pesan: 'Foto wajib diambil untuk pendaftaran walk-in.', data: null });
    }

    const db = ambilKoneksiDB();
    const targetAcaraId = req.acaraId || db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get()?.nilai;
    if (!targetAcaraId) {
      return res.status(400).json({ sukses: false, pesan: 'Tidak ada sesi acara yang aktif.', data: null });
    }

    const acara = db.prepare('SELECT * FROM acara WHERE id = ?').get(targetAcaraId);
    if (!acara) {
      return res.status(404).json({ sukses: false, pesan: 'Acara tidak ditemukan.', data: null });
    }

    try {
      fotoPath = saveBase64Photo(foto_base64, generateFilename());
    } catch (err) {
      return res.status(400).json({ sukses: false, pesan: err.message, data: null });
    }

    const prosesWalkIn = db.transaction(() => {
      const maxRow = db.prepare(
        'SELECT MAX(nomor_urut) as max FROM peserta WHERE acara_id = ? AND tipe_peserta = ?'
      ).get(targetAcaraId, tipe_peserta);

      let nextNum = 1;
      if (maxRow && maxRow.max != null) {
        const val = String(maxRow.max);
        const match = val.match(/(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      const prefix = tipe_peserta === 'internal' ? 'KPU' : 'EKS';
      const nomorUrutStr = `${prefix}-${String(nextNum).padStart(4, '0')}`;
      const idBaru = generateIdPeserta(nextNum, acara.kode_acara, tipe_peserta);
      const waktuSekarang = getWaktuWIB();
      const { menentukanKategoriInstansi } = require('../utils/helpers');
      const kategoriInstansi = menentukanKategoriInstansi(bersih.instansi);

      db.prepare(`
        INSERT INTO peserta
          (id, acara_id, nomor_urut, tipe_peserta, nama_lengkap, instansi, kategori_instansi, jabatan, no_hp, email,
           foto_path, status, waktu_daftar, waktu_checkin, petugas_checkin, adalah_walkin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(idBaru, targetAcaraId, nomorUrutStr, tipe_peserta, bersih.nama_lengkap, bersih.instansi, kategoriInstansi, bersih.jabatan, no_hp, '',
             fotoPath, STATUS_PESERTA.HADIR, waktuSekarang, waktuSekarang, req.aktor);

      catatAuditLog(db, req.aktor, AKSI_LOG.WALKIN, idBaru, JSON.stringify({ nama_lengkap: bersih.nama_lengkap, instansi: bersih.instansi }), targetAcaraId);

      return idBaru;
    });

    const idBaru = prosesWalkIn();
    simpanKeDisk();
    return res.status(201).json({
      sukses: true,
      pesan: `Walk-in berhasil. ${bersih.nama_lengkap} telah terdaftar dan check-in.`,
      data: db.prepare('SELECT * FROM peserta WHERE id = ?').get(idBaru),
    });
  } catch (err) {
    logger.error({ err }, 'daftarWalkin error');
    // Bersihkan file foto orphan jika transaksi gagal
    if (typeof fotoPath !== 'undefined' && fotoPath) {
      try { fs.unlinkSync(path.join(__dirname, '..', fotoPath)); } catch (_) {}
    }
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

exports.cetakUlangIdCard = (req, res) => {
  try {
    const { id_peserta } = req.body;
    if (!id_peserta) {
      return res.status(400).json({ sukses: false, pesan: 'ID peserta wajib diisi.', data: null });
    }

    const db = ambilKoneksiDB();
    const peserta = db.prepare('SELECT * FROM peserta WHERE id = ?').get(id_peserta);
    if (!peserta) {
      return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.', data: null });
    }

    catatAuditLog(db, req.aktor, AKSI_LOG.CETAK_ULANG, id_peserta,
      JSON.stringify({ alasan: req.body.alasan || 'Tidak ada keterangan' }),
      peserta.acara_id
    );

    return res.json({ sukses: true, pesan: 'Permintaan cetak ulang telah dicatat.', data: { id_peserta } });
  } catch (err) {
    logger.error({ err }, 'cetakUlangIdCard error');
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};
