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
const logger = require('../utils/logger');
// VALID_INSTANSI dan VALID_JABATAN tidak digunakan di route ini

const router = express.Router();

// Endpoint login: verifikasi username & password admin, kembalikan JWT token
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const { USERNAME_ADMIN, PASSWORD_ADMIN, JWT_SECRET } = require('../constants');
  const { buatToken } = require('../utils/jwt');

  if (username === USERNAME_ADMIN && password === PASSWORD_ADMIN) {
    const token = buatToken({ aktor: 'admin', level: 'admin', username: 'admin' });
    return res.json({ sukses: true, pesan: 'Login berhasil.', data: { token, level: 'admin', username: 'admin' } });
  }
  return res.status(401).json({ sukses: false, pesan: 'Username atau password salah.', data: null });
});

// Semua route di sini butuh auth admin
router.get('/peserta', authAdmin, ctrlPeserta.ambilDaftarPeserta);
router.put('/peserta/:id',
  authAdmin,
  [
    param('id').notEmpty().withMessage('ID peserta wajib diisi.'),
    body('nama_lengkap').optional().isString().isLength({ min: 3 }).withMessage('Nama lengkap minimal 3 karakter.'),
    body('instansi').optional().isString().isLength({ min: 3, max: 150 }).withMessage('Instansi minimal 3 karakter.'),
    body('jabatan').optional().isString().isLength({ min: 2, max: 100 }).withMessage('Jabatan minimal 2 karakter.'),
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
router.delete('/audit-log', authAdmin, ctrlAcara.resetAuditLog);
router.get('/pengaturan', authAdmin, ctrlAcara.ambilPengaturanAcara);
router.put('/pengaturan', authAdmin, ctrlAcara.updatePengaturanAcara);

router.get('/acara', authAdmin, ctrlAcara.ambilSemuaAcara);
router.post('/acara', authAdmin, ctrlAcara.tambahAcara);
router.put('/acara/aktif', authAdmin, ctrlAcara.setAcaraAktif);
router.delete('/acara/:id', authAdmin, ctrlAcara.hapusAcara);

// Backup database (dengan verifikasi + rotasi)
router.get('/backup', authAdmin, async (req, res) => {
  const { ambilKoneksiDB, LOKASI_DB } = require('../database/db');
  const dirBackup = path.join(__dirname, '..', 'backup');
  const MAX_BACKUP = 10;
  try {
    if (!fs.existsSync(dirBackup)) fs.mkdirSync(dirBackup, { recursive: true });

    const db = ambilKoneksiDB();
    const pesertaCount = db.prepare('SELECT COUNT(*) as c FROM peserta').get().c;

    const namaBackup = `kpu_registrasi_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
    const pathBackup = path.join(dirBackup, namaBackup);

    fs.copyFileSync(LOKASI_DB, pathBackup);

    // Verifikasi: pastikan file backup benar-benar tersalin
    if (!fs.existsSync(pathBackup) || fs.statSync(pathBackup).size === 0) {
      throw new Error('File backup gagal diverifikasi.');
    }

    // Rotasi: hapus backup paling lama jika melebihi MAX_BACKUP
    const files = fs.readdirSync(dirBackup)
      .filter(f => f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(dirBackup, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    while (files.length > MAX_BACKUP) {
      const hapus = files.pop();
      fs.unlinkSync(path.join(dirBackup, hapus.name));
      logger.info({ file: hapus.name }, 'Backup rotation: removed old backup');
    }

    return res.json({ sukses: true, pesan: 'Backup berhasil.', data: { file: namaBackup, total_peserta: pesertaCount } });
  } catch (err) {
    logger.error({ err }, 'Backup failed');
    return res.status(500).json({ sukses: false, pesan: 'Gagal melakukan backup.', data: null });
  }
});

module.exports = router;
