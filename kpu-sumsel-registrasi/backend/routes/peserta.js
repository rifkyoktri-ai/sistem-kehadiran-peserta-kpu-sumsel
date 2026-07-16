// =============================================================================
// ROUTE PESERTA — Endpoint registrasi & cek status peserta (publik)
// =============================================================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const { validate } = require('../middleware/validationResult');
const { VALID_TIPE_PESERTA } = require('../constants');
const controller = require('../controllers/pesertaController');

const router = express.Router();

// Validasi input untuk registrasi
const validasiDaftar = [
  body('tipe_peserta')
    .trim()
    .notEmpty().withMessage('Tipe peserta wajib diisi.')
    .isIn(VALID_TIPE_PESERTA).withMessage('Nilai tipe peserta tidak valid. Harus internal atau eksternal.'),

  body('nama_lengkap')
    .trim()
    .notEmpty().withMessage('Nama lengkap wajib diisi.')
    .isString().withMessage('Nama lengkap harus berupa teks.')
    .isLength({ min: 3 }).withMessage('Nama lengkap minimal 3 karakter.'),

  body('instansi')
    .trim()
    .notEmpty().withMessage('Instansi wajib diisi.')
    .isString().withMessage('Instansi harus berupa teks.')
    .isLength({ min: 3, max: 150 }).withMessage('Instansi minimal 3 karakter.'),

  body('jabatan')
    .trim()
    .notEmpty().withMessage('Jabatan wajib diisi.')
    .isString().withMessage('Jabatan harus berupa teks.')
    .isLength({ min: 2, max: 100 }).withMessage('Jabatan minimal 2 karakter, maksimal 100 karakter.'),

  // Email wajib untuk eksternal, opsional untuk internal
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
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

// Middleware validasi email wajib untuk eksternal
const validasiEmailEksternal = (req, res, next) => {
  if (req.body.tipe_peserta === 'eksternal' && !req.body.email) {
    return res.status(400).json({
      sukses: false,
      pesan: 'Email wajib diisi untuk peserta eksternal.',
      data: null,
    });
  }
  next();
};

// Endpoint publik
router.get('/acara/info', controller.ambilInfoAcara);
router.post('/peserta/daftar', validasiDaftar, validate, validasiEmailEksternal, controller.daftarPeserta);
router.post('/peserta/cek-status', controller.cekStatusPeserta);
router.get('/peserta/info/:id', controller.infoPesertaById);

module.exports = router;
