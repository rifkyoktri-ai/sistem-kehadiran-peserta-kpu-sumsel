// =============================================================================
// KONEKSI DATABASE — Adapter sql.js dengan antarmuka kompatibel better-sqlite3
// =============================================================================
// Menggunakan sql.js (WebAssembly) agar tidak perlu compiler C++ (Visual Studio).
// Data disimpan ke file .db setiap kali ada operasi tulis.
// =============================================================================

const fs = require('fs');
const path = require('path');
const { DBAdapter } = require('./adapter');

const LOKASI_DB = path.join(__dirname, 'kpu_registrasi.db');

// Instance tunggal adapter (singleton)
let _adapterDB = null;

/**
 * Inisialisasi database — muat sql.js WASM dan buka/buat file database.
 * Dipanggil SATU KALI saat server startup (async).
 */
async function inisialisasiDB() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  let sqlJsDB;
  if (fs.existsSync(LOKASI_DB)) {
    const buffer = fs.readFileSync(LOKASI_DB);
    sqlJsDB = new SQL.Database(buffer);
    console.log('[DB] Database dimuat dari file:', LOKASI_DB);
  } else {
    sqlJsDB = new SQL.Database();
    console.log('[DB] Database baru dibuat:', LOKASI_DB);
  }

  _adapterDB = new DBAdapter(sqlJsDB, LOKASI_DB);
  return _adapterDB;
}

/**
 * Mengembalikan koneksi database yang sudah ada.
 * Harus dipanggil SETELAH inisialisasiDB() selesai.
 */
function ambilKoneksiDB() {
  if (!_adapterDB) {
    throw new Error('[DB] Database belum diinisialisasi. Panggil inisialisasiDB() dahulu.');
  }
  return _adapterDB;
}

/**
 * Tutup koneksi database dengan aman saat server shutdown.
 */
function tutupKoneksiDB() {
  if (_adapterDB) {
    _adapterDB.close();
    _adapterDB = null;
    console.log('[DB] Koneksi database ditutup.');
  }
}

module.exports = { inisialisasiDB, ambilKoneksiDB, tutupKoneksiDB };
