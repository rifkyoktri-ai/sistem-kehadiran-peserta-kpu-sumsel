// =============================================================================
// CONTROLLER PESERTA — Logika bisnis untuk endpoint publik peserta
// =============================================================================

const { validationResult } = require('express-validator');
const { ambilKoneksiDB } = require('../database/db');
const { STATUS_PESERTA, AKSI_LOG, PREFIX_ID, STATUS_REGISTRASI } = require('../constants');

function generateIdPeserta(nomorUrut) {
  return PREFIX_ID + String(nomorUrut).padStart(4, '0');
}

function catatAuditLog(db, aktor, aksi, idPeserta, detail = '') {
  db.prepare(`
    INSERT INTO audit_log (waktu, aktor, aksi, id_peserta, detail)
    VALUES (?, ?, ?, ?, ?)
  `).run(new Date().toISOString(), aktor, aksi, idPeserta, detail);
}

function ambilPengaturanAcara(db) {
  const rows = db.prepare('SELECT kunci, nilai FROM pengaturan_acara').all();
  return Object.fromEntries(rows.map((r) => [r.kunci, r.nilai]));
}

exports.ambilInfoAcara = (req, res) => {
  const db = ambilKoneksiDB();
  const pengaturan = ambilPengaturanAcara(db);
  const totalPeserta = db.prepare(
    "SELECT COUNT(*) as total FROM peserta WHERE status != 'membatalkan' AND status != 'digantikan'"
  ).get();

  return res.json({
    sukses: true,
    pesan: 'Info acara berhasil diambil.',
    data: {
      ...pengaturan,
      total_terdaftar: totalPeserta.total,
      sisa_kuota: parseInt(pengaturan.kuota_maksimal) - totalPeserta.total,
    },
  });
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
  const pengaturan = ambilPengaturanAcara(db);

  if (pengaturan.status_registrasi === STATUS_REGISTRASI.TUTUP) {
    return res.status(403).json({ sukses: false, pesan: 'Pendaftaran telah ditutup.', data: null });
  }

  const { nama_lengkap, instansi, jabatan, email, no_hp, catatan = '' } = req.body;
  const pesertaAda = db.prepare('SELECT id FROM peserta WHERE email = ?').get(email);
  if (pesertaAda) {
    return res.status(409).json({
      sukses: false,
      pesan: 'Email ini sudah terdaftar.',
      data: { id_terdaftar: pesertaAda.id },
    });
  }

  const totalAktif = db.prepare(
    "SELECT COUNT(*) as total FROM peserta WHERE status != 'membatalkan' AND status != 'digantikan'"
  ).get();

  if (totalAktif.total >= parseInt(pengaturan.kuota_maksimal)) {
    return res.status(409).json({ sukses: false, pesan: 'Kuota pendaftaran sudah penuh.', data: null });
  }

  const maxUrut = db.prepare('SELECT MAX(nomor_urut) as max FROM peserta').get();
  const nomorUrut = (maxUrut.max || 0) + 1;
  const idBaru = generateIdPeserta(nomorUrut);
  const waktuDaftar = new Date().toISOString();

  db.prepare(`
    INSERT INTO peserta
      (id, nomor_urut, nama_lengkap, instansi, jabatan, email, no_hp, catatan, waktu_daftar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(idBaru, nomorUrut, nama_lengkap, instansi, jabatan, email, no_hp, catatan, waktuDaftar);

  catatAuditLog(db, 'sistem', AKSI_LOG.REGISTRASI, idBaru,
    JSON.stringify({ nama_lengkap, instansi, jabatan, email })
  );

  return res.status(201).json({
    sukses: true,
    pesan: 'Registrasi berhasil. Simpan ID registrasi Anda.',
    data: db.prepare('SELECT * FROM peserta WHERE id = ?').get(idBaru),
  });
  } catch (err) {
    console.error('[REG ERROR]', err);
    return res.status(500).json({ sukses: false, pesan: err.message });
  }
};

exports.cekStatusPeserta = (req, res) => {
  const db = ambilKoneksiDB();
  const peserta = db.prepare('SELECT * FROM peserta WHERE email = ?').get(req.params.email);

  if (!peserta) {
    return res.status(404).json({ sukses: false, pesan: 'Email tidak ditemukan.', data: null });
  }
  return res.json({ sukses: true, pesan: 'Data peserta ditemukan.', data: peserta });
};

exports.infoPesertaById = (req, res) => {
  const db = ambilKoneksiDB();
  const peserta = db.prepare('SELECT * FROM peserta WHERE id = ?').get(req.params.id);

  if (!peserta) {
    return res.status(404).json({ sukses: false, pesan: 'ID registrasi tidak ditemukan.', data: null });
  }
  return res.json({ sukses: true, pesan: 'Data peserta ditemukan.', data: peserta });
};
