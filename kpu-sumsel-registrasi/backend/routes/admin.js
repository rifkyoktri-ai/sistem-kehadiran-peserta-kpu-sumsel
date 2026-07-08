// =============================================================================
// ROUTE ADMIN — Manajemen data peserta & pengaturan acara (Admin Only)
// =============================================================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const { authAdmin } = require('../middleware/auth');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validationResult');
const ctrlPeserta = require('../controllers/adminPesertaController');
const ctrlAcara = require('../controllers/adminAcaraController');

const router = express.Router();

// Endpoint login: verifikasi password admin
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.PASSWORD_ADMIN || password === require('../constants').PASSWORD_ADMIN) {
    return res.json({ sukses: true, pesan: 'Login berhasil.', data: { level: 'admin', username: 'admin' } });
  }
  return res.status(401).json({ sukses: false, pesan: 'Password salah.', data: null });
});

// Semua route di sini butuh auth admin
router.get('/peserta', authAdmin, ctrlPeserta.ambilDaftarPeserta);
router.put('/peserta/:id',
  authAdmin,
  [
    param('id').notEmpty().withMessage('ID peserta wajib diisi.'),
    body('nama_lengkap').optional().isString().isLength({ min: 3 }).withMessage('Nama lengkap minimal 3 karakter.'),
    body('instansi').optional().isString(),
    body('jabatan').optional().isString(),
    body('no_hp').optional().isString(),
    body('catatan').optional().isString()
  ],
  validate,
  ctrlPeserta.editPeserta);
router.post('/batalkan/:id',
  authAdmin,
  [
    param('id').notEmpty().withMessage('ID peserta wajib diisi.'),
    body('alasan').optional().isString()
  ],
  validate,
  ctrlPeserta.batalkanPeserta);
router.post('/ganti-peserta', authAdmin, ctrlPeserta.gantiPeserta);
router.delete('/peserta/:id/hapus', authAdmin, ctrlPeserta.hapusPeserta);

router.get('/rekap', authAdmin, ctrlAcara.ambilRekapAcara);
router.get('/export-csv', authAdmin, ctrlAcara.exportCSV);
router.get('/audit-log', authAdmin, ctrlAcara.ambilAuditLog);
router.get('/pengaturan', authAdmin, ctrlAcara.ambilPengaturanAcara);
router.put('/pengaturan', authAdmin, ctrlAcara.updatePengaturanAcara);

// Backup database
router.get('/backup', authAdmin, (req, res) => {
  const { ambilKoneksiDB } = require('../database/db');
  const dirBackup = path.join(__dirname, '..', 'backup');
  try {
    if (!fs.existsSync(dirBackup)) fs.mkdirSync(dirBackup, { recursive: true });
    const db = ambilKoneksiDB();
    const dataBuffer = Buffer.from(db._db.export());
    const namaBackup = `kpu_registrasi_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
    const pathBackup = path.join(dirBackup, namaBackup);
    fs.writeFileSync(pathBackup, dataBuffer);
    return res.json({ sukses: true, pesan: 'Backup berhasil.', data: { file: namaBackup } });
  } catch (err) {
    console.error('[BACKUP] Gagal:', err.message);
    return res.status(500).json({ sukses: false, pesan: 'Gagal backup: ' + err.message, data: null });
  }
});

module.exports = router;
