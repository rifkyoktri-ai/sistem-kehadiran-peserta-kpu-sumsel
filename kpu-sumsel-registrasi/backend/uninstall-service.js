/**
 * uninstall-service.js
 * ===========================================
 * Menghapus aplikasi KPU Sumsel dari Windows Service.
 *
 * CARA PAKAI:
 *   1. Jalankan PowerShell / CMD sebagai Administrator
 *   2. Masuk ke folder backend:  cd backend
 *   3. Jalankan:                 node uninstall-service.js
 *
 * CATATAN:
 *   - Membutuhkan hak Administrator.
 *   - Service akan dihentikan terlebih dahulu, lalu dihapus.
 * ===========================================
 */

const Service = require('node-windows').Service;
const path    = require('path');

const serverScript = path.join(__dirname, 'server.js');

const svc = new Service({
  name:   'KPUSumselRegistrasiApp',
  script: serverScript,
});

// ── Event Listeners ────────────────────────────────────────────────────────
svc.on('uninstall', () => {
  console.log('\n✅ Service berhasil dihapus!');
  console.log('   Nama: ' + svc.name);
  console.log('\nAplikasi tidak lagi berjalan sebagai Windows Service.');
  console.log('Untuk menjalankan secara manual: node server.js');
});

svc.on('stop', () => {
  console.log('⏹️  Service dihentikan. Melanjutkan proses uninstall...');
  svc.uninstall();
});

svc.on('notinstalled', () => {
  console.log('\n⚠️  Service tidak ditemukan / belum terdaftar.');
  console.log('   Tidak ada yang perlu dihapus.');
});

svc.on('error', (err) => {
  console.error('\n❌ Terjadi error saat uninstall service:');
  console.error('  ', err.message || err);
  console.error('\nPastikan Anda menjalankan skrip ini sebagai Administrator.');
});

// ── Eksekusi ───────────────────────────────────────────────────────────────
console.log('================================================');
console.log('  Penghapusan Windows Service KPU Sumsel');
console.log('================================================');
console.log('  Nama Service: KPUSumselRegistrasiApp');
console.log('================================================');
console.log('Menghentikan dan menghapus service...\n');

// Coba stop dulu (jika sedang berjalan), lalu uninstall otomatis via event
if (svc.exists) {
  svc.stop();
} else {
  svc.uninstall();
}
