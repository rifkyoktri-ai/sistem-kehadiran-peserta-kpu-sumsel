const db = require('better-sqlite3')('../backend/database/kpu_registrasi.db');
const stmt = db.prepare("UPDATE peserta SET nomor_urut = nomor_urut || '_DEL_' || id WHERE status = 'dihapus' AND nomor_urut NOT LIKE '%_DEL_%'");
const info = stmt.run();
console.log('Fixed soft-deleted records:', info.changes);
