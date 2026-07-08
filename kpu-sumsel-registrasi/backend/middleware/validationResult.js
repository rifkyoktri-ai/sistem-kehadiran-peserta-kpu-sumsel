// =============================================================================
// VALIDATION RESULT MIDDLEWARE – menangani hasil express-validator
// =============================================================================

const { validationResult } = require('express-validator');

/**
 * validate – middleware untuk mengecek hasil validasi.
 * Jika ada error, mengembalikan response 400 dengan detail pesan.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      sukses: false,
      pesan: 'Validasi gagal.',
      data: errors.array().map(e => ({ field: e.param, message: e.msg })),
    });
  }
  next();
};

module.exports = { validate };
