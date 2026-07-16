const express = require('express');
const { authPetugas } = require('../middleware/auth');
const { ambilKoneksiDB } = require('../database/db');
const { saveBase64Photo, generateFilename } = require('../utils/photo');

const router = express.Router();

router.post('/peserta/:id/foto', authPetugas, (req, res) => {
  try {
    const { foto_base64 } = req.body;
    if (!foto_base64) {
      return res.status(400).json({ sukses: false, pesan: 'foto_base64 wajib diisi.', data: null });
    }

    const db = ambilKoneksiDB();
    const peserta = db.prepare('SELECT * FROM peserta WHERE id = ?').get(req.params.id);
    if (!peserta) {
      return res.status(404).json({ sukses: false, pesan: 'Peserta tidak ditemukan.', data: null });
    }

    const filename = generateFilename();
    const fotoPath = saveBase64Photo(foto_base64, filename);
    db.prepare('UPDATE peserta SET foto_path = ? WHERE id = ?').run(fotoPath, req.params.id);

    return res.json({ sukses: true, pesan: 'Foto berhasil disimpan.', data: { foto_path: fotoPath } });
  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: err.message, data: null });
  }
});

module.exports = router;
