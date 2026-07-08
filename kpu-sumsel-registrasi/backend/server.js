// =============================================================================
// SERVER ENTRY POINT — Sistem Registrasi KPU Provinsi Sumatera Selatan
// =============================================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { inisialisasiDB, tutupKoneksiDB } = require('./database/db');
const { jalankanMigrasi } = require('./database/migrations');

// Import semua router
const routerPeserta = require('./routes/peserta');
const routerCheckin = require('./routes/checkin');
const routerAdmin = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware global
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api', routerPeserta);
app.use('/api/checkin', routerCheckin);
app.use('/api/admin', routerAdmin);

// Health check
app.get('/api/ping', (req, res) => {
  res.json({ sukses: true, pesan: 'Server aktif.', data: { waktu: new Date().toISOString() } });
});

// Handler error global – menangkap semua error yang tidak tertangkap di route manapun
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Log error detail hanya pada environment development untuk debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR] ', err);
  }
  // Respons JSON konsisten untuk client
  return res.status(500).json({
    sukses: false,
    pesan: 'Terjadi kesalahan pada server. Silakan hubungi tim teknis.',
  });
});

let server;

// Jalankan inisialisasi database secara async sebelum server listen
async function start() {
  try {
    await inisialisasiDB();
    jalankanMigrasi();

    server = app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log('  Server KPU Sumsel berjalan di port', PORT);
      console.log('  Health check: http://localhost:' + PORT + '/api/ping');
      console.log('='.repeat(60));
    });
  } catch (error) {
    console.error('Gagal menjalankan server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SERVER] Menerima sinyal berhenti. Menutup koneksi...');
  tutupKoneksiDB();
  if (server) {
    server.close(() => {
      console.log('[SERVER] Server berhasil dihentikan.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
