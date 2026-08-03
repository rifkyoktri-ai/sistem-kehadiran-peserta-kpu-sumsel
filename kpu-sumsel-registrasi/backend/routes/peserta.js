// =============================================================================
// ROUTE PESERTA — Endpoint registrasi & cek status peserta (publik)
// =============================================================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const { validate } = require('../middleware/validationResult');
const { VALID_TIPE_PESERTA } = require('../constants');
const { authPetugas } = require('../middleware/auth');
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

  body('foto_base64')
    .notEmpty().withMessage('Foto wajib diambil.')
    .isString().withMessage('Foto harus berupa data URL.'),
];



// Endpoint publik
router.get('/acara/info', controller.ambilInfoAcara);
router.post('/peserta/daftar', validasiDaftar, validate, controller.daftarPeserta);
router.post('/peserta/cek-status', controller.cekStatusPeserta);
router.get('/peserta/info/:id', controller.infoPesertaById);
router.get('/peserta/:id/pdf', controller.downloadIDCardPDF);
router.get('/peserta/by-nomor/:nomor_urut', authPetugas, controller.cariByNomorUrut);
router.put('/peserta/:id/hadir', authPetugas, controller.tandaiHadirById);


module.exports = router;
