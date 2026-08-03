// =============================================================================
// SERVER ENTRY POINT — Sistem Registrasi KPU Provinsi Sumatera Selatan
// =============================================================================

require('dotenv').config();

// Validasi environment variables kritis sebelum server start
const ENV_VARS = {
  PASSWORD_PETUGAS: 'Password akses petugas check-in',
  PASSWORD_ADMIN: 'Password akses panel admin',
  JWT_SECRET: 'Secret key untuk token JWT (min 32 karakter)',
};
let validasiGagal = false;
for (const [key, desc] of Object.entries(ENV_VARS)) {
  if (!process.env[key]) {
    console.error(`  ERROR: ${key} harus diatur di .env — ${desc}`);
    validasiGagal = true;
  }
}
if (validasiGagal) {
  console.error('  Lihat file .env.example untuk contoh konfigurasi.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { inisialisasiDB, ambilKoneksiDB, tutupKoneksiDB } = require('./database/db');
const { jalankanMigrasi } = require('./database/migrations');
const { inisialisasiEmail } = require('./utils/email');
const logger = require('./utils/logger');

// Import semua router
const routerPeserta = require('./routes/peserta');
const routerCheckin = require('./routes/checkin');
const routerAdmin = require('./routes/admin');
const routerUpload = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Flag kesiapan database ──────────────────────────────────────────────────
let dbReady = false;
logger.info('Server starting...');

// ── Security Headers ────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws://localhost:*", "http://localhost:*"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
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

// ── Rate Limiting ───────────────────────────────────────────────────────────
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

const daftarLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 30,              // Maks 30 registrasi per IP per menit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    sukses: false,
    pesan: 'Terlalu banyak permintaan pendaftaran. Silakan coba lagi dalam 1 menit.',
    data: null,
  },
});

// Terapkan rate limiter pada endpoint login dan registrasi
app.use('/api/admin/login', loginLimiter);
app.use('/api/checkin/login', loginLimiter);
app.use('/api/peserta/daftar', daftarLimiter);
app.use('/api/v1/peserta/daftar', daftarLimiter);

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

// Serve file statis (foto upload) dengan CORS header agar bisa diakses oleh frontend saat cetak PDF
const staticUploadsDir = process.env.RENDER === 'true' 
  ? '/data/uploads'
  : path.join(__dirname, 'uploads');

app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(staticUploadsDir));

// Mount routes
app.use('/api', routerPeserta);
app.use('/api/checkin', routerCheckin);
app.use('/api/admin', routerAdmin);
app.use('/api', routerUpload);

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
  const refId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  logger.error({ err, refId }, 'Unhandled error');
  console.error('=== GLOBAL ERROR HANDLER ===');
  console.error('refId:', refId);
  console.error('message:', err.message);
  console.error('stack:', err.stack);
  console.error('============================');
  // Jangan kirim detail error internal ke client
  return res.status(err.status || 500).json({
    sukses: false,
    pesan: 'Terjadi kesalahan pada server. Silakan hubungi tim teknis.',
    ref_id: refId,
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
      logger.info({ port: PORT, healthCheck: `http://localhost:${PORT}/api/ping` }, 'Server KPU Sumsel started');
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

start();

// Global unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('=== UNHANDLED REJECTION ===');
  console.error('reason:', reason);
  console.error('stack:', reason?.stack);
  console.error('============================');
});

// Graceful shutdown
const gracefulShutdown = (sinyal) => {
  logger.info({ signal: sinyal }, 'Received shutdown signal, closing connections...');
  tutupKoneksiDB();
  if (server) {
    server.close(() => {
      logger.info('Server stopped successfully');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
