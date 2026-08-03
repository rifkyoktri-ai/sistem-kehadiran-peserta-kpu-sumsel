// =============================================================================
// KONEKSI DATABASE — Hibrida PostgreSQL (Supabase) / SQLite (sql.js)
// =============================================================================
// Wrapper ini secara dinamis memilih PostgreSQL jika DATABASE_URL tersedia,
// atau otomatis fallback ke SQLite lokal (sql.js) untuk development offline.
// Menyediakan interface yang kompatibel dengan better-sqlite3 Statement.
// =============================================================================

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');
const logger = require('../utils/logger');

const USE_POSTGRES = Boolean(process.env.DATABASE_URL);
const IS_RENDER = process.env.RENDER === 'true';
const DIR_DB = IS_RENDER ? '/data' : __dirname;
const LOKASI_DB = path.join(DIR_DB, 'kpu_registrasi.db');

let _db = null;
let _sqlJs = null;
let _dalamTransaksi = false;
let _pgPool = null;

// Pastikan direktori SQLite ada jika fallback
if (!USE_POSTGRES && !fs.existsSync(DIR_DB)) {
  try {
    fs.mkdirSync(DIR_DB, { recursive: true });
  } catch (err) {
    logger.error({ err }, `Gagal membuat direktori database di ${DIR_DB}`);
  }
}

function _simpanKeDisk() {
  if (USE_POSTGRES) return;
  if (_dalamTransaksi) return;
  if (_db && _db._raw) {
    const data = _db._raw.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(LOKASI_DB, buffer);
  }
}

function _jadwalkanSimpan() {
  _simpanKeDisk();
}

/**
 * Mengubah query dialek SQLite/umum ke PostgreSQL secara dinamis.
 * Terutama placeholder (?) menjadi ($1, $2, etc), INSERT OR IGNORE, dan AUTOINCREMENT.
 */
function konversiSqlKePostgres(sql) {
  let pgSql = sql;
  
  // 1. Ubah INSERT OR IGNORE menjadi INSERT ... ON CONFLICT DO NOTHING
  if (/insert\s+or\s+ignore\s+/i.test(pgSql)) {
    pgSql = pgSql.replace(/insert\s+or\s+ignore\s+/i, 'INSERT ');
    pgSql = pgSql.trim().replace(/;?$/, '') + ' ON CONFLICT DO NOTHING';
  }

  // 2. Ubah INSERT OR REPLACE menjadi INSERT ... ON CONFLICT (kunci/id) DO UPDATE
  if (/insert\s+or\s+replace\s+/i.test(pgSql)) {
    pgSql = pgSql.replace(/insert\s+or\s+replace\s+/i, 'INSERT ');
    if (pgSql.toLowerCase().includes('pengaturan_acara')) {
      pgSql = pgSql.trim().replace(/;?$/, '') + ' ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai';
    } else if (pgSql.toLowerCase().includes('acara')) {
      pgSql = pgSql.trim().replace(/;?$/, '') + ' ON CONFLICT (id) DO UPDATE SET nama_acara = EXCLUDED.nama_acara';
    }
  }

  // 3. Ubah placeholder ? ke $1, $2, $3, dst
  let index = 1;
  pgSql = pgSql.replace(/\?/g, () => `$${index++}`);

  // 4. Ubah PRAGMA table_info ke SELECT kolom di pg_catalog
  if (/pragma\s+table_info\(([^)]+)\)/i.test(pgSql)) {
    const match = pgSql.match(/pragma\s+table_info\(([^)]+)\)/i);
    const tableName = match[1].replace(/['"`]/g, '').trim();
    pgSql = `
      SELECT column_name AS name, data_type AS type 
      FROM information_schema.columns 
      WHERE table_name = '${tableName}'
    `;
  }

  // 5. Ubah query master check
  if (/SELECT\s+name\s+FROM\s+sqlite_master/i.test(pgSql)) {
    pgSql = pgSql.replace(/SELECT\s+name\s+FROM\s+sqlite_master\s+WHERE\s+type\s+=\s+'index'\s+AND\s+name\s+=\s+\$1/i, 
      "SELECT indexname AS name FROM pg_indexes WHERE indexname = $1"
    );
  }

  return pgSql;
}

/**
 * Helper untuk sinkronisasi eksekusi query PostgreSQL agar sync seperti sqlite3.
 */

class WrappedStatement {
  constructor(db, sql, saveFn) {
    this._db = db;
    this._sql = sql;
    this._saveFn = saveFn;
  }

  // Helper untuk melakukan query sinkronous palsu jika Postgres aktif
  _queryPostgresSync(sql, params) {
    let done = false;
    let error = null;
    let res = null;

    _pgPool.query(sql, params, (err, result) => {
      if (err) error = err;
      else res = result;
      done = true;
    });

    // Loop spin event loop hingga query selesai (menggunakan deasync jika ada)
    try {
      const deasync = require('deasync');
      while (!done) {
        deasync.runLoopOnce();
      }
    } catch (e) {
      // Fallback sleep spin
      const start = Date.now();
      while (!done) {
        if (Date.now() - start > 10000) {
          throw new Error('Query PostgreSQL timeout (10s) karena deasync tidak terinstal.');
        }
      }
    }

    if (error) throw error;
    return res;
  }

  run(...params) {
    const rawParams = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] : params;
    const flatParams = Array.isArray(rawParams) ? rawParams : Object.values(rawParams);

    if (USE_POSTGRES) {
      const pgSql = konversiSqlKePostgres(this._sql);
      const res = this._queryPostgresSync(pgSql, flatParams);
      return {
        changes: res.rowCount,
        lastInsertRowid: 0,
      };
    } else {
      this._db.run(this._sql, rawParams);
      this._saveFn();
      return {
        changes: this._db.getRowsModified(),
        lastInsertRowid: 0,
      };
    }
  }

  get(...params) {
    const rawParams = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] : params;
    const flatParams = Array.isArray(rawParams) ? rawParams : Object.values(rawParams);

    if (USE_POSTGRES) {
      const pgSql = konversiSqlKePostgres(this._sql);
      const res = this._queryPostgresSync(pgSql, flatParams);
      return res.rows[0];
    } else {
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
  }

  all(...params) {
    const rawParams = params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0]) ? params[0] : params;
    const flatParams = Array.isArray(rawParams) ? rawParams : Object.values(rawParams);

    if (USE_POSTGRES) {
      const pgSql = konversiSqlKePostgres(this._sql);
      const res = this._queryPostgresSync(pgSql, flatParams);
      return res.rows;
    } else {
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
    if (USE_POSTGRES) {
      const queries = sql.split(';').map(q => q.trim()).filter(Boolean);
      for (const q of queries) {
        const pgSql = konversiSqlKePostgres(q);
        let done = false;
        let error = null;
        _pgPool.query(pgSql, (err) => {
          if (err) error = err;
          done = true;
        });
        try {
          const deasync = require('deasync');
          while (!done) deasync.runLoopOnce();
        } catch (e) {
          const start = Date.now();
          while (!done) {
            if (Date.now() - start > 10000) throw new Error('Postgres exec timeout');
          }
        }
        if (error) throw error;
      }
    } else {
      this._raw.run(sql);
      _jadwalkanSimpan();
    }
  }

  pragma(pragmaStr) {
    if (USE_POSTGRES) return;
    try {
      this._raw.run(`PRAGMA ${pragmaStr}`);
    } catch (_) {}
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      _dalamTransaksi = true;
      self.exec(USE_POSTGRES ? 'BEGIN' : 'BEGIN TRANSACTION');
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
    if (USE_POSTGRES) {
      if (_pgPool) _pgPool.end();
    } else {
      _simpanKeDisk();
      if (this._raw) this._raw.close();
    }
  }
}

async function inisialisasiDB() {
  if (USE_POSTGRES) {
    logger.info('Menghubungkan ke database PostgreSQL (Supabase)...');
    _pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    try {
      await _pgPool.query('SELECT NOW()');
      logger.info('Database PostgreSQL siap.');
      _db = new WrappedDatabase(null);
    } catch (err) {
      logger.error({ err }, 'Gagal menghubungkan ke PostgreSQL Supabase.');
      throw err;
    }
  } else {
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
  }

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

module.exports = { inisialisasiDB, ambilKoneksiDB, tutupKoneksiDB, LOKASI_DB };
