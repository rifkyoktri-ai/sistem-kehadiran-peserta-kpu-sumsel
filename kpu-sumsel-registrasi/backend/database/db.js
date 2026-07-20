// =============================================================================
// KONEKSI DATABASE — sql.js (Pure JavaScript SQLite, tanpa native compilation)
// =============================================================================
// Wrapper ini menyediakan API yang SAMA persis dengan better-sqlite3,
// sehingga seluruh kode yang sudah ada TIDAK perlu diubah.
// =============================================================================

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const LOKASI_DB = path.join(__dirname, 'kpu_registrasi.db');

let _db = null;
let _sqlJs = null;
let _saveTimer = null;
let _dalamTransaksi = false;

// ── Simpan database ke disk ─────────────────────────────────────────────────
function _simpanKeDisk() {
  if (_dalamTransaksi) return; // Jangan simpan selama transaksi berjalan
  if (_db && _db._raw) {
    const data = _db._raw.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(LOKASI_DB, buffer);
  }
}

function _jadwalkanSimpan() {
  _simpanKeDisk();
}

// ── Wrapper Statement — meniru API better-sqlite3 Statement ─────────────────
class WrappedStatement {
  constructor(db, sql, saveFn) {
    this._db = db;
    this._sql = sql;
    this._saveFn = saveFn;
  }

  run(...params) {
    this._db.run(this._sql, params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] : params);
    this._saveFn();
    return {
      changes: this._db.getRowsModified(),
      lastInsertRowid: 0, // sql.js tidak support lastInsertRowid di run langsung
    };
  }

  get(...params) {
    const stmt = this._db.prepare(this._sql);
    if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      stmt.bind(params[0]);
    } else if (params.length > 0) {
      stmt.bind(params);
    }
    const result = stmt.step() ? stmt.getAsObject() : undefined;
    stmt.free();
    return result;
  }

  all(...params) {
    const results = [];
    const stmt = this._db.prepare(this._sql);
    if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      stmt.bind(params[0]);
    } else if (params.length > 0) {
      stmt.bind(params);
    }
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }
}

// ── Wrapper Database — meniru API better-sqlite3 Database ───────────────────
class WrappedDatabase {
  constructor(sqlJsDb) {
    this._raw = sqlJsDb;
    this._lokasiDb = LOKASI_DB;
  }

  prepare(sql) {
    return new WrappedStatement(this._raw, sql, _jadwalkanSimpan);
  }

  exec(sql) {
    this._raw.run(sql);
    _jadwalkanSimpan();
  }

  pragma(pragmaStr) {
    try {
      this._raw.run(`PRAGMA ${pragmaStr}`);
    } catch (_) {
      // Beberapa pragma mungkin tidak didukung oleh sql.js — abaikan
    }
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      _dalamTransaksi = true;
      self._raw.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        self._raw.run('COMMIT');
        _dalamTransaksi = false;
        _simpanKeDisk(); // Simpan ke disk setelah COMMIT sukses
        return result;
      } catch (err) {
        try {
          self._raw.run('ROLLBACK');
        } catch (_) {}
        _dalamTransaksi = false;
        throw err;
      }
    };
  }

  close() {
    _simpanKeDisk();
    this._raw.close();
  }
}

// ── Fungsi Publik ───────────────────────────────────────────────────────────

async function inisialisasiDB() {
  _sqlJs = await initSqlJs();

  if (fs.existsSync(LOKASI_DB)) {
    const fileBuffer = fs.readFileSync(LOKASI_DB);
    _db = new WrappedDatabase(new _sqlJs.Database(fileBuffer));
  } else {
    _db = new WrappedDatabase(new _sqlJs.Database());
  }

  // Set pragmas
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  console.log('[DB] Database siap:', LOKASI_DB);
  return _db;
}

function ambilKoneksiDB() {
  if (!_db) {
    throw new Error('[DB] Database belum diinisialisasi. Panggil inisialisasiDB() dahulu.');
  }
  return _db;
}

function tutupKoneksiDB() {
  if (_db) {
    _db.close();
    _db = null;
    console.log('[DB] Koneksi database ditutup.');
  }
}

module.exports = { inisialisasiDB, ambilKoneksiDB, tutupKoneksiDB, LOKASI_DB };
