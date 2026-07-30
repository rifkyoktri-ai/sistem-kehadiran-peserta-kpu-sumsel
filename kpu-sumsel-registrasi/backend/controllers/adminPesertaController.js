// =============================================================================
// CONTROLLER ADMIN PESERTA — Operasi CRUD & Status Peserta oleh Admin (Multi-Acara)
// =============================================================================

const { ambilKoneksiDB } = require('../database/db');
const { STATUS_PESERTA, STATUS_DIHAPUS, AKSI_LOG } = require('../constants');
const { catatAuditLog } = require('../utils/auditLog');
const { generateIdPeserta } = require('../utils/helpers');
const { sanitizeInput } = require('../utils/sanitize');

exports.ambilDaftarPeserta = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const { status, search, halaman = 1, per_halaman = 50, id_acara } = req.query;

    // Tentukan acara_id target
    let targetAcaraId = id_acara;
    if (!targetAcaraId) {
      const activeRow = db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get();
      targetAcaraId = activeRow ? activeRow.nilai : null;
    }

    if (!targetAcaraId) {
      return res.status(400).json({ sukses: false, pesan: 'ID acara tidak ditentukan.', data: null });
    }

    // Validasi status terhadap daftar yang diizinkan
    const STATUS_VALID = Object.values(STATUS_PESERTA);
    if (status && !STATUS_VALID.includes(status)) {
      return res.status(400).json({ sukses: false, pesan: 'Status tidak valid.', data: null });
    }

    let query = 'SELECT * FROM peserta WHERE acara_id = ? AND (dihapus_pada IS NULL AND status != \'dihapus\')';
    const params = [targetAcaraId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (nama_lengkap LIKE ? OR instansi LIKE ? OR id LIKE ?)';
      const keyword = `%${search}%`;
      params.push(keyword, keyword, keyword);
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
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

exports.editPeserta = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const peserta = db.prepare('SELECT * FROM peserta WHERE id = ?').get(req.params.id);
    if (!peserta) {
      return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.', data: null });
    }

    const FIELD_BOLEH_EDIT = ['nama_lengkap', 'instansi', 'jabatan', 'no_hp', 'catatan'];
    const bersih = sanitizeInput(req.body, FIELD_BOLEH_EDIT);
    const perubahan = {};
    const setClause = [];
    const params = [];

    for (const field of FIELD_BOLEH_EDIT) {
      if (bersih[field] !== undefined && bersih[field] !== peserta[field]) {
        perubahan[field] = { lama: peserta[field], baru: bersih[field] };
        setClause.push(`${field} = ?`);
        params.push(bersih[field]);
      }
    }

    if (setClause.length === 0) {
      return res.json({ sukses: true, pesan: 'Tidak ada perubahan data.', data: peserta });
    }

    params.push(req.params.id);
    db.prepare(`UPDATE peserta SET ${setClause.join(', ')} WHERE id = ?`).run(...params);
    catatAuditLog(db, req.aktor, AKSI_LOG.EDIT_DATA, req.params.id, JSON.stringify(perubahan), peserta.acara_id);

    return res.json({
      sukses: true,
      pesan: 'Data peserta berhasil diperbarui.',
      data: db.prepare('SELECT * FROM peserta WHERE id = ?').get(req.params.id),
    });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

exports.batalkanPeserta = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const peserta = db.prepare('SELECT * FROM peserta WHERE id = ?').get(req.params.id);
    if (!peserta) {
      return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.', data: null });
    }

    if (peserta.status === STATUS_PESERTA.MEMBATALKAN) {
      return res.status(409).json({ sukses: false, pesan: 'Peserta sudah batal.', data: peserta });
    }

    db.prepare("UPDATE peserta SET status = ? WHERE id = ?").run(STATUS_PESERTA.MEMBATALKAN, req.params.id);
    catatAuditLog(db, req.aktor, AKSI_LOG.BATALKAN, req.params.id, JSON.stringify({ alasan: req.body.alasan || '' }), peserta.acara_id);

    return res.json({ sukses: true, pesan: 'Pendaftaran peserta telah dibatalkan.', data: { id: req.params.id } });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

exports.gantiPeserta = (req, res) => {
  const { id_peserta_lama, nama_baru, instansi_baru, jabatan_baru, no_hp_baru } = req.body;
  if (!id_peserta_lama || !nama_baru || !instansi_baru || !jabatan_baru || !no_hp_baru) {
    return res.status(400).json({ sukses: false, pesan: 'Semua field wajib diisi.', data: null });
  }

  try {
    const db = ambilKoneksiDB();
    const pesertaLama = db.prepare('SELECT * FROM peserta WHERE id = ?').get(id_peserta_lama);
    if (!pesertaLama) {
      return res.status(404).json({ sukses: false, pesan: 'Peserta lama tidak ditemukan.', data: null });
    }



    const acara = db.prepare('SELECT kode_acara FROM acara WHERE id = ?').get(pesertaLama.acara_id);
    const tipe_peserta = pesertaLama.tipe_peserta || 'internal';
    const maxRow = db.prepare(
      'SELECT MAX(nomor_urut) as max FROM peserta WHERE acara_id = ? AND tipe_peserta = ?'
    ).get(pesertaLama.acara_id, tipe_peserta);

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
    const waktuSekarang = new Date().toISOString();

    const prosesGanti = db.transaction(() => {
      db.prepare("UPDATE peserta SET status = ?, id_pengganti = ? WHERE id = ?")
        .run(STATUS_PESERTA.DIGANTIKAN, idBaru, id_peserta_lama);

      db.prepare(`
        INSERT INTO peserta (id, acara_id, nomor_urut, tipe_peserta, nama_lengkap, instansi, jabatan, no_hp, email, id_digantikan, waktu_daftar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(idBaru, pesertaLama.acara_id, nomorUrutStr, tipe_peserta, nama_baru, instansi_baru, jabatan_baru, no_hp_baru, pesertaLama.email || '', id_peserta_lama, waktuSekarang);

      catatAuditLog(db, req.aktor, AKSI_LOG.GANTI_PESERTA, id_peserta_lama, JSON.stringify({ digantikan_oleh: idBaru }), pesertaLama.acara_id);
      catatAuditLog(db, req.aktor, AKSI_LOG.GANTI_PESERTA, idBaru, JSON.stringify({ menggantikan: id_peserta_lama }), pesertaLama.acara_id);
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
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

exports.hapusPeserta = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const peserta = db.prepare('SELECT * FROM peserta WHERE id = ?').get(req.params.id);
    if (!peserta) {
      return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.', data: null });
    }

    const waktuSekarang = new Date().toISOString();
    db.prepare(`UPDATE peserta SET status = ?, dihapus_pada = ?, dihapus_oleh = ? WHERE id = ?`)
      .run(STATUS_DIHAPUS, waktuSekarang, req.aktor || 'admin', req.params.id);

    catatAuditLog(db, req.aktor, 'HAPUS_PESERTA', req.params.id,
      JSON.stringify({ nama: peserta.nama_lengkap, alasan: req.body.alasan || '' }),
      peserta.acara_id
    );

    return res.json({
      sukses: true,
      pesan: `Peserta ${peserta.nama_lengkap} (${peserta.id}) telah dihapus (soft delete).`,
      data: null,
    });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

