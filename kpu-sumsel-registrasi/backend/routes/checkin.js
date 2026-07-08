// =============================================================================
// ROUTE CHECK-IN — Endpoint check-in & walk-in hari-H (Petugas)
// =============================================================================

const express = require('express');
const { authPetugas } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validationResult');

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
    .isLength({ min: 3 }).withMessage('Instansi minimal 3 karakter.'),
  body('jabatan')
    .trim()
    .notEmpty().withMessage('Jabatan wajib diisi.')
    .isString().withMessage('Jabatan harus berupa teks.'),
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

// Endpoint login: verifikasi password petugas
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.PASSWORD_PETUGAS || password === require('../constants').PASSWORD_PETUGAS ||
      password === require('../constants').PASSWORD_ADMIN) {
    return res.json({ sukses: true, pesan: 'Login berhasil.', data: { level: 'petugas' } });
  }
  return res.status(401).json({ sukses: false, pesan: 'Password salah.', data: null });
});

// Semua route di sini butuh auth petugas
router.post('/validasi', authPetugas, controller.validasiPeserta);
router.post('/tandai-hadir', authPetugas, validasiTandaiHadir, validate, controller.tandaiHadir);
router.post('/walkin', authPetugas, validasiWalkin, validate, controller.daftarWalkin);
router.post('/cetak-ulang', authPetugas, controller.cetakUlangIdCard);

module.exports = router;
