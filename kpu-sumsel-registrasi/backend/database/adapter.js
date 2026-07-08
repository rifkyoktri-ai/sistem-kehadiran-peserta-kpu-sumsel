// =============================================================================
// ADAPTER SQL.JS — Kelas pembungkus untuk kompatibilitas better-sqlite3
// =============================================================================

const fs = require('fs');

/**
 * Kelas pembungkus Statement sql.js
 */
class Statement {
  constructor(dbAdapter, sql) {
    this._adapter = dbAdapter;
    this._db = dbAdapter._db;
    this._sql = sql;
  }

  run(...args) {
    const stmt = this._db.prepare(this._sql);
    if (args.length > 0) stmt.bind(args);
    stmt.step();
    stmt.free();
    if (this._adapter._dalamTransaksi === 0) {
      this._adapter._simpanKeDisk();
    }
    return this;
  }

  get(...args) {
    const stmt = this._db.prepare(this._sql);
    if (args.length > 0) stmt.bind(args);
    let hasil = undefined;
    if (stmt.step()) hasil = stmt.getAsObject();
    stmt.free();
    return hasil;
  }

  all(...args) {
    const stmt = this._db.prepare(this._sql);
    if (args.length > 0) stmt.bind(args);
    const hasil = [];
    while (stmt.step()) hasil.push(stmt.getAsObject());
    stmt.free();
    return hasil;
  }
}

/**
 * Kelas utama pembungkus Database sql.js
 */
class DBAdapter {
  constructor(sqlJsDB, lokasiDb) {
    this._db = sqlJsDB;
    this._lokasiDb = lokasiDb;
    this._dalamTransaksi = 0;
  }

  _simpanKeDisk() {
    try {
      const data = this._db.export();
      fs.writeFileSync(this._lokasiDb, Buffer.from(data));
    } catch (err) {
      console.error('[DB] Gagal menulis ke disk:', err.message);
    }
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  exec(sql) {
    this._db.run(sql);
    if (this._dalamTransaksi === 0) {
      this._simpanKeDisk();
    }
  }

  pragma(pragmaStr) {
    if (pragmaStr.toLowerCase().includes('foreign_keys')) {
      this._db.run(`PRAGMA ${pragmaStr}`);
    }
  }

  transaction(fn) {
    return (...args) => {
      this._dalamTransaksi++;
      if (this._dalamTransaksi === 1) {
        this._db.run('BEGIN');
      }
      try {
        const hasil = fn(...args);
        if (this._dalamTransaksi === 1) {
          this._db.run('COMMIT');
          this._simpanKeDisk();
        }
        this._dalamTransaksi--;
        return hasil;
      } catch (err) {
        console.error('[DB TRANS] Gagal mengeksekusi transaksi:', err.message);
        if (this._dalamTransaksi === 1) {
          try {
            this._db.run('ROLLBACK');
          } catch (rollbackErr) {
            console.error('[DB TRANS] Gagal menjalankan ROLLBACK:', rollbackErr.message);
          }
        }
        this._dalamTransaksi--;
        throw err;
      }
    };
  }

  close() {
    this._simpanKeDisk();
    this._db.close();
  }
}

module.exports = { DBAdapter };
