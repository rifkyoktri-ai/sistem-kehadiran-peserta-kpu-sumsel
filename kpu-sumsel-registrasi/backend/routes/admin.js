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
const { VALID_INSTANSI, VALID_JABATAN } = require('../constants');

const router = express.Router();

// Endpoint login: verifikasi password admin, kembalikan JWT token
router.post('/login', (req, res) => {
  const { password } = req.body;
  const { PASSWORD_ADMIN, JWT_SECRET } = require('../constants');
  const { buatToken } = require('../utils/jwt');

  if (password === PASSWORD_ADMIN) {
    const token = buatToken({ aktor: 'admin', level: 'admin', username: 'admin' });
    return res.json({ sukses: true, pesan: 'Login berhasil.', data: { token, level: 'admin', username: 'admin' } });
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
    body('instansi').optional().isString().isIn(VALID_INSTANSI).withMessage('Nilai instansi tidak valid.'),
    body('jabatan').optional().isString().isIn(VALID_JABATAN).withMessage('Nilai jabatan tidak valid.'),
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
router.post('/peserta/:id/kirim-ulang-email', authAdmin, ctrlPeserta.kirimUlangEmail);

router.get('/rekap', authAdmin, ctrlAcara.ambilRekapAcara);
router.get('/export-csv', authAdmin, ctrlAcara.exportCSV);
router.get('/audit-log', authAdmin, ctrlAcara.ambilAuditLog);
router.get('/pengaturan', authAdmin, ctrlAcara.ambilPengaturanAcara);
router.put('/pengaturan', authAdmin, ctrlAcara.updatePengaturanAcara);

router.get('/acara', authAdmin, ctrlAcara.ambilSemuaAcara);
router.post('/acara', authAdmin, ctrlAcara.tambahAcara);
router.put('/acara/aktif', authAdmin, ctrlAcara.setAcaraAktif);

// Backup database (dengan verifikasi + rotasi)
router.get('/backup', authAdmin, async (req, res) => {
  const { ambilKoneksiDB, LOKASI_DB } = require('../database/db');
  const dirBackup = path.join(__dirname, '..', 'backup');
  const MAX_BACKUP = 10;
  try {
    if (!fs.existsSync(dirBackup)) fs.mkdirSync(dirBackup, { recursive: true });

    const db = ambilKoneksiDB();
    db.pragma('wal_checkpoint(TRUNCATE)');

    const namaBackup = `kpu_registrasi_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
    const pathBackup = path.join(dirBackup, namaBackup);

    fs.copyFileSync(LOKASI_DB, pathBackup);

    // Verifikasi: buka file backup dan baca jumlah peserta
    const initSqlJs = require('sql.js');
    const sqlJsPromise = initSqlJs().then(SQL => {
      const backupBuffer = fs.readFileSync(pathBackup);
      const verifikasiDb = new SQL.Database(backupBuffer);
      const countResult = verifikasiDb.exec('SELECT COUNT(*) as c FROM peserta');
      const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;
      verifikasiDb.close();
      return count;
    });
    const pesertaCount = await sqlJsPromise;

    // Rotasi: hapus backup paling lama jika melebihi MAX_BACKUP
    const files = fs.readdirSync(dirBackup)
      .filter(f => f.endsWith('.db'))
      .map(f => ({ name: f, time: fs.statSync(path.join(dirBackup, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    while (files.length > MAX_BACKUP) {
      const hapus = files.pop();
      fs.unlinkSync(path.join(dirBackup, hapus.name));
      console.log('[BACKUP] Rotasi: hapus backup lama', hapus.name);
    }

    return res.json({ sukses: true, pesan: 'Backup berhasil.', data: { file: namaBackup, total_peserta: pesertaCount } });
  } catch (err) {
    console.error('[BACKUP] Gagal:', err.message);
    return res.status(500).json({ sukses: false, pesan: 'Gagal backup: ' + err.message, data: null });
  }
});

module.exports = router;
