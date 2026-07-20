// =============================================================================
// CONTROLLER PESERTA — Logika bisnis untuk endpoint publik peserta (Multi-Acara)
// =============================================================================

const { validationResult } = require('express-validator');
const { ambilKoneksiDB } = require('../database/db');
const { STATUS_PESERTA, AKSI_LOG, STATUS_REGISTRASI } = require('../constants');
const { catatAuditLog } = require('../utils/auditLog');
const { generateIdPeserta } = require('../utils/helpers');
const { saveBase64Photo } = require('../utils/photo');
const { kirimEmailKonfirmasi } = require('../utils/email');

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
      "SELECT COUNT(*) as total FROM peserta WHERE acara_id = ? AND status != 'membatalkan' AND status != 'digantikan'"
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
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }
};

exports.daftarPeserta = (req, res) => {
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

    const { nama_lengkap, instansi, jabatan, email = '', no_hp, catatan = '', tipe_peserta = 'internal', foto_base64, nik } = req.body;
    // Enforce mandatory photo for all participant types
    if (!foto_base64) {
      return res.status(400).json({ error: 'Foto wajib diambil sebelum mendaftar.' });
    }

    // Cek duplikat berdasarkan NIK/email sesuai tipe
    if (tipe_peserta === 'internal') {
      if (nik) {
        const pesertaNikAda = db.prepare('SELECT id, nama_lengkap AS nama, nomor_urut FROM peserta WHERE nik = ? AND acara_id = ?').get(nik, acara.id);
        if (pesertaNikAda) {
          return res.status(409).json({
            error: 'duplikat',
            pesan: 'NIK ini sudah terdaftar di acara ini.',
            data: { nama: pesertaNikAda.nama, nomor_urut: pesertaNikAda.nomor_urut, id: pesertaNikAda.id }
          });
        }
      }
    } else if (tipe_peserta === 'eksternal') {
      if (email) {
        const pesertaEmailAda = db.prepare('SELECT id, nama_lengkap AS nama, nomor_urut FROM peserta WHERE email = ? AND acara_id = ?').get(email, acara.id);
        if (pesertaEmailAda) {
          return res.status(409).json({
            error: 'duplikat',
            pesan: 'Email ini sudah terdaftar di acara ini.',
            data: { nama: pesertaEmailAda.nama, nomor_urut: pesertaEmailAda.nomor_urut, id: pesertaEmailAda.id }
          });
        }
      }
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

    // Cek duplikat email (hanya jika email diisi)
    if (email) {
      const pesertaEmailAda = db.prepare('SELECT id FROM peserta WHERE acara_id = ? AND email = ? AND email != \'\'').get(acara.id, email);
      if (pesertaEmailAda) {
        return res.status(409).json({
          sukses: false,
          pesan: 'Email ini sudah terdaftar untuk acara ini.',
          data: { id_terdaftar: pesertaEmailAda.id },
        });
      }
    }

    const totalAktif = db.prepare(
      "SELECT COUNT(*) as total FROM peserta WHERE acara_id = ? AND status != 'membatalkan' AND status != 'digantikan'"
    ).get(acara.id);

    if (totalAktif.total >= parseInt(acara.kuota_maksimal)) {
      return res.status(409).json({ sukses: false, pesan: 'Kuota pendaftaran sudah penuh.', data: null });
    }

    // Generate nomor urut per tipe peserta — simpan sebagai string berformat prefix
    const maxRow = db.prepare(
      'SELECT MAX(nomor_urut) as max FROM peserta WHERE acara_id = ? AND tipe_peserta = ?'
    ).get(acara.id, tipe_peserta);

    let nextNum = 1;
    if (maxRow && maxRow.max != null) {
      const val = String(maxRow.max);
      // Handle both legacy integer ("3") and prefixed string ("KPU-0003")
      const match = val.match(/(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    const prefix = tipe_peserta === 'internal' ? 'KPU' : 'EKS';
    const nomorUrut = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    const idBaru = generateIdPeserta(nextNum, acara.kode_acara, tipe_peserta);
    const waktuDaftar = new Date().toISOString();

    let fotoPath = null;
    if (foto_base64) {
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
      fotoPath = saveBase64Photo(foto_base64, filename);
    }

    db.prepare(`
      INSERT INTO peserta
        (id, acara_id, nomor_urut, tipe_peserta, nama_lengkap, instansi, jabatan, email, no_hp, catatan, foto_path, waktu_daftar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(idBaru, acara.id, nomorUrut, tipe_peserta, nama_lengkap, instansi, jabatan, email, no_hp, catatan, fotoPath, waktuDaftar);

    catatAuditLog(db, 'sistem', AKSI_LOG.REGISTRASI, idBaru,
      JSON.stringify({ nama_lengkap, instansi, jabatan, email, tipe_peserta }),
      acara.id
    );

    // Ambil data peserta beserta info acara pendukung
    const dataBaru = db.prepare(`
      SELECT p.*, a.nama_acara, a.tanggal_acara, a.lokasi_acara, a.waktu_acara
      FROM peserta p
      JOIN acara a ON p.acara_id = a.id
      WHERE p.id = ?
    `).get(idBaru);

    // Kirim email konfirmasi secara asynchronous — tidak menunda respons ke peserta
    // dan tidak menggagalkan registrasi jika pengiriman email gagal.
    kirimEmailKonfirmasi(dataBaru);

    return res.status(201).json({
      sukses: true,
      pesan: 'Registrasi berhasil. Simpan ID registrasi Anda.',
      data: dataBaru,
    });
  } catch (err) {
    console.error('[REG ERROR]', err);
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }
};

exports.cekStatusPeserta = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const acara = ambilAcaraAktif(db);
    if (!acara) {
      return res.status(404).json({ sukses: false, pesan: 'Tidak ada acara yang aktif saat ini.', data: null });
    }

    const email = req.body.email || req.params.email;
    if (!email) {
      return res.status(400).json({ sukses: false, pesan: 'Email wajib diisi.', data: null });
    }

    const peserta = db.prepare(`
      SELECT p.*, a.nama_acara, a.tanggal_acara, a.lokasi_acara, a.waktu_acara
      FROM peserta p
      JOIN acara a ON p.acara_id = a.id
      WHERE p.acara_id = ? AND p.email = ?
    `).get(acara.id, email);

    if (!peserta) {
      return res.status(404).json({ sukses: false, pesan: 'Email tidak ditemukan pada acara aktif saat ini.', data: null });
    }
    return res.json({ sukses: true, pesan: 'Data peserta ditemukan.', data: peserta });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
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
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
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
    res.status(500).json({ error: err.message });
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

    const waktuCheckin = new Date().toISOString();
    db.prepare(
      "UPDATE peserta SET status = ?, waktu_checkin = ? WHERE id = ?"
    ).run(STATUS_PESERTA.HADIR, waktuCheckin, id);

    const updated = db.prepare('SELECT * FROM peserta WHERE id = ?').get(id);
    return res.json({ sukses: true, pesan: 'Check-in berhasil.', peserta: updated });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message });
  }
};

module.exports.ambilAcaraAktif = ambilAcaraAktif;
module.exports.cariByNomorUrut = cariByNomorUrut;
module.exports.tandaiHadirById = tandaiHadirById;
