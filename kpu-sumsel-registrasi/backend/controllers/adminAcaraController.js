// =============================================================================
// CONTROLLER ADMIN ACARA — Statistik, Pengaturan & Export CSV Acara oleh Admin
// =============================================================================

const { ambilKoneksiDB } = require('../database/db');
const { STATUS_PESERTA } = require('../constants');

exports.ambilRekapAcara = (req, res) => {
  const db = ambilKoneksiDB();
  const hitungStatus = (status) =>
    db.prepare('SELECT COUNT(*) as total FROM peserta WHERE status = ?').get(status).total;

  const totalTerdaftar = hitungStatus(STATUS_PESERTA.TERDAFTAR);
  const totalHadir = hitungStatus(STATUS_PESERTA.HADIR);
  const totalMembatalkan = hitungStatus(STATUS_PESERTA.MEMBATALKAN);
  const totalDigantikan = hitungStatus(STATUS_PESERTA.DIGANTIKAN);
  const totalWalkin = db.prepare('SELECT COUNT(*) as total FROM peserta WHERE adalah_walkin = 1').get().total;
  const totalSeluruh = db.prepare('SELECT COUNT(*) as total FROM peserta').get().total;
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
};

exports.exportCSV = (req, res) => {
  const db = ambilKoneksiDB();
  const semua = db.prepare('SELECT * FROM peserta ORDER BY nomor_urut ASC').all();
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

  const isiCSV = [header, ...baris].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="peserta-kpu-sumsel.csv"');
  return res.send('\uFEFF' + isiCSV);
};

exports.ambilAuditLog = (req, res) => {
  const db = ambilKoneksiDB();
  const { id_peserta, aksi } = req.query;

  let query = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];

  if (id_peserta) { query += ' AND id_peserta = ?'; params.push(id_peserta); }
  if (aksi) { query += ' AND aksi = ?'; params.push(aksi); }

  query += ' ORDER BY id DESC LIMIT 500';
  const logs = db.prepare(query).all(...params);

  return res.json({ sukses: true, pesan: 'Audit log berhasil diambil.', data: logs });
};

exports.ambilPengaturanAcara = (req, res) => {
  const db = ambilKoneksiDB();
  const pengaturan = Object.fromEntries(
    db.prepare('SELECT kunci, nilai FROM pengaturan_acara').all().map((r) => [r.kunci, r.nilai])
  );
  return res.json({ sukses: true, pesan: 'Pengaturan berhasil diambil.', data: pengaturan });
};

exports.updatePengaturanAcara = (req, res) => {
  const db = ambilKoneksiDB();
  const KUNCI_VALID = [
    'nama_acara', 'tanggal_acara', 'waktu_acara', 'lokasi_acara',
    'kuota_maksimal', 'deadline_registrasi', 'status_registrasi',
  ];

  const upsert = db.prepare('INSERT OR REPLACE INTO pengaturan_acara (kunci, nilai) VALUES (?, ?)');
  const updateBanyak = db.transaction((data) => {
    for (const kunci of KUNCI_VALID) {
      if (data[kunci] !== undefined) {
        upsert.run(kunci, String(data[kunci]));
      }
    }
  });

  updateBanyak(req.body);
  const pengaturanBaru = Object.fromEntries(
    db.prepare('SELECT kunci, nilai FROM pengaturan_acara').all().map((r) => [r.kunci, r.nilai])
  );

  return res.json({ sukses: true, pesan: 'Pengaturan acara berhasil diperbarui.', data: pengaturanBaru });
};
