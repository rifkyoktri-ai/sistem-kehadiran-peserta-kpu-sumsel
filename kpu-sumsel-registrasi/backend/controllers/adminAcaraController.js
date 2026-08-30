// =============================================================================
// CONTROLLER ADMIN ACARA — Statistik, Pengaturan & Export CSV (Multi-Acara)
// =============================================================================

const bcrypt = require('bcrypt');
const { ambilKoneksiDB } = require('../database/db');
const { STATUS_PESERTA, AKSI_LOG } = require('../constants');
const { catatAuditLog } = require('../utils/auditLog');

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
    const totalSeluruh = db.prepare("SELECT COUNT(*) as total FROM peserta WHERE acara_id = ?").get(targetAcaraId).total;
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
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

// Helper: format timestamp ISO → "29 Agustus 2026 14.51 WIB"
function formatWaktuWIB(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  const jam   = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()} ${jam}.${menit} WIB`;
}

// Helper: format nomor HP → "0812-3456-7890"
function formatHP(hp) {
  if (!hp) return '';
  let s = String(hp).replace(/\D/g, '');
  if (s.startsWith('62')) s = '0' + s.slice(2);
  if (s.length >= 10) {
    return s.slice(0,4) + '-' + s.slice(4,8) + '-' + s.slice(8);
  }
  return s;
}

// Helper: RFC-4180 CSV escape dengan separator titik koma
function csvEscape(val) {
  const s = val === null || val === undefined ? '' : String(val);
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const LABEL_STATUS = {
  hadir: 'HADIR',
  terdaftar: 'BELUM HADIR',
  membatalkan: 'MEMBATALKAN',
  digantikan: 'DIGANTIKAN',
};

const LABEL_KATEGORI = {
  internal_kpu: 'Internal KPU',
  eksternal: 'Eksternal Resmi',
  lainnya: 'Instansi Lainnya',
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

    const semua = db.prepare("SELECT *, COALESCE(kategori_instansi, 'lainnya') as kategori_instansi FROM peserta WHERE acara_id = ? ORDER BY nomor_urut ASC").all(targetAcaraId);
    const acara = db.prepare('SELECT * FROM acara WHERE id = ?').get(targetAcaraId);
    
    const sekarang = new Date();
    const waktuEkspor = formatWaktuWIB(sekarang.toISOString());
    const namaAcara = (acara ? acara.nama_acara : 'acara');
    const namaAcaraClean = namaAcara.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const tanggal = sekarang.toISOString().slice(0, 10);
    const namaFile = `peserta_${namaAcaraClean}_${tanggal}.csv`;

    // Header identitas dokumen (3 baris)
    const identitas = [
      `Data Peserta Kegiatan - ${namaAcara}`,
      `Diekspor pada: ${waktuEkspor}  |  Total Peserta: ${semua.length} orang`,
      '', // baris kosong
    ];

    const SEP = ';';
    const header = [
      'No.',
      'ID Registrasi',
      'Nama Lengkap',
      'Jabatan',
      'Instansi / Unit Kerja',
      'Tipe Peserta',
      'No. HP',
      'Status Kehadiran',
      'Walk-In',
      'Waktu Pendaftaran',
      'Waktu Hadir',
      'Catatan Peserta',
      'Keterangan Kehadiran'
    ].join(SEP);

    const baris = semua.map((p) => {
      let nomorReg = '';
      if (p.nomor_urut) {
        nomorReg = String(p.nomor_urut).includes('-') ? p.nomor_urut
          : `${p.tipe_peserta === 'internal' ? 'KPU' : 'EKS'}-${String(p.nomor_urut).padStart(4, '0')}`;
      }

      // Keterangan Kehadiran spesifik
      const keteranganKehadiran = p.adalah_walkin 
        ? 'Registrasi di lokasi acara' 
        : '-';

      return [
        csvEscape(p.nomor_urut),
        csvEscape(nomorReg || p.id),
        csvEscape(p.nama_lengkap),
        csvEscape(p.jabatan),
        csvEscape(p.instansi),
        csvEscape(LABEL_KATEGORI[p.kategori_instansi] || p.kategori_instansi),
        csvEscape(formatHP(p.no_hp)),
        csvEscape(LABEL_STATUS[p.status] || p.status),
        p.adalah_walkin ? 'Ya' : 'Tidak',
        csvEscape(formatWaktuWIB(p.waktu_daftar)),
        csvEscape(formatWaktuWIB(p.waktu_checkin)),
        csvEscape(p.catatan || '-'),
        csvEscape(keteranganKehadiran),
      ].join(SEP);
    });

    const isiCSV = [...identitas, header, ...baris].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${namaFile}"`);
    return res.send('\uFEFF' + isiCSV);
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
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
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
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
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
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
        let value = String(req.body[col]);
        if (col === 'password_petugas') {
          // Jika password kosong atau merupakan hash bcrypt lama, jangan di-update
          if (!value || value.startsWith('$2b$')) {
            continue;
          }
          const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
          if (!strongPassword.test(value)) {
            return res.status(400).json({
              sukses: false,
              pesan: 'Password petugas harus minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka.',
              data: null
            });
          }
          value = bcrypt.hashSync(value, 12);
        }
        setClause.push(`${col} = ?`);
        params.push(value);
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

    // Catat field apa saja yang berubah (kecuali password untuk keamanan)
    const fieldDiubah = Object.keys(req.body).filter(k => k !== 'id_acara' && k !== 'password_petugas' && req.body[k] !== undefined);
    catatAuditLog(
      db,
      req.aktor || 'admin',
      AKSI_LOG.UPDATE_PENGATURAN,
      null,
      JSON.stringify({ id_acara: targetAcaraId, field_diubah: fieldDiubah }),
      targetAcaraId
    );

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
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
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
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
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

  // Validasi kekuatan password petugas
  if (password_petugas.length < 8) {
    return res.status(400).json({ sukses: false, pesan: 'Password petugas minimal 8 karakter.', data: null });
  }
  if (!/[A-Z]/.test(password_petugas) || !/[a-z]/.test(password_petugas) || !/[0-9]/.test(password_petugas)) {
    return res.status(400).json({ sukses: false, pesan: 'Password petugas harus mengandung huruf besar, huruf kecil, dan angka.', data: null });
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
    const hashedPassword = bcrypt.hashSync(password_petugas, 12);

    db.prepare(`
      INSERT INTO acara (id, kode_acara, nama_acara, tanggal_acara, waktu_acara, lokasi_acara, kuota_maksimal, deadline_registrasi, status_registrasi, password_petugas, waktu_dibuat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'buka', ?, ?)
    `).run(idAcara, cleanCode, nama_acara, tanggal_acara, waktu_acara, lokasi_acara, kuota, deadline_registrasi || '', hashedPassword, waktuDibuat);

    catatAuditLog(
      db,
      req.aktor || 'admin',
      AKSI_LOG.TAMBAH_ACARA,
      null,
      JSON.stringify({ id_acara: idAcara, kode_acara: cleanCode, nama_acara }),
      idAcara
    );

    return res.status(201).json({
      sukses: true,
      pesan: `Acara "${nama_acara}" berhasil dibuat.`,
      data: { id: idAcara, kode_acara: cleanCode }
    });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

exports.setAcaraAktif = (req, res) => {
  const { id_acara } = req.body;
  if (!id_acara) {
    return res.status(400).json({ sukses: false, pesan: 'ID acara wajib diisi.', data: null });
  }

  try {
    const db = ambilKoneksiDB();
    const ada = db.prepare('SELECT id, nama_acara FROM acara WHERE id = ?').get(id_acara);
    if (!ada) {
      return res.status(404).json({ sukses: false, pesan: 'Acara tidak ditemukan.', data: null });
    }

    db.prepare("INSERT OR REPLACE INTO pengaturan_acara (kunci, nilai) VALUES ('id_acara_aktif', ?)")
      .run(id_acara);

    catatAuditLog(
      db,
      req.aktor || 'admin',
      AKSI_LOG.SET_ACARA_AKTIF,
      null,
      JSON.stringify({ id_acara, nama_acara: ada.nama_acara }),
      id_acara
    );

    return res.json({ sukses: true, pesan: 'Acara aktif berhasil diubah.', data: { id_acara_aktif: id_acara } });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

exports.resetAuditLog = (req, res) => {
  try {
    const db = ambilKoneksiDB();
    db.prepare('DELETE FROM audit_log').run();
    return res.json({ sukses: true, pesan: 'Seluruh audit log berhasil dihapus.', data: null });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};

exports.hapusAcara = (req, res) => {
  const { id } = req.params;

  try {
    const db = ambilKoneksiDB();

    // 1. Cek apakah acara ada
    const acara = db.prepare('SELECT * FROM acara WHERE id = ?').get(id);
    if (!acara) {
      return res.status(404).json({ sukses: false, pesan: 'Acara tidak ditemukan.', data: null });
    }

    // 2. Cek apakah ini acara aktif
    const activeRow = db.prepare("SELECT nilai FROM pengaturan_acara WHERE kunci = 'id_acara_aktif'").get();
    const idAcaraAktif = activeRow ? activeRow.nilai : null;
    if (id === idAcaraAktif) {
      return res.status(400).json({ sukses: false, pesan: 'Acara aktif tidak boleh dihapus. Silakan ganti acara aktif terlebih dahulu.', data: null });
    }

    // 3. Eksekusi hapus relasi dalam transaksi database
    const hapusTransaksi = db.transaction(() => {
      // Hapus data peserta acara tersebut
      db.prepare('DELETE FROM peserta WHERE acara_id = ?').run(id);
      
      // Hapus audit log terkait acara tersebut
      db.prepare('DELETE FROM audit_log WHERE acara_id = ?').run(id);

      // Hapus acaranya
      db.prepare('DELETE FROM acara WHERE id = ?').run(id);

      // Catat penghapusan ke audit log global (tidak terikat acara_id yang dihapus)
      catatAuditLog(
        db,
        req.aktor || 'admin',
        AKSI_LOG.HAPUS_ACARA,
        null,
        JSON.stringify({ id_acara: id, nama_acara: acara.nama_acara, kode_acara: acara.kode_acara }),
        null
      );
    });

    hapusTransaksi();

    return res.json({
      sukses: true,
      pesan: `Acara "${acara.nama_acara}" dan seluruh data terkait berhasil dihapus permanen.`,
      data: null
    });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Terjadi kesalahan internal server.', data: null });
  }
};
