// =============================================================================
// CONTROLLER ADMIN PESERTA — Operasi CRUD & Status Peserta oleh Admin
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

exports.ambilDaftarPeserta = (req, res) => {
  const db = ambilKoneksiDB();
  const { status, search, halaman = 1, per_halaman = 50 } = req.query;

  let query = 'SELECT * FROM peserta WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (nama_lengkap LIKE ? OR instansi LIKE ? OR email LIKE ? OR id LIKE ?)';
    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword, keyword);
  }

  query += ' ORDER BY nomor_urut ASC';
  const offset = (parseInt(halaman) - 1) * parseInt(per_halaman);
  const queryPage = query + ` LIMIT ? OFFSET ?`;

  const daftarPeserta = db.prepare(queryPage).all(...params, parseInt(per_halaman), offset);
  const totalRow = db.prepare(`SELECT COUNT(*) as total FROM (${query})`).get(...params);

  return res.json({
    sukses: true,
    pesan: 'Daftar peserta berhasil diambil.',
    data: {
      peserta: daftarPeserta,
      total: totalRow.total,
      halaman: parseInt(halaman),
      per_halaman: parseInt(per_halaman),
      total_halaman: Math.ceil(totalRow.total / parseInt(per_halaman)),
    },
  });
};

exports.editPeserta = (req, res) => {
  const db = ambilKoneksiDB();
  const peserta = db.prepare('SELECT * FROM peserta WHERE id = ?').get(req.params.id);
  if (!peserta) {
    return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.', data: null });
  }

  const FIELD_BOLEH_EDIT = ['nama_lengkap', 'instansi', 'jabatan', 'no_hp', 'catatan'];
  const perubahan = {};
  const setClause = [];
  const params = [];

  for (const field of FIELD_BOLEH_EDIT) {
    if (req.body[field] !== undefined && req.body[field] !== peserta[field]) {
      perubahan[field] = { lama: peserta[field], baru: req.body[field] };
      setClause.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  if (setClause.length === 0) {
    return res.json({ sukses: true, pesan: 'Tidak ada perubahan data.', data: peserta });
  }

  params.push(req.params.id);
  db.prepare(`UPDATE peserta SET ${setClause.join(', ')} WHERE id = ?`).run(...params);
  catatAuditLog(db, req.aktor, AKSI_LOG.EDIT_DATA, req.params.id, JSON.stringify(perubahan));

  return res.json({
    sukses: true,
    pesan: 'Data peserta berhasil diperbarui.',
    data: db.prepare('SELECT * FROM peserta WHERE id = ?').get(req.params.id),
  });
};

exports.batalkanPeserta = (req, res) => {
  const db = ambilKoneksiDB();
  const peserta = db.prepare('SELECT * FROM peserta WHERE id = ?').get(req.params.id);
  if (!peserta) {
    return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.', data: null });
  }

  if (peserta.status === STATUS_PESERTA.MEMBATALKAN) {
    return res.status(409).json({ sukses: false, pesan: 'Peserta sudah batal.', data: peserta });
  }

  db.prepare("UPDATE peserta SET status = ? WHERE id = ?").run(STATUS_PESERTA.MEMBATALKAN, req.params.id);
  catatAuditLog(db, req.aktor, AKSI_LOG.BATALKAN, req.params.id, JSON.stringify({ alasan: req.body.alasan || '' }));

  return res.json({ sukses: true, pesan: 'Pendaftaran peserta telah dibatalkan.', data: { id: req.params.id } });
};

exports.gantiPeserta = (req, res) => {
  const { id_peserta_lama, nama_baru, instansi_baru, jabatan_baru, email_baru, no_hp_baru } = req.body;
  if (!id_peserta_lama || !nama_baru || !instansi_baru || !jabatan_baru || !email_baru || !no_hp_baru) {
    return res.status(400).json({ sukses: false, pesan: 'Semua field wajib diisi.', data: null });
  }

  const db = ambilKoneksiDB();
  const pesertaLama = db.prepare('SELECT * FROM peserta WHERE id = ?').get(id_peserta_lama);
  if (!pesertaLama) {
    return res.status(404).json({ sukses: false, pesan: 'Peserta lama tidak ditemukan.', data: null });
  }

  if (db.prepare('SELECT id FROM peserta WHERE email = ?').get(email_baru)) {
    return res.status(409).json({ sukses: false, pesan: 'Email pengganti sudah terdaftar.', data: null });
  }

  const nomorUrut = db.prepare('SELECT COUNT(*) as total FROM peserta').get().total + 1;
  const idBaru = generateIdPeserta(nomorUrut);
  const waktuSekarang = new Date().toISOString();

  const prosesGanti = db.transaction(() => {
    db.prepare("UPDATE peserta SET status = ?, id_pengganti = ? WHERE id = ?")
      .run(STATUS_PESERTA.DIGANTIKAN, idBaru, id_peserta_lama);

    db.prepare(`
      INSERT INTO peserta (id, nomor_urut, nama_lengkap, instansi, jabatan, email, no_hp, id_digantikan, waktu_daftar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(idBaru, nomorUrut, nama_baru, instansi_baru, jabatan_baru, email_baru, no_hp_baru, id_peserta_lama, waktuSekarang);

    catatAuditLog(db, req.aktor, AKSI_LOG.GANTI_PESERTA, id_peserta_lama, JSON.stringify({ digantikan_oleh: idBaru }));
    catatAuditLog(db, req.aktor, AKSI_LOG.GANTI_PESERTA, idBaru, JSON.stringify({ menggantikan: id_peserta_lama }));
  });

  prosesGanti();
  return res.status(201).json({
    sukses: true,
    pesan: 'Penggantian peserta berhasil.',
    data: {
      peserta_lama: db.prepare('SELECT * FROM peserta WHERE id = ?').get(id_peserta_lama),
      peserta_baru: db.prepare('SELECT * FROM peserta WHERE id = ?').get(idBaru),
    },
  });
};

exports.hapusPeserta = (req, res) => {
  const db = ambilKoneksiDB();
  const peserta = db.prepare('SELECT * FROM peserta WHERE id = ?').get(req.params.id);
  if (!peserta) {
    return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.', data: null });
  }

  const prosesHapus = db.transaction(() => {
    db.prepare('DELETE FROM audit_log WHERE id_peserta = ?').run(req.params.id);
    db.prepare('DELETE FROM peserta WHERE id = ?').run(req.params.id);
  });

  prosesHapus();
  return res.json({
    sukses: true,
    pesan: `Peserta ${peserta.nama_lengkap} (${peserta.id}) telah dihapus permanen.`,
    data: null,
  });
};
