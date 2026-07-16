// =============================================================================
// CONTROLLER CHECK-IN — Logika bisnis check-in hari-H (Multi-Acara)
// =============================================================================

const { ambilKoneksiDB } = require('../database/db');
const { STATUS_PESERTA, AKSI_LOG } = require('../constants');
const { catatAuditLog } = require('../utils/auditLog');
const { generateIdPeserta } = require('../utils/helpers');
const { saveBase64Photo } = require('../utils/photo');

/**
 * Mencari peserta berdasarkan ID atau Email dalam scope acara tertentu.
 */
function cariPeserta(db, identifier, acaraId) {
  if (acaraId) {
    return (
      db.prepare('SELECT * FROM peserta WHERE acara_id = ? AND id = ?').get(acaraId, identifier) ||
      db.prepare('SELECT * FROM peserta WHERE acara_id = ? AND email = ?').get(acaraId, identifier)
    );
  }
  return (
    db.prepare('SELECT * FROM peserta WHERE id = ?').get(identifier) ||
    db.prepare('SELECT * FROM peserta WHERE email = ?').get(identifier)
  );
}

exports.validasiPeserta = (req, res) => {
  const identifier = req.body.identifier || req.body.id;
  if (!identifier) {
    return res.status(400).json({ sukses: false, pesan: 'ID registrasi atau email wajib diisi.', data: null });
  }

  const db = ambilKoneksiDB();
  const targetAcaraId = req.acaraId || db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get()?.nilai;
  
  const peserta = cariPeserta(db, identifier.trim(), targetAcaraId);

  if (!peserta) {
    return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan pada acara ini.', data: null });
  }
  return res.json({ sukses: true, pesan: 'Peserta ditemukan.', data: peserta });
};

exports.tandaiHadir = (req, res) => {
  const identifier = req.body.identifier || req.body.id;
  if (!identifier) {
    return res.status(400).json({ sukses: false, pesan: 'ID registrasi atau email wajib diisi.', data: null });
  }

  const db = ambilKoneksiDB();
  const targetAcaraId = req.acaraId || db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get()?.nilai;

  const peserta = cariPeserta(db, identifier.trim(), targetAcaraId);

  if (!peserta) {
    return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.', data: null });
  }

  if (peserta.status === STATUS_PESERTA.HADIR) {
    return res.status(409).json({ sukses: false, pesan: 'Peserta ini sudah melakukan check-in.', data: peserta });
  }
  if (peserta.status === STATUS_PESERTA.MEMBATALKAN) {
    return res.status(409).json({ sukses: false, pesan: 'Peserta telah membatalkan kehadiran.', data: peserta });
  }
  if (peserta.status === STATUS_PESERTA.DIGANTIKAN) {
    return res.status(409).json({ sukses: false, pesan: 'Peserta ini sudah digantikan.', data: peserta });
  }

  const waktuCheckin = new Date().toISOString();
  db.prepare(`
    UPDATE peserta SET status = ?, waktu_checkin = ?, petugas_checkin = ? WHERE id = ?
  `).run(STATUS_PESERTA.HADIR, waktuCheckin, req.aktor, peserta.id);

  catatAuditLog(db, req.aktor, AKSI_LOG.CHECKIN, peserta.id, JSON.stringify({ waktu_checkin: waktuCheckin }), targetAcaraId);

  return res.json({
    sukses: true,
    pesan: `Check-in berhasil. Selamat datang, ${peserta.nama_lengkap}!`,
    data: db.prepare('SELECT * FROM peserta WHERE id = ?').get(peserta.id),
  });
};

exports.daftarWalkin = (req, res) => {
  const { nama_lengkap, instansi, jabatan, email, no_hp, foto_base64, tipe_peserta = 'internal', nik } = req.body;
  if (!nama_lengkap || !instansi || !jabatan || !email || !no_hp) {
    return res.status(400).json({ sukses: false, pesan: 'Semua field wajib diisi.', data: null });
  }
  if (!foto_base64) {
    return res.status(400).json({ error: 'Foto wajib diambil untuk pendaftaran walk-in.' });
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

  // Cek duplikat berdasarkan NIK/email sesuai tipe
  if (tipe_peserta === 'internal') {
    if (nik) {
      const pesertaNikAda = db.prepare('SELECT id, nama_lengkap AS nama, nomor_urut FROM peserta WHERE nik = ? AND acara_id = ?').get(nik, targetAcaraId);
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
      const pesertaEmailAda = db.prepare('SELECT id, nama_lengkap AS nama, nomor_urut FROM peserta WHERE email = ? AND acara_id = ?').get(email, targetAcaraId);
      if (pesertaEmailAda) {
        return res.status(409).json({
          error: 'duplikat',
          pesan: 'Email ini sudah terdaftar di acara ini.',
          data: { nama: pesertaEmailAda.nama, nomor_urut: pesertaEmailAda.nomor_urut, id: pesertaEmailAda.id }
        });
      }
    }
  }

  const emailAda = db.prepare('SELECT id FROM peserta WHERE acara_id = ? AND email = ?').get(targetAcaraId, email);
  if (emailAda) {
    return res.status(409).json({ sukses: false, pesan: 'Email sudah terdaftar untuk acara ini.', data: { id_terdaftar: emailAda.id } });
  }

  const maxUrut = db.prepare('SELECT MAX(nomor_urut) as max FROM peserta WHERE acara_id = ?').get(targetAcaraId);
  const nomorUrut = (maxUrut.max || 0) + 1;
  const idBaru = generateIdPeserta(nomorUrut, acara.kode_acara);
  const waktuSekarang = new Date().toISOString();
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
  const fotoPath = saveBase64Photo(foto_base64, filename);

  const prosesWalkIn = db.transaction(() => {
    db.prepare(`
      INSERT INTO peserta
        (id, acara_id, nomor_urut, nama_lengkap, instansi, jabatan, email, no_hp,
         foto_path, status, waktu_daftar, waktu_checkin, petugas_checkin, adalah_walkin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(idBaru, targetAcaraId, nomorUrut, nama_lengkap, instansi, jabatan, email, no_hp,
           fotoPath, STATUS_PESERTA.HADIR, waktuSekarang, waktuSekarang, req.aktor);

    catatAuditLog(db, req.aktor, AKSI_LOG.WALKIN, idBaru, JSON.stringify({ nama_lengkap, instansi, email }), targetAcaraId);
  });

  prosesWalkIn();
  return res.status(201).json({
    sukses: true,
    pesan: `Walk-in berhasil. ${nama_lengkap} telah terdaftar dan check-in.`,
    data: db.prepare('SELECT * FROM peserta WHERE id = ?').get(idBaru),
  });
};

exports.cetakUlangIdCard = (req, res) => {
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
};
