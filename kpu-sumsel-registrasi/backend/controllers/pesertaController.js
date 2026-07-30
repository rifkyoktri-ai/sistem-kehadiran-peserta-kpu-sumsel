// =============================================================================
// CONTROLLER PESERTA — Logika bisnis untuk endpoint publik peserta (Multi-Acara)
// =============================================================================

const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const { ambilKoneksiDB } = require('../database/db');
const { STATUS_PESERTA, AKSI_LOG, STATUS_REGISTRASI } = require('../constants');
const { catatAuditLog } = require('../utils/auditLog');
const { generateIdPeserta } = require('../utils/helpers');
const { saveBase64Photo, generateFilename } = require('../utils/photo');
const { kirimEmailKonfirmasi } = require('../utils/email');
const { sanitizeInput } = require('../utils/sanitize');

/**
 * Mengambil acara yang aktif saat ini dari database.
 */
function ambilAcaraAktif(db) {
  const rowActive = db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get();
  if (!rowActive) return null;
  return db.prepare("SELECT * FROM acara WHERE id = ?").get(rowActive.nilai);
}

exports.ambilInfoAcara = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const acara = ambilAcaraAktif(db);
    if (!acara) {
      return res.status(404).json({ sukses: false, pesan: 'Tidak ada acara yang aktif saat ini.', data: null });
    }

    const totalPeserta = db.prepare(
      "SELECT COUNT(*) as total FROM peserta WHERE acara_id = ? AND status != 'membatalkan' AND status != 'digantikan' AND status != 'dihapus'"
    ).get(acara.id);

    return res.json({
      sukses: true,
      pesan: 'Info acara aktif berhasil diambil.',
      data: {
        id: acara.id,
        kode_acara: acara.kode_acara,
        nama_acara: acara.nama_acara,
        tanggal_acara: acara.tanggal_acara,
        waktu_acara: acara.waktu_acara,
        lokasi_acara: acara.lokasi_acara,
        kuota_maksimal: acara.kuota_maksimal,
        deadline_registrasi: acara.deadline_registrasi,
        status_registrasi: acara.status_registrasi,
        total_terdaftar: totalPeserta.total,
        sisa_kuota: parseInt(acara.kuota_maksimal) - totalPeserta.total,
      },
    });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

exports.daftarPeserta = (req, res) => {
  let fotoPath = null;
  try {
    const errorValidasi = validationResult(req);
    if (!errorValidasi.isEmpty()) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Data tidak valid. Periksa kembali isian form.',
        data: { errors: errorValidasi.array() },
      });
    }

    const db = ambilKoneksiDB();
    const acara = ambilAcaraAktif(db);
    if (!acara) {
      return res.status(404).json({ sukses: false, pesan: 'Pendaftaran ditutup karena tidak ada acara yang aktif.', data: null });
    }

    if (acara.status_registrasi === STATUS_REGISTRASI.TUTUP) {
      return res.status(403).json({ sukses: false, pesan: 'Pendaftaran telah ditutup.', data: null });
    }

    // Cek deadline registrasi (jika diatur)
    if (acara.deadline_registrasi) {
      const deadline = new Date(acara.deadline_registrasi);
      if (!isNaN(deadline.getTime()) && new Date() > deadline) {
        return res.status(403).json({
          sukses: false,
          pesan: `Pendaftaran telah berakhir pada ${deadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
          data: null,
        });
      }
    }

    const { nama_lengkap, instansi, jabatan, no_hp, catatan = '', tipe_peserta = 'internal', foto_base64, nik } = req.body;
    const bersih = sanitizeInput({ nama_lengkap, instansi, jabatan, catatan }, ['nama_lengkap', 'instansi', 'jabatan', 'catatan']);
    if (!foto_base64) {
      return res.status(400).json({ sukses: false, pesan: 'Foto wajib diambil sebelum mendaftar.', data: null });
    }

    // Cek duplikat berdasarkan no_hp (berlaku untuk semua tipe)
    const pesertaHpAda = db.prepare('SELECT id FROM peserta WHERE acara_id = ? AND no_hp = ?').get(acara.id, no_hp);
    if (pesertaHpAda) {
      return res.status(409).json({
        sukses: false,
        pesan: 'Nomor HP ini sudah terdaftar untuk acara ini.',
        data: { id_terdaftar: pesertaHpAda.id },
      });
    }

    const totalAktif = db.prepare(
      "SELECT COUNT(*) as total FROM peserta WHERE acara_id = ? AND status != 'membatalkan' AND status != 'digantikan' AND status != 'dihapus'"
    ).get(acara.id);

    if (totalAktif.total >= parseInt(acara.kuota_maksimal)) {
      return res.status(409).json({ sukses: false, pesan: 'Kuota pendaftaran sudah penuh.', data: null });
    }

    // Simpan foto sebelum transaksi (file I/O tidak boleh di dalam DB transaction)
    if (foto_base64) {
      try {
        fotoPath = saveBase64Photo(foto_base64, generateFilename());
      } catch (err) {
        return res.status(400).json({ sukses: false, pesan: err.message, data: null });
      }
    }

    // Transaction: generate nomor urut + INSERT + audit log (cegah race condition)
    const prosesDaftar = db.transaction(() => {
      const maxRow = db.prepare(
        "SELECT MAX(nomor_urut) as max FROM peserta WHERE acara_id = ? AND tipe_peserta = ? AND status != 'dihapus'"
      ).get(acara.id, tipe_peserta);

      let nextNum = 1;
      if (maxRow && maxRow.max != null) {
        const val = String(maxRow.max);
        const match = val.match(/(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1], 10) + 1;
        }
      }

      const prefix = tipe_peserta === 'internal' ? 'KPU' : 'EKS';
      const nomorUrut = `${prefix}-${String(nextNum).padStart(4, '0')}`;
      const idBaru = generateIdPeserta(nextNum, acara.kode_acara, tipe_peserta);

      db.prepare(`
        INSERT INTO peserta
          (id, acara_id, nomor_urut, tipe_peserta, nama_lengkap, instansi, jabatan, no_hp, email, nik, catatan, foto_path, waktu_daftar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(idBaru, acara.id, nomorUrut, tipe_peserta, bersih.nama_lengkap, bersih.instansi, bersih.jabatan, no_hp, '', nik || null, bersih.catatan, fotoPath, new Date().toISOString());

      catatAuditLog(db, 'sistem', AKSI_LOG.REGISTRASI, idBaru,
        JSON.stringify({ nama_lengkap: bersih.nama_lengkap, instansi: bersih.instansi, jabatan: bersih.jabatan, tipe_peserta }),
        acara.id
      );

      return idBaru;
    });

    const idBaru = prosesDaftar();

    // Ambil data peserta beserta info acara pendukung
    const dataBaru = db.prepare(`
      SELECT p.*, a.nama_acara, a.tanggal_acara, a.lokasi_acara, a.waktu_acara
      FROM peserta p
      JOIN acara a ON p.acara_id = a.id
      WHERE p.id = ?
    `).get(idBaru);

    kirimEmailKonfirmasi(dataBaru).catch(err => {
      const logger = require('../utils/logger');
      logger.error({ err, id: dataBaru.id }, 'Email gagal dikirim (non-blokir)');
    });

    return res.status(201).json({
      sukses: true,
      pesan: 'Registrasi berhasil. Simpan ID registrasi Anda.',
      data: dataBaru,
    });
  } catch (err) {
    const logger = require('../utils/logger');
    logger.error({ err }, 'Registration error');
    // Bersihkan file foto orphan jika transaksi gagal
    if (fotoPath) {
      try { fs.unlinkSync(path.join(__dirname, '..', fotoPath)); } catch (_) {}
    }
    const pesanErr = String(err.message || '');
    if (pesanErr.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        sukses: false,
        pesan: 'Data sudah terdaftar. Gunakan email atau nomor HP yang berbeda.',
        data: null,
      });
    }
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', detail: err.message, data: null });
  }
};

exports.cekStatusPeserta = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const acara = ambilAcaraAktif(db);
    if (!acara) {
      return res.status(404).json({ sukses: false, pesan: 'Tidak ada acara yang aktif saat ini.', data: null });
    }

    const { no_hp, id_registrasi } = req.body;

    if (!no_hp && !id_registrasi) {
      return res.status(400).json({
        sukses: false,
        pesan: 'Masukkan nomor HP atau ID registrasi untuk mencari data.',
        data: null,
      });
    }

    let peserta = null;
    if (id_registrasi) {
      peserta = db.prepare(`
        SELECT p.*, a.nama_acara, a.tanggal_acara, a.lokasi_acara, a.waktu_acara
        FROM peserta p
        JOIN acara a ON p.acara_id = a.id
        WHERE p.id = ?
      `).get(id_registrasi);

    } else if (no_hp) {
      peserta = db.prepare(`
        SELECT p.*, a.nama_acara, a.tanggal_acara, a.lokasi_acara, a.waktu_acara
        FROM peserta p
        JOIN acara a ON p.acara_id = a.id
        WHERE p.acara_id = ? AND p.no_hp = ?
      `).get(acara.id, no_hp);
    }

    if (!peserta) {
      return res.status(404).json({
        sukses: false,
        pesan: 'Data tidak ditemukan pada acara aktif saat ini. Periksa kembali nomor HP atau ID registrasi Anda.',
        data: null,
      });
    }
    return res.json({ sukses: true, pesan: 'Data peserta ditemukan.', data: peserta });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

exports.infoPesertaById = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const peserta = db.prepare(`
      SELECT p.*, a.nama_acara, a.tanggal_acara, a.lokasi_acara, a.waktu_acara
      FROM peserta p
      JOIN acara a ON p.acara_id = a.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!peserta) {
      return res.status(404).json({ sukses: false, pesan: 'ID registrasi tidak ditemukan.', data: null });
    }
    return res.json({ sukses: true, pesan: 'Data peserta ditemukan.', data: peserta });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

// ── Cari peserta berdasarkan nomor urut (QR) ──────────────────────────────────
const cariByNomorUrut = (req, res) => {
  try {
    const { nomor_urut } = req.params;
    const db = ambilKoneksiDB();
    const peserta = db.prepare('SELECT * FROM peserta WHERE nomor_urut = ? LIMIT 1').get(nomor_urut);

    if (!peserta) {
      return res.status(404).json({
        error: `Peserta dengan nomor ${nomor_urut} tidak ditemukan.`
      });
    }

    res.json({ peserta });
  } catch (err) {
    const logger = require('../utils/logger');
    logger.error({ err }, 'cariByNomorUrut error');
    res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.' });
  }
};

const tandaiHadirById = (req, res) => {
  try {
    const { id } = req.params;
    const db = ambilKoneksiDB();

    const peserta = db.prepare('SELECT * FROM peserta WHERE id = ?').get(id);
    if (!peserta) {
      return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.' });
    }
    if (peserta.status === STATUS_PESERTA.HADIR) {
      return res.status(409).json({ sukses: false, pesan: 'Peserta sudah hadir.', peserta });
    }
    if (peserta.status === STATUS_PESERTA.MEMBATALKAN) {
      return res.status(409).json({ sukses: false, pesan: 'Peserta telah membatalkan kehadiran.', peserta });
    }
    if (peserta.status === STATUS_PESERTA.DIGANTIKAN) {
      return res.status(409).json({ sukses: false, pesan: 'Peserta ini sudah digantikan.', peserta });
    }

    const waktuCheckin = new Date().toISOString();
    db.prepare(
      "UPDATE peserta SET status = ?, waktu_checkin = ?, petugas_checkin = ? WHERE id = ?"
    ).run(STATUS_PESERTA.HADIR, waktuCheckin, req.aktor || 'petugas', id);

    catatAuditLog(db, req.aktor || 'petugas', AKSI_LOG.CHECKIN, id,
      JSON.stringify({ waktu_checkin: waktuCheckin }), peserta.acara_id
    );

    const updated = db.prepare('SELECT * FROM peserta WHERE id = ?').get(id);
    return res.json({ sukses: true, pesan: 'Check-in berhasil.', peserta: updated });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.' });
  }
};

module.exports.ambilAcaraAktif = ambilAcaraAktif;
module.exports.cariByNomorUrut = cariByNomorUrut;
module.exports.tandaiHadirById = tandaiHadirById;
