// =============================================================================
// KONSTANTA GLOBAL BACKEND — Sistem Registrasi KPU Provinsi Sumatera Selatan
// =============================================================================
// PERINGATAN: Ganti password berikut sebelum deploy ke lingkungan produksi!
// =============================================================================

// Password akses petugas (untuk operasi check-in hari-H)
const PASSWORD_PETUGAS = 'KPU2026checkin';

// Password akses admin (untuk manajemen data penuh)
const PASSWORD_ADMIN = 'KPUAdmin@Sumsel26';

// Status yang valid untuk kolom 'status' pada tabel peserta
const STATUS_PESERTA = {
  TERDAFTAR  : 'terdaftar',   // Sudah registrasi, belum check-in
  HADIR      : 'hadir',       // Sudah check-in di lokasi acara
  MEMBATALKAN: 'membatalkan', // Peserta membatalkan kehadiran
  DIGANTIKAN : 'digantikan',  // Peserta digantikan orang lain
};

// Aksi yang valid untuk kolom 'aksi' pada tabel audit_log
const AKSI_LOG = {
  REGISTRASI   : 'REGISTRASI',    // Peserta baru mendaftar
  CHECKIN      : 'CHECKIN',       // Peserta melakukan check-in
  EDIT_DATA    : 'EDIT_DATA',     // Admin mengedit data peserta
  BATALKAN     : 'BATALKAN',      // Admin membatalkan pendaftaran
  GANTI_PESERTA: 'GANTI_PESERTA', // Admin memproses penggantian peserta
  CETAK_ULANG  : 'CETAK_ULANG',  // Petugas mencetak ulang ID Card
  WALKIN       : 'WALKIN',        // Pendaftaran walk-in hari-H
};

// Prefix ID peserta — format: KPU-SUMSEL-2026-XXXX
const PREFIX_ID = 'KPU-SUMSEL-2026-';

// Kuota default peserta maksimal
const KUOTA_DEFAULT = 500;

// Nilai kunci pengaturan registrasi
const STATUS_REGISTRASI = {
  BUKA : 'buka',
  TUTUP: 'tutup',
};

module.exports = {
  PASSWORD_PETUGAS,
  PASSWORD_ADMIN,
  STATUS_PESERTA,
  AKSI_LOG,
  PREFIX_ID,
  KUOTA_DEFAULT,
  STATUS_REGISTRASI,
};
