// =============================================================================
// CONTROLLER PESERTA â€” Logika bisnis untuk endpoint publik peserta (Multi-Acara)
// =============================================================================

const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const { ambilKoneksiDB, simpanKeDisk } = require('../database/db');
const { STATUS_PESERTA, AKSI_LOG, STATUS_REGISTRASI } = require('../constants');
const { catatAuditLog } = require('../utils/auditLog');
const { generateIdPeserta, normalizePhone, getWaktuWIB } = require('../utils/helpers');
const { saveBase64Photo, generateFilename } = require('../utils/photo');
const { kirimEmailKonfirmasi } = require('../utils/email');
const { sanitizeInput } = require('../utils/sanitize');

/**
 * Mengambil acara yang aktif saat ini dari database.
 */
function ambilAcaraAktif(db, acaraId) {
  if (acaraId) {
    return db.prepare("SELECT * FROM acara WHERE id = ?").get(acaraId);
  }
  const rowActive = db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get();
  if (!rowActive) return null;
  return db.prepare("SELECT * FROM acara WHERE id = ?").get(rowActive.nilai);
}

// ... helper method placeholder ...

exports.ambilInfoAcara = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const acaraIdDariReq = req.headers['x-acara-id'] || null;
    const acara = ambilAcaraAktif(db, acaraIdDariReq);
    if (!acara) {
      return res.status(404).json({ sukses: false, pesan: 'Tidak ada acara yang aktif saat ini.', data: null });
    }

    const totalPeserta = db.prepare(
      "SELECT COUNT(*) as total FROM peserta WHERE acara_id = ? AND status != 'membatalkan' AND status != 'digantikan'"
    ).get(acara.id);

    return res.json({
      sukses: true,
      pesan: 'Info acara aktif berhasil bagian diambil.',
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
    const acaraIdDariReq = req.headers['x-acara-id'] || req.body.acara_id || null;
    const acara = ambilAcaraAktif(db, acaraIdDariReq);
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

    const { nama_lengkap, instansi, jabatan, no_hp, catatan = '', tipe_peserta = 'internal', foto_base64 } = req.body;
    const noHpNormalized = normalizePhone(no_hp);
    const bersih = sanitizeInput({ nama_lengkap, instansi, jabatan, catatan }, ['nama_lengkap', 'instansi', 'jabatan', 'catatan']);
    if (!foto_base64) {
      return res.status(400).json({ sukses: false, pesan: 'Foto wajib diambil sebelum mendaftar.', data: null });
    }

    // Cek duplikat berdasarkan no_hp (berlaku untuk semua tipe)
    const pesertaHpAda = db.prepare('SELECT id, nama_lengkap, nomor_urut FROM peserta WHERE acara_id = ? AND no_hp = ?').get(acara.id, noHpNormalized);
    if (pesertaHpAda) {
      return res.status(409).json({
        sukses: false,
        error: 'duplikat',
        pesan: 'Nomor HP ini sudah terdaftar untuk acara ini.',
        data: {
          id_terdaftar: pesertaHpAda.id,
          nama: pesertaHpAda.nama_lengkap,
          nomor_urut: pesertaHpAda.nomor_urut,
          id: pesertaHpAda.id
        },
      });
    }

    const totalAktif = db.prepare(
      "SELECT COUNT(*) as total FROM peserta WHERE acara_id = ? AND status != 'membatalkan' AND status != 'digantikan'"
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
        "SELECT MAX(nomor_urut) as max FROM peserta WHERE acara_id = ? AND tipe_peserta = ?"
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
      const { menentukanKategoriInstansi } = require('../utils/helpers');
      const kategoriInstansi = menentukanKategoriInstansi(bersih.instansi);
      const waktuDaftar = getWaktuWIB();

      // INSERT bersyarat menggunakan subquery di klausa SELECT ... WHERE untuk perlindungan atomik konkurensi kuota
      const result = db.prepare(`
        INSERT INTO peserta
          (id, acara_id, nomor_urut, tipe_peserta, nama_lengkap, instansi, kategori_instansi, jabatan, no_hp, email, catatan, foto_path, waktu_daftar)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE (
          SELECT COUNT(*) FROM peserta 
          WHERE acara_id = ? AND status != 'membatalkan' AND status != 'digantikan'
        ) < ?
      `).run(
        idBaru, acara.id, nomorUrut, tipe_peserta, bersih.nama_lengkap, bersih.instansi, kategoriInstansi, bersih.jabatan, noHpNormalized, null, bersih.catatan, fotoPath, waktuDaftar,
        acara.id, parseInt(acara.kuota_maksimal)
      );

      if (result.changes === 0) {
        throw new Error('Kuota penuh');
      }

      catatAuditLog(db, 'sistem', AKSI_LOG.REGISTRASI, idBaru,
        JSON.stringify({ nama_lengkap: bersih.nama_lengkap, instansi: bersih.instansi, jabatan: bersih.jabatan, tipe_peserta }),
        acara.id
      );

      return idBaru;
    });

    const idBaru = prosesDaftar();
    simpanKeDisk();

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
    if (pesanErr === 'Kuota penuh') {
      return res.status(409).json({ sukses: false, pesan: 'Kuota pendaftaran sudah penuh.', data: null });
    }
    if (pesanErr.includes('UNIQUE constraint failed')) {
      let fieldPesan = 'terdaftar';
      if (pesanErr.includes('no_hp')) fieldPesan = 'Nomor HP ini sudah terdaftar.';
      else if (pesanErr.includes('email')) fieldPesan = 'Email ini sudah terdaftar.';
      else if (pesanErr.includes('nomor_urut')) fieldPesan = 'Terjadi konflik nomor urut. Hubungi panitia.';
      return res.status(409).json({
        sukses: false,
        pesan: `Data sudah ${fieldPesan} Gunakan data yang berbeda.`,
        data: null,
      });
    }
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', detail: err.message, data: null });
  }
};

exports.cekStatusPeserta = (req, res) => {
  try {
const db = ambilKoneksiDB();
    const acaraIdDariReq = req.headers['x-acara-id'] || null;
    const acara = ambilAcaraAktif(db, acaraIdDariReq);
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

    const noHpNormalized = no_hp ? normalizePhone(no_hp) : '';

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
      `).get(acara.id, noHpNormalized);
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

// ── Cari peserta berdasarkan nomor urut (QR) atau Nama Lengkap (Check-in manual) ──
const cariByNomorUrut = (req, res) => {
  try {
    const { nomor_urut } = req.params;
    const db = ambilKoneksiDB();

    // Gunakan req.acaraId dari JWT (petugas login), fallback ke global acara aktif jika tidak ada
    const targetAcaraId = req.acaraId || db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get()?.nilai;

    let peserta = null;
    const kw = nomor_urut.trim();

    const scopeWhere = targetAcaraId ? 'acara_id = ? AND ' : '';
    const scopeParam = targetAcaraId ? [targetAcaraId] : [];

    // 1. Cari exact match berdasarkan ID registrasi
    peserta = db.prepare(`SELECT * FROM peserta WHERE ${scopeWhere}id = ?`).get(...[...scopeParam, kw]);

    // 2. Cari berdasarkan nomor urut (mis: KPU-0001)
    if (!peserta) {
      peserta = db.prepare(`SELECT * FROM peserta WHERE ${scopeWhere}UPPER(nomor_urut) = UPPER(?)`).get(...[...scopeParam, kw]);
    }

    // 3. Cari berdasarkan nama lengkap (parsial, case-insensitive)
    if (!peserta) {
      peserta = db.prepare(`SELECT * FROM peserta WHERE ${scopeWhere}nama_lengkap LIKE ? LIMIT 1`).get(...[...scopeParam, `%${kw}%`]);
    }

    if (!peserta) {
      return res.status(404).json({
        error: `Peserta dengan kata kunci "${nomor_urut}" tidak ditemukan.`
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

    // Pastikan pencarian peserta dibatasi oleh scope acara_id dari JWT token jika ada
    const targetAcaraId = req.acaraId || db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get()?.nilai;
    const scopeWhere = targetAcaraId ? 'WHERE id = ? AND acara_id = ?' : 'WHERE id = ?';
    const scopeParam = targetAcaraId ? [id, targetAcaraId] : [id];

    const peserta = db.prepare(`SELECT * FROM peserta ${scopeWhere}`).get(...scopeParam);
    if (!peserta) {
      return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan pada sesi acara Anda.' });
    }

    const waktuCheckin = getWaktuWIB();

    // Atomic Update: update hanya jika status saat ini adalah 'terdaftar'
    const result = db.prepare(
      "UPDATE peserta SET status = ?, waktu_checkin = ?, petugas_checkin = ? WHERE id = ? AND status = ?"
    ).run(STATUS_PESERTA.HADIR, waktuCheckin, req.aktor || 'petugas', id, STATUS_PESERTA.TERDAFTAR);

    if (result.changes === 0) {
      const pesertaTerkini = db.prepare('SELECT status FROM peserta WHERE id = ?').get(id);
      let pesanError = 'Peserta sudah tercatat hadir atau status tidak valid.';
      if (pesertaTerkini) {
        if (pesertaTerkini.status === STATUS_PESERTA.HADIR) {
          pesanError = 'Peserta sudah hadir.';
        } else if (pesertaTerkini.status === STATUS_PESERTA.MEMBATALKAN) {
          pesanError = 'Peserta telah membatalkan kehadiran.';
        } else if (pesertaTerkini.status === STATUS_PESERTA.DIGANTIKAN) {
          pesanError = 'Peserta ini sudah digantikan.';
        }
      }
      return res.status(409).json({ sukses: false, pesan: pesanError, peserta });
    }

    catatAuditLog(db, req.aktor || 'petugas', AKSI_LOG.CHECKIN, id,
      JSON.stringify({ waktu_checkin: waktuCheckin }), peserta.acara_id
    );
    simpanKeDisk();

    const updated = db.prepare('SELECT * FROM peserta WHERE id = ?').get(id);
    return res.json({ sukses: true, pesan: 'Check-in berhasil.', peserta: updated });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.' });
  }
};

const downloadIDCardPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const db = ambilKoneksiDB();
    const peserta = db.prepare('SELECT * FROM peserta WHERE id = ?').get(id);
    if (!peserta) {
      return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.' });
    }
    const { buatPDFIDCard } = require('../utils/pdfGenerator');
    const acara = ambilAcaraAktif(db, peserta.acara_id);
    const pdfBuffer = await buatPDFIDCard(peserta, acara);

    let nomorFormatted = peserta.id;
    if (peserta.nomor_urut) {
      if (String(peserta.nomor_urut).includes('-')) {
        nomorFormatted = String(peserta.nomor_urut);
      } else {
        const prefix = peserta.tipe_peserta === 'internal' ? 'KPU' : 'EKS';
        nomorFormatted = `${prefix}-${String(peserta.nomor_urut).padStart(4, '0')}`;
      }
    }
    const filename = `IDCard-${nomorFormatted}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Error downloadIDCardPDF:', err);
    return res.status(500).json({ sukses: false, pesan: 'Gagal membuat PDF ID Card.' });
  }
};

module.exports.ambilAcaraAktif = ambilAcaraAktif;
module.exports.cariByNomorUrut = cariByNomorUrut;
module.exports.tandaiHadirById = tandaiHadirById;
module.exports.downloadIDCardPDF = downloadIDCardPDF;



