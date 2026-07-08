// =============================================================================
// CONTROLLER CHECK-IN — Logika bisnis check-in hari-H untuk petugas lapangan
// =============================================================================

const { ambilKoneksiDB } = require('../database/db');
const { STATUS_PESERTA, AKSI_LOG, PREFIX_ID } = require('../constants');

function catatAuditLog(db, aktor, aksi, idPeserta, detail = '') {
  db.prepare(`
    INSERT INTO audit_log (waktu, aktor, aksi, id_peserta, detail)
    VALUES (?, ?, ?, ?, ?)
  `).run(new Date().toISOString(), aktor, aksi, idPeserta, detail);
}

function generateIdPeserta(nomorUrut) {
  return PREFIX_ID + String(nomorUrut).padStart(4, '0');
}

function cariPeserta(db, identifier) {
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
  const peserta = cariPeserta(db, identifier.trim());

  if (!peserta) {
    return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.', data: null });
  }
  return res.json({ sukses: true, pesan: 'Peserta ditemukan.', data: peserta });
};

exports.tandaiHadir = (req, res) => {
  const identifier = req.body.identifier || req.body.id;
  if (!identifier) {
    return res.status(400).json({ sukses: false, pesan: 'ID registrasi atau email wajib diisi.', data: null });
  }

  const db = ambilKoneksiDB();
  const peserta = cariPeserta(db, identifier.trim());

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

  catatAuditLog(db, req.aktor, AKSI_LOG.CHECKIN, peserta.id, JSON.stringify({ waktu_checkin: waktuCheckin }));

  return res.json({
    sukses: true,
    pesan: `Check-in berhasil. Selamat datang, ${peserta.nama_lengkap}!`,
    data: db.prepare('SELECT * FROM peserta WHERE id = ?').get(peserta.id),
  });
};

exports.daftarWalkin = (req, res) => {
  const { nama_lengkap, instansi, jabatan, email, no_hp } = req.body;
  if (!nama_lengkap || !instansi || !jabatan || !email || !no_hp) {
    return res.status(400).json({ sukses: false, pesan: 'Semua field wajib diisi.', data: null });
  }

  const db = ambilKoneksiDB();
  const emailAda = db.prepare('SELECT id FROM peserta WHERE email = ?').get(email);
  if (emailAda) {
    return res.status(409).json({ sukses: false, pesan: 'Email sudah terdaftar.', data: { id_terdaftar: emailAda.id } });
  }

  const totalSeluruh = db.prepare('SELECT COUNT(*) as total FROM peserta').get();
  const nomorUrut = totalSeluruh.total + 1;
  const idBaru = generateIdPeserta(nomorUrut);
  const waktuSekarang = new Date().toISOString();

  const prosesWalkIn = db.transaction(() => {
    db.prepare(`
      INSERT INTO peserta
        (id, nomor_urut, nama_lengkap, instansi, jabatan, email, no_hp,
         status, waktu_daftar, waktu_checkin, petugas_checkin, adalah_walkin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(idBaru, nomorUrut, nama_lengkap, instansi, jabatan, email, no_hp,
           STATUS_PESERTA.HADIR, waktuSekarang, waktuSekarang, req.aktor);

    catatAuditLog(db, req.aktor, AKSI_LOG.WALKIN, idBaru, JSON.stringify({ nama_lengkap, instansi, email }));
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
    JSON.stringify({ alasan: req.body.alasan || 'Tidak ada keterangan' })
  );

  return res.json({ sukses: true, pesan: 'Permintaan cetak ulang telah dicatat.', data: { id_peserta } });
};
