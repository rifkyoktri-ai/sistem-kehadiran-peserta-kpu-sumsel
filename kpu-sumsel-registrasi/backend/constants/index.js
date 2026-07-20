// =============================================================================
// KONSTANTA GLOBAL BACKEND — Sistem Registrasi KPU Provinsi Sumatera Selatan
// =============================================================================
// Password dibaca dari file .env — TIDAK BOLEH hardcode di source code!
// Lihat .env.example untuk template konfigurasi.
// =============================================================================

// Password akses petugas (untuk operasi check-in hari-H)
const PASSWORD_PETUGAS = process.env.PASSWORD_PETUGAS;

// Password akses admin (untuk manajemen data penuh)
const PASSWORD_ADMIN = process.env.PASSWORD_ADMIN;

// Validasi: pastikan password sudah dikonfigurasi
if (!PASSWORD_PETUGAS || !PASSWORD_ADMIN) {
  console.error('='.repeat(60));
  console.error('  FATAL: PASSWORD_PETUGAS dan PASSWORD_ADMIN harus diatur di .env');
  console.error('  Lihat file .env.example untuk contoh konfigurasi.');
  console.error('='.repeat(60));
  process.exit(1);
}

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

// JWT Secret — digunakan untuk menandatangani token autentikasi
const JWT_SECRET = process.env.JWT_SECRET || 'kpu-sumsel-jwt-secret-change-in-production';
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
  "Pangdam II/Sriwijaya",
  "Kepolisian Daerah Sumatera Selatan",
  "Kanwil Dirjen Provinsi Sumatera Selatan",
  "Bawaslu Provinsi Sumatera Selatan",
  "Disdukcapil Provinsi Sumatera Selatan",
  "Kesbangpol Provinsi Sumatera Selatan",
  "Lainnya",
];

const VALID_JABATAN = [];
const VALID_JABATAN_EKSTERNAL = [];

// Gabungan semua instansi yang valid (internal + eksternal)
const VALID_INSTANSI_ALL = [...VALID_INSTANSI, ...VALID_INSTANSI_EKSTERNAL];
// Jabatan diketik bebas — tidak perlu list validasi
const VALID_JABATAN_ALL = [];

// SMTP — konfigurasi email notifikasi
const SMTP_HOST   = process.env.SMTP_HOST   || 'smtp.gmail.com';
const SMTP_PORT   = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE !== 'false';
const SMTP_USER   = process.env.SMTP_USER   || '';
const SMTP_PASS   = process.env.SMTP_PASS   || '';
const EMAIL_FROM  = process.env.EMAIL_FROM  || 'KPU Sumsel <noreply@kpu-sumsel.go.id>';

module.exports = {
  PASSWORD_PETUGAS,
  PASSWORD_ADMIN,
  STATUS_PESERTA,
  AKSI_LOG,
  PREFIX_ID,
  KUOTA_DEFAULT,
  STATUS_REGISTRASI,
  JWT_SECRET,
  JWT_EXPIRY,
  VALID_TIPE_PESERTA,
  VALID_INSTANSI,
  VALID_INSTANSI_EKSTERNAL,
  VALID_INSTANSI_ALL,
  VALID_JABATAN,
  VALID_JABATAN_EKSTERNAL,
  VALID_JABATAN_ALL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
};
