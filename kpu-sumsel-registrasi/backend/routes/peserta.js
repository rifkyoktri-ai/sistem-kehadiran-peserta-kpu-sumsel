// =============================================================================
// ROUTE PESERTA — Endpoint registrasi & cek status peserta (publik)
// =============================================================================

const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validationResult');
const controller = require('../controllers/pesertaController');

const router = express.Router();

// Validasi input untuk registrasi
const validasiDaftar = [
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

// Endpoint publik
router.get('/acara/info', controller.ambilInfoAcara);
router.post('/peserta/daftar', validasiDaftar, validate, controller.daftarPeserta);
router.get('/peserta/cek/:email', controller.cekStatusPeserta);
router.get('/peserta/info/:id', controller.infoPesertaById);

module.exports = router;
