/**
 * install-service.js
 * ===========================================
 * Mendaftarkan aplikasi KPU Sumsel sebagai Windows Service.
 *
 * CARA PAKAI:
 *   1. Jalankan PowerShell / CMD sebagai Administrator
 *   2. Masuk ke folder backend:  cd backend
 *   3. Jalankan:                 node install-service.js
 *
 * CATATAN:
 *   - Membutuhkan hak Administrator untuk mendaftarkan service.
 *   - node-windows harus sudah terinstall: npm install node-windows
 *   - Setelah terdaftar, service berjalan otomatis saat Windows dinyalakan.
 * ===========================================
 */

const Service = require('node-windows').Service;
const path    = require('path');

// Path absolut ke file server utama
const serverScript = path.join(__dirname, 'server.js');

// Deteksi path Node.js yang sedang dipakai saat ini
const nodePath = process.execPath;

// Konfigurasi Windows Service
const svc = new Service({
  name:        'KPUSumselRegistrasiApp',
  description: 'Layanan Sistem Registrasi dan Presensi KPU Provinsi Sumatera Selatan',
  script:      serverScript,
  nodeOptions: [],
  // Jalankan dengan Node yang sama yang mengeksekusi script ini
  execPath:    nodePath,
  env: [
    { name: 'NODE_ENV', value: 'production' },
    { name: 'PORT',     value: '8080'       },
  ],
  // Restart otomatis jika crash, maks 3 kali dalam 60 detik
  maxRestarts:      3,
  maxRetries:       3,
  wait:             2,   // detik sebelum restart pertama
  grow:             0.5, // faktor pertumbuhan antar-restart
  abortOnError:     false,
});

// ── Event Listeners ────────────────────────────────────────────────────────
svc.on('install', () => {
  console.log('\n✅ Service berhasil didaftarkan!');
  console.log('   Nama    :', svc.name);
  console.log('   Script  :', serverScript);
  console.log('   Port    : 8080');
  console.log('\nMemulai service...');
  svc.start();
});

svc.on('start', () => {
  console.log('🚀 Service berhasil dimulai!');
  console.log('   Akses aplikasi di: http://localhost:8080');
  console.log('\nUntuk mengelola service:');
  console.log('   Start  : sc start KPUSumselRegistrasiApp');
  console.log('   Stop   : sc stop  KPUSumselRegistrasiApp');
  console.log('   Hapus  : node uninstall-service.js');
});

svc.on('alreadyinstalled', () => {
  console.log('\n⚠️  Service sudah terdaftar sebelumnya.');
  console.log('   Untuk menghapus: node uninstall-service.js');
  console.log('   Untuk restart  : sc stop KPUSumselRegistrasiApp && sc start KPUSumselRegistrasiApp');
});

svc.on('invalidinstallation', () => {
  console.error('\n❌ Instalasi tidak valid. Coba jalankan uninstall-service.js terlebih dahulu.');
});

svc.on('error', (err) => {
  console.error('\n❌ Terjadi error saat instalasi service:');
  console.error('  ', err.message || err);
  console.error('\nPastikan Anda menjalankan skrip ini sebagai Administrator.');
});

// ── Validasi & Install ─────────────────────────────────────────────────────
const fs = require('fs');
if (!fs.existsSync(serverScript)) {
  console.error('❌ File server tidak ditemukan:', serverScript);
  process.exit(1);
}

console.log('================================================');
console.log('  Instalasi Windows Service KPU Sumsel');
console.log('================================================');
console.log('  Script  :', serverScript);
console.log('  Node.js :', nodePath);
console.log('  Port    : 8080');
console.log('================================================');
console.log('Mendaftarkan service...\n');

svc.install();
