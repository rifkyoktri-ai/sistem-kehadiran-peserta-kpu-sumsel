// =============================================================================
// KONEKSI DATABASE — SQLite (sql.js)
// =============================================================================
// Wrapper ini menyediakan interface yang kompatibel dengan better-sqlite3 Statement.
// =============================================================================

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const logger = require('../utils/logger');

const IS_RENDER = process.env.RENDER === 'true';
const DIR_DB = IS_RENDER ? '/data' : __dirname;
const LOKASI_DB = path.join(DIR_DB, 'kpu_registrasi.db');

let _db = null;
let _sqlJs = null;
let _dalamTransaksi = false;

// Pastikan direktori SQLite ada
if (!fs.existsSync(DIR_DB)) {
  try {
    fs.mkdirSync(DIR_DB, { recursive: true });
  } catch (err) {
    logger.error({ err }, `Gagal membuat direktori database di ${DIR_DB}`);
  }
}

let _isSaving = false;
let _pendingSave = false;

function _simpanKeDisk() {
  if (_dalamTransaksi) return;
  if (_db && _db._raw) {
    if (_isSaving) {
      _pendingSave = true;
      return;
    }
    _isSaving = true;
    try {
      const data = _db._raw.export();
      const buffer = Buffer.from(data);
      const tmpPath = LOKASI_DB + '.tmp';
      fs.writeFileSync(tmpPath, buffer);
      fs.renameSync(tmpPath, LOKASI_DB);
    } catch (err) {
      logger.error({ err }, 'Gagal menyimpan database SQLite secara atomik.');
    } finally {
      _isSaving = false;
      if (_pendingSave) {
        _pendingSave = false;
        // Jeda waktu sedikit (coalescing) sebelum melakukan save tertunda berikutnya
        setTimeout(_simpanKeDisk, 50);
      }
    }
  }
}

function _jadwalkanSimpan() {
  _simpanKeDisk();
}

function simpanKeDisk() {
  _simpanKeDisk();
}

class WrappedStatement {
  constructor(db, sql, saveFn) {
    this._db = db;
    this._sql = sql;
    this._saveFn = saveFn;
  }

  run(...params) {
    const rawParams = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] : params;
    
    this._db.run(this._sql, rawParams);
    const changesCount = this._db.getRowsModified();
    this._saveFn();
    return {
      changes: changesCount,
      lastInsertRowid: 0,
    };
  }

  get(...params) {
    const rawParams = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] : params;
    
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
    const rawParams = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] : params;
    
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
    } catch (_) {}
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      _dalamTransaksi = true;
      self.exec('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        self.exec('COMMIT');
        _dalamTransaksi = false;
        _simpanKeDisk();
        return result;
      } catch (err) {
        try {
          self.exec('ROLLBACK');
        } catch (_) {}
        _dalamTransaksi = false;
        throw err;
      }
    };
  }

  close() {
    _simpanKeDisk();
    if (this._raw) this._raw.close();
  }
}

async function inisialisasiDB() {
  logger.info('Menggunakan database SQLite lokal (sql.js)...');
  _sqlJs = await initSqlJs();

  if (fs.existsSync(LOKASI_DB)) {
    const fileBuffer = fs.readFileSync(LOKASI_DB);
    _db = new WrappedDatabase(new _sqlJs.Database(fileBuffer));
  } else {
    _db = new WrappedDatabase(new _sqlJs.Database());
  }

  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  logger.info({ path: LOKASI_DB }, 'Database SQLite siap.');

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
    logger.info('Koneksi database ditutup.');
  }
}

module.exports = { inisialisasiDB, ambilKoneksiDB, tutupKoneksiDB, LOKASI_DB, simpanKeDisk };
