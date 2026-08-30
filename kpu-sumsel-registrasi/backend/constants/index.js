// =============================================================================
// KONSTANTA GLOBAL BACKEND — Sistem Registrasi KPU Provinsi Sumatera Selatan
// =============================================================================
// Password dibaca dari file .env — TIDAK BOLEH hardcode di source code!
// Lihat .env.example untuk template konfigurasi.
// =============================================================================

const PASSWORD_PETUGAS = process.env.PASSWORD_PETUGAS;
const PASSWORD_ADMIN = process.env.PASSWORD_ADMIN;
const USERNAME_ADMIN = process.env.USERNAME_ADMIN;

// Status yang valid untuk kolom 'status' pada tabel peserta
const STATUS_PESERTA = {
  TERDAFTAR  : 'terdaftar',   // Sudah registrasi, belum check-in
  HADIR      : 'hadir',       // Sudah check-in di lokasi acara
  MEMBATALKAN: 'membatalkan', // Peserta membatalkan kehadiran
  DIGANTIKAN : 'digantikan',  // Peserta digantikan orang lain
};

// Aksi yang valid untuk kolom 'aksi' pada tabel audit_log
const AKSI_LOG = {
  REGISTRASI       : 'REGISTRASI',        // Peserta baru mendaftar
  CHECKIN          : 'CHECKIN',           // Peserta melakukan check-in
  EDIT_DATA        : 'EDIT_DATA',         // Admin mengedit data peserta
  BATALKAN         : 'BATALKAN',          // Admin membatalkan pendaftaran
  GANTI_PESERTA    : 'GANTI_PESERTA',     // Admin memproses penggantian peserta
  CETAK_ULANG      : 'CETAK_ULANG',       // Petugas mencetak ulang ID Card
  WALKIN           : 'WALKIN',            // Pendaftaran walk-in hari-H
  TAMBAH_ACARA     : 'TAMBAH_ACARA',      // Admin membuat acara baru
  UPDATE_PENGATURAN: 'UPDATE_PENGATURAN', // Admin mengubah pengaturan acara
  SET_ACARA_AKTIF  : 'SET_ACARA_AKTIF',  // Admin mengaktifkan acara tertentu
  HAPUS_ACARA      : 'HAPUS_ACARA',      // Admin menghapus acara beserta pesertanya
};

// Kuota default peserta maksimal
const KUOTA_DEFAULT = 500;

// Nilai kunci pengaturan registrasi
const STATUS_REGISTRASI = {
  BUKA : 'buka',
  TUTUP: 'tutup',
};

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

const VALID_TIPE_PESERTA = ['internal', 'eksternal'];

const VALID_INSTANSI = [
  "KPU SUMATERA SELATAN",
  "KPU OGAN KOMERING ULU",
  "KPU OGAN KOMERING ILIR",
  "KPU MUARA ENIM",
  "KPU LAHAT",
  "KPU MUSI RAWAS",
  "KPU MUSI BANYUASIN",
  "KPU BANYUASIN",
  "KPU OGAN KOMERING ULU TIMUR",
  "KPU OGAN KOMERING ULU SELATAN",
  "KPU OGAN ILIR",
  "KPU EMPAT LAWANG",
  "KPU PENUKAL ABAB LEMATANG ILIR",
  "KPU MUSI RAWAS UTARA",
  "KPU PALEMBANG",
  "KPU PAGAR ALAM",
  "KPU LUBUK LINGGAU",
  "KPU PRABUMULIH",
  "Lainnya",
];

const VALID_INSTANSI_EKSTERNAL = [
  "KODAM II SRIWIJAYA",
  "KEPOLISIAN DAERAH SUMATERA SELATAN",
  "KANWIL DIRJEN PERMASYARAKATAN PROVINSI SUMATERA SELATAN",
  "BAWASLU PROVINSI SUMATERA SELATAN",
  "DISDUKCAPIL PROVINSI SUMATERA SELATAN",
  "KESBANGPOL PROVINSI SUMATERA SELATAN",
  "Lainnya",
];

// Gabungan semua instansi yang valid (internal + eksternal)
const VALID_INSTANSI_ALL = [...VALID_INSTANSI, ...VALID_INSTANSI_EKSTERNAL];

module.exports = {
  PASSWORD_PETUGAS,
  PASSWORD_ADMIN,
  USERNAME_ADMIN,
  STATUS_PESERTA,
  AKSI_LOG,
  KUOTA_DEFAULT,
  STATUS_REGISTRASI,
  JWT_SECRET,
  JWT_EXPIRY,
  VALID_TIPE_PESERTA,
  VALID_INSTANSI,
  VALID_INSTANSI_EKSTERNAL,
  VALID_INSTANSI_ALL,
};
