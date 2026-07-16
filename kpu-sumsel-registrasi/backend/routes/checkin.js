// =============================================================================
// ROUTE CHECK-IN — Endpoint check-in & walk-in hari-H (Petugas)
// =============================================================================

const express = require('express');
const { authPetugas } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validationResult');
const { VALID_INSTANSI, VALID_JABATAN } = require('../constants');

// Validasi untuk tandai hadir (identifier tidak boleh kosong)
const validasiTandaiHadir = [
  body('identifier')
    .notEmpty().withMessage('ID/identifier tidak boleh kosong.')
];

// Validasi untuk walk-in, sama seperti registrasi peserta
const validasiWalkin = [
  body('nama_lengkap')
    .trim()
    .notEmpty().withMessage('Nama lengkap wajib diisi.')
    .isString().withMessage('Nama lengkap harus berupa teks.')
    .isLength({ min: 3 }).withMessage('Nama lengkap minimal 3 karakter.'),
  body('instansi')
    .trim()
    .notEmpty().withMessage('Instansi wajib diisi.')
    .isString().withMessage('Instansi harus berupa teks.')
    .isIn(VALID_INSTANSI).withMessage('Nilai instansi tidak valid.'),
  body('jabatan')
    .trim()
    .notEmpty().withMessage('Jabatan wajib diisi.')
    .isString().withMessage('Jabatan harus berupa teks.')
    .isIn(VALID_JABATAN).withMessage('Nilai jabatan tidak valid.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email wajib diisi.')
    .isEmail().withMessage('Format email tidak valid.'),
  body('no_hp')
    .trim()
    .notEmpty().withMessage('Nomor HP wajib diisi.')
    .isString().withMessage('Nomor HP harus berupa teks.')
    .isLength({ min: 10 }).withMessage('Nomor HP minimal 10 karakter.')
    .matches(/^[0-9+]+$/).withMessage('Nomor HP hanya boleh berisi angka dan tanda +.'),
  body('catatan')
    .optional()
    .isString().withMessage('Catatan harus berupa teks.')
    .isLength({ max: 500 }).withMessage('Catatan maksimal 500 karakter.'),
];
const controller = require('../controllers/checkinController');

const router = express.Router();

// Endpoint publik untuk mendapatkan daftar acara yang tidak diarsip (untuk pilihan login petugas)
router.get('/acara-aktif', (req, res) => {
  try {
    const { ambilKoneksiDB } = require('../database/db');
    const db = ambilKoneksiDB();
    const daftarAcara = db.prepare("SELECT id, kode_acara, nama_acara, tanggal_acara FROM acara WHERE status_registrasi != 'arsip' ORDER BY waktu_dibuat DESC").all();
    return res.json({ sukses: true, data: daftarAcara });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }
});

// Endpoint login: verifikasi password petugas per-acara, kembalikan JWT token
router.post('/login', (req, res) => {
  const { password, id_acara } = req.body;
  const { PASSWORD_ADMIN } = require('../constants');
  const { buatToken } = require('../utils/jwt');
  const { ambilKoneksiDB } = require('../database/db');

  const hasil = { sukses: true, data: null };

  // 1. Cek admin password
  if (password === PASSWORD_ADMIN) {
    const token = buatToken({ aktor: 'admin', level: 'admin', acara_id: id_acara || '' });
    hasil.data = { token, level: 'petugas', level_akses: 'admin', id_acara: id_acara || '' };
    hasil.pesan = 'Login berhasil (Akses Admin).';
    return res.json(hasil);
  }

  // 2. Cek petugas password per-acara
  if (!id_acara) {
    return res.status(400).json({ sukses: false, pesan: 'Pilih acara terlebih dahulu.', data: null });
  }

  try {
    const db = ambilKoneksiDB();
    const acara = db.prepare('SELECT password_petugas, nama_acara FROM acara WHERE id = ?').get(id_acara);
    if (acara && password === acara.password_petugas) {
      const token = buatToken({ aktor: 'petugas', level: 'petugas', acara_id: id_acara });
      hasil.data = { token, level: 'petugas', level_akses: 'petugas', id_acara, nama_acara: acara.nama_acara };
      hasil.pesan = 'Login berhasil.';
      return res.json(hasil);
    }
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }

  return res.status(401).json({ sukses: false, pesan: 'Password salah untuk acara yang dipilih.', data: null });
});

// Semua route di sini butuh auth petugas
router.post('/validasi', authPetugas, controller.validasiPeserta);
router.post('/tandai-hadir', authPetugas, validasiTandaiHadir, validate, controller.tandaiHadir);
router.post('/walkin', authPetugas, validasiWalkin, validate, controller.daftarWalkin);
router.post('/cetak-ulang', authPetugas, controller.cetakUlangIdCard);

module.exports = router;
