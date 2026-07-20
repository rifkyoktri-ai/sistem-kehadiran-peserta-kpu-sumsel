// =============================================================================
// SERVER ENTRY POINT — Sistem Registrasi KPU Provinsi Sumatera Selatan
// =============================================================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { inisialisasiDB, ambilKoneksiDB, tutupKoneksiDB } = require('./database/db');
const { jalankanMigrasi } = require('./database/migrations');
const { inisialisasiEmail } = require('./utils/email');

// Import semua router
const routerPeserta = require('./routes/peserta');
const routerCheckin = require('./routes/checkin');
const routerAdmin = require('./routes/admin');
const routerUpload = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Flag kesiapan database ──────────────────────────────────────────────────
let dbReady = false;

// ── Security Headers ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Nonaktifkan CSP agar frontend SPA bisa berjalan
  crossOriginEmbedderPolicy: false,
}));

// ── CORS Terbatas ───────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    // Izinkan request tanpa origin (curl, Postman, mobile app)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Diblokir oleh kebijakan CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-password', 'x-acara-id', 'Authorization'],
}));

app.use(express.json({ limit: '5mb' }));

// ── Rate Limiting untuk endpoint login ──────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,                   // Maks 10 percobaan per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    sukses: false,
    pesan: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
    data: null,
  },
});

// Terapkan rate limiter pada endpoint login
app.use('/api/admin/login', loginLimiter);
app.use('/api/checkin/login', loginLimiter);

// ── Middleware DB-Ready ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (!dbReady && req.path !== '/api/ping') {
    return res.status(503).json({
      sukses: false,
      pesan: 'Server sedang mempersiapkan diri. Coba lagi dalam beberapa detik.',
      data: null,
    });
  }
  next();
});

// Serve file statis (foto upload)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes (dengan versioning)
app.use('/api', routerPeserta);
app.use('/api/checkin', routerCheckin);
app.use('/api/admin', routerAdmin);
app.use('/api', routerUpload);

// API versioning untuk forward compatibility
app.use('/api/v1', routerPeserta);
app.use('/api/v1/checkin', routerCheckin);
app.use('/api/v1/admin', routerAdmin);
app.use('/api/v1', routerUpload);

// ── Health check (informatif) ───────────────────────────────────────────────
app.get('/api/ping', (req, res) => {
  const info = { sukses: true, pesan: 'Server aktif.', data: { waktu: new Date().toISOString(), versi: '2.0.0', database: dbReady ? 'terhubung' : 'memuat' } };
  if (dbReady) {
    try {
      const db = ambilKoneksiDB();
      info.data.total_peserta = db.prepare('SELECT COUNT(*) as c FROM peserta').get().c;
    } catch (_) { /* abaikan jika query gagal */ }
  }
  return res.json(info);
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
    inisialisasiEmail();
    dbReady = true;

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
