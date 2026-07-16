// =============================================================================
// CONTROLLER ADMIN ACARA — Statistik, Pengaturan & Export CSV (Multi-Acara)
// =============================================================================

const { ambilKoneksiDB } = require('../database/db');
const { STATUS_PESERTA } = require('../constants');

exports.ambilRekapAcara = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const { id_acara } = req.query;

    let targetAcaraId = id_acara;
    if (!targetAcaraId) {
      const activeRow = db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get();
      targetAcaraId = activeRow ? activeRow.nilai : null;
    }

    if (!targetAcaraId) {
      return res.status(400).json({ sukses: false, pesan: 'ID acara tidak ditentukan.', data: null });
    }

    const hitungStatus = (status) =>
      db.prepare('SELECT COUNT(*) as total FROM peserta WHERE acara_id = ? AND status = ?').get(targetAcaraId, status).total;

    const totalTerdaftar = hitungStatus(STATUS_PESERTA.TERDAFTAR);
    const totalHadir = hitungStatus(STATUS_PESERTA.HADIR);
    const totalMembatalkan = hitungStatus(STATUS_PESERTA.MEMBATALKAN);
    const totalDigantikan = hitungStatus(STATUS_PESERTA.DIGANTIKAN);
    const totalWalkin = db.prepare('SELECT COUNT(*) as total FROM peserta WHERE acara_id = ? AND adalah_walkin = 1').get(targetAcaraId).total;
    const totalSeluruh = db.prepare('SELECT COUNT(*) as total FROM peserta WHERE acara_id = ?').get(targetAcaraId).total;
    const totalAktif = totalTerdaftar + totalHadir;

    return res.json({
      sukses: true,
      pesan: 'Rekap berhasil diambil.',
      data: {
        total_terdaftar: totalTerdaftar,
        total_hadir: totalHadir,
        total_membatalkan: totalMembatalkan,
        total_digantikan: totalDigantikan,
        total_walkin: totalWalkin,
        total_aktif: totalAktif,
        total_seluruh: totalSeluruh,
        persentase_hadir: totalAktif > 0 ? ((totalHadir / totalAktif) * 100).toFixed(1) : '0.0',
      },
    });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }
};

exports.exportCSV = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const { id_acara } = req.query;

    let targetAcaraId = id_acara;
    if (!targetAcaraId) {
      const activeRow = db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get();
      targetAcaraId = activeRow ? activeRow.nilai : null;
    }

    if (!targetAcaraId) {
      return res.status(400).json({ sukses: false, pesan: 'ID acara tidak ditentukan.', data: null });
    }

    const semua = db.prepare('SELECT * FROM peserta WHERE acara_id = ? ORDER BY nomor_urut ASC').all(targetAcaraId);
    const header = 'No.|ID Registrasi|Nama Lengkap|Instansi|Jabatan|Email|No. HP|Status|Waktu Daftar|Waktu Check-in|Keterangan';

    const baris = semua.map((p) => [
      p.nomor_urut,
      p.id,
      `"${p.nama_lengkap}"`,
      `"${p.instansi}"`,
      `"${p.jabatan}"`,
      p.email,
      p.no_hp,
      p.status,
      p.waktu_daftar,
      p.waktu_checkin || '',
      p.adalah_walkin ? 'Walk-in' : '',
    ].join('|'));

    const acara = db.prepare('SELECT * FROM acara WHERE id = ?').get(targetAcaraId);
    const namaAcara = (acara ? acara.nama_acara : 'acara').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const tanggal = new Date().toISOString().slice(0, 10);
    const namaFile = `peserta_${namaAcara}_${tanggal}.csv`;

    const isiCSV = [header, ...baris].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${namaFile}"`);
    return res.send('\uFEFF' + isiCSV);
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }
};

exports.ambilAuditLog = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const { id_peserta, aksi, halaman = 1, per_halaman = 100, dari_tanggal, sampai_tanggal, id_acara } = req.query;

    let targetAcaraId = id_acara;
    if (!targetAcaraId) {
      const activeRow = db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get();
      targetAcaraId = activeRow ? activeRow.nilai : null;
    }

    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];

    if (targetAcaraId) { query += ' AND acara_id = ?'; params.push(targetAcaraId); }
    if (id_peserta) { query += ' AND id_peserta = ?'; params.push(id_peserta); }
    if (aksi) { query += ' AND aksi = ?'; params.push(aksi); }
    if (dari_tanggal) { query += ' AND waktu >= ?'; params.push(dari_tanggal); }
    if (sampai_tanggal) { query += ' AND waktu <= ?'; params.push(sampai_tanggal); }

    // Hitung total sebelum pagination
    const totalRow = db.prepare(`SELECT COUNT(*) as total FROM (${query})`).get(...params);

    const offset = (parseInt(halaman) - 1) * parseInt(per_halaman);
    query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    const logs = db.prepare(query).all(...params, parseInt(per_halaman), offset);

    return res.json({
      sukses: true,
      pesan: 'Audit log berhasil diambil.',
      data: {
        logs,
        total: totalRow.total,
        halaman: parseInt(halaman),
        per_halaman: parseInt(per_halaman),
        total_halaman: Math.ceil(totalRow.total / parseInt(per_halaman)),
      },
    });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }
};

exports.ambilPengaturanAcara = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const { id_acara } = req.query;

    let targetAcaraId = id_acara;
    if (!targetAcaraId) {
      const activeRow = db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get();
      targetAcaraId = activeRow ? activeRow.nilai : null;
    }

    if (!targetAcaraId) {
      return res.status(400).json({ sukses: false, pesan: 'ID acara tidak ditentukan.', data: null });
    }

    const acara = db.prepare('SELECT * FROM acara WHERE id = ?').get(targetAcaraId);
    if (!acara) {
      return res.status(404).json({ sukses: false, pesan: 'Acara tidak ditemukan.', data: null });
    }

    return res.json({
      sukses: true,
      pesan: 'Pengaturan berhasil diambil.',
      data: {
        nama_acara: acara.nama_acara,
        tanggal_acara: acara.tanggal_acara,
        waktu_acara: acara.waktu_acara,
        lokasi_acara: acara.lokasi_acara,
        kuota_maksimal: acara.kuota_maksimal,
        deadline_registrasi: acara.deadline_registrasi,
        status_registrasi: acara.status_registrasi,
        password_petugas: acara.password_petugas,
        kode_acara: acara.kode_acara,
        id: acara.id
      }
    });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }
};

exports.updatePengaturanAcara = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const { id_acara } = req.body;

    let targetAcaraId = id_acara;
    if (!targetAcaraId) {
      const activeRow = db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get();
      targetAcaraId = activeRow ? activeRow.nilai : null;
    }

    if (!targetAcaraId) {
      return res.status(400).json({ sukses: false, pesan: 'ID acara tidak ditentukan.', data: null });
    }

    const COLUMNS = [
      'nama_acara', 'tanggal_acara', 'waktu_acara', 'lokasi_acara',
      'kuota_maksimal', 'deadline_registrasi', 'status_registrasi', 'password_petugas'
    ];

    const setClause = [];
    const params = [];

    for (const col of COLUMNS) {
      if (req.body[col] !== undefined) {
        setClause.push(`${col} = ?`);
        params.push(String(req.body[col]));
      }
    }

    if (setClause.length > 0) {
      params.push(targetAcaraId);
      db.prepare(`UPDATE acara SET ${setClause.join(', ')} WHERE id = ?`).run(...params);
    }

    const acaraBaru = db.prepare('SELECT * FROM acara WHERE id = ?').get(targetAcaraId);
    if (!acaraBaru) {
      return res.status(404).json({ sukses: false, pesan: 'Acara tidak ditemukan.', data: null });
    }

    return res.json({
      sukses: true,
      pesan: 'Pengaturan acara berhasil diperbarui.',
      data: {
        id: acaraBaru.id,
        kode_acara: acaraBaru.kode_acara,
        nama_acara: acaraBaru.nama_acara,
        tanggal_acara: acaraBaru.tanggal_acara,
        waktu_acara: acaraBaru.waktu_acara,
        lokasi_acara: acaraBaru.lokasi_acara,
        kuota_maksimal: acaraBaru.kuota_maksimal,
        deadline_registrasi: acaraBaru.deadline_registrasi,
        status_registrasi: acaraBaru.status_registrasi,
        password_petugas: acaraBaru.password_petugas,
      }
    });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }
};

exports.ambilSemuaAcara = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const activeRow = db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get();
    const idAcaraAktif = activeRow ? activeRow.nilai : null;

    const listAcara = db.prepare('SELECT * FROM acara ORDER BY waktu_dibuat DESC').all();

    // Tandai mana yang aktif
    const data = listAcara.map(ac => ({
      ...ac,
      adalah_aktif: ac.id === idAcaraAktif
    }));

    return res.json({ sukses: true, data });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }
};

exports.tambahAcara = (req, res) => {
  const { kode_acara, nama_acara, tanggal_acara, waktu_acara, lokasi_acara, kuota_maksimal, deadline_registrasi, password_petugas } = req.body;

  if (!kode_acara || !nama_acara || !tanggal_acara || !waktu_acara || !lokasi_acara || !password_petugas) {
    return res.status(400).json({ sukses: false, pesan: 'Field wajib diisi: kode_acara, nama_acara, tanggal_acara, waktu_acara, lokasi_acara, password_petugas.', data: null });
  }

  // Bersihkan kode_acara agar formatnya seragam (uppercase, alphanumeric, strip)
  const cleanCode = kode_acara.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (cleanCode.length < 3) {
    return res.status(400).json({ sukses: false, pesan: 'Kode acara minimal 3 karakter alphanumeric.', data: null });
  }

  try {
    const db = ambilKoneksiDB();

    // Cek duplikasi kode_acara
    const ada = db.prepare('SELECT id FROM acara WHERE kode_acara = ?').get(cleanCode);
    if (ada) {
      return res.status(409).json({ sukses: false, pesan: `Kode acara "${cleanCode}" sudah digunakan.`, data: null });
    }

    const idAcara = 'ACR-' + Date.now();
    const waktuDibuat = new Date().toISOString();
    const kuota = parseInt(kuota_maksimal || '500', 10);

    db.prepare(`
      INSERT INTO acara (id, kode_acara, nama_acara, tanggal_acara, waktu_acara, lokasi_acara, kuota_maksimal, deadline_registrasi, status_registrasi, password_petugas, waktu_dibuat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'buka', ?, ?)
    `).run(idAcara, cleanCode, nama_acara, tanggal_acara, waktu_acara, lokasi_acara, kuota, deadline_registrasi || '', password_petugas, waktuDibuat);

    return res.status(201).json({
      sukses: true,
      pesan: `Acara "${nama_acara}" berhasil dibuat.`,
      data: { id: idAcara, kode_acara: cleanCode }
    });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }
};

exports.setAcaraAktif = (req, res) => {
  const { id_acara } = req.body;
  if (!id_acara) {
    return res.status(400).json({ sukses: false, pesan: 'ID acara wajib diisi.', data: null });
  }

  try {
    const db = ambilKoneksiDB();
    const ada = db.prepare('SELECT id FROM acara WHERE id = ?').get(id_acara);
    if (!ada) {
      return res.status(404).json({ sukses: false, pesan: 'Acara tidak ditemukan.', data: null });
    }

    db.prepare("INSERT OR REPLACE INTO pengaturan_acara (kunci, nilai) VALUES ('id_acara_aktif', ?)")
      .run(id_acara);

    return res.json({ sukses: true, pesan: 'Acara aktif berhasil diubah.', data: { id_acara_aktif: id_acara } });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }
};
