// =============================================================================
// CONTROLLER ADMIN PDF — Daftar Hadir & Rekap Kehadiran (Multi-Acara)
// =============================================================================

const { ambilKoneksiDB } = require('../database/db');
const { VALID_INSTANSI, VALID_INSTANSI_EKSTERNAL, VALID_INSTANSI_ALL, STATUS_PESERTA } = require('../constants');
const { generateDaftarPesertaPDF, generateRekapKehadiranPDF } = require('../utils/pdfGenerator');

// Daftar instansi internal yang valid (kecuali "Lainnya")
const INSTANSI_INTERNAL_VALID = VALID_INSTANSI.filter(i => i !== 'Lainnya');
// Daftar instansi eksternal yang valid (kecuali "Lainnya")
const INSTANSI_EKSTERNAL_VALID = VALID_INSTANSI_EKSTERNAL.filter(i => i !== 'Lainnya');
// Semua instansi terdaftar tanpa "Lainnya"
const SEMUA_INSTANSI_VALID = VALID_INSTANSI_ALL.filter(i => i !== 'Lainnya');

/**
 * Helper: bangun kondisi WHERE untuk filter instansi pada query peserta
 * Mengembalikan { clause: string, params: array }
 */
function buildInstansiFilter(filter_instansi) {
  if (!filter_instansi) {
    return { clause: '', params: [] };
  }
  if (filter_instansi === '__LAINNYA__') {
    // Instansi yang TIDAK ada di daftar resmi (nilai bebas dari opsi "Lainnya")
    const placeholders = SEMUA_INSTANSI_VALID.map(() => '?').join(', ');
    return {
      clause: ` AND p.instansi NOT IN (${placeholders})`,
      params: [...SEMUA_INSTANSI_VALID]
    };
  }
  return { clause: ' AND p.instansi = ?', params: [filter_instansi] };
}

// =============================================================================
// GET /api/admin/instansi-list?id_acara=xxx
// =============================================================================
exports.getInstansiList = (req, res) => {
  const { id_acara } = req.query;
  
  if (!id_acara) {
    return res.status(400).json({ 
      sukses: false, 
      pesan: 'ID acara wajib diisi.',
      data: null
    });
  }

  try {
    const db = ambilKoneksiDB();

    // 1. KPU internal & eksternal statis selalu diambil lengkap dari constants
    const internal = [...INSTANSI_INTERNAL_VALID];
    const eksternal = [...INSTANSI_EKSTERNAL_VALID];

    // 2. Instansi bebas ("Lainnya") diambil dari database — hanya yang tidak ada di constants
    const rows = db.prepare(`
      SELECT DISTINCT instansi 
      FROM peserta 
      WHERE acara_id = ? 
        AND instansi IS NOT NULL 
        AND instansi != ''
      ORDER BY instansi ASC
    `).all(id_acara);

    const lainnya = rows
      .map(r => r.instansi)
      .filter(inst => !INSTANSI_INTERNAL_VALID.includes(inst) && !INSTANSI_EKSTERNAL_VALID.includes(inst));

    const dataFinal = { internal, eksternal };
    if (lainnya.length > 0) dataFinal.lainnya = lainnya;

    return res.json({ sukses: true, data: dataFinal });

  } catch (err) {
    console.error('[getInstansiList] Error:', err);
    return res.status(500).json({ 
      sukses: false, 
      pesan: 'Gagal mengambil daftar instansi.',
      data: null
    });
  }
};

/**
 * Helper: bangun query WHERE dinamis untuk filter PDF
 */
function bangunFilterQuery(id_acara, filter_instansi, filter_tipe) {
  let whereKlausa = 'WHERE p.acara_id = ?';
  const params = [id_acara];

  // Filter instansi
  if (filter_instansi === '__LAINNYA__') {
    whereKlausa += ` AND COALESCE(p.kategori_instansi, 'lainnya') = 'lainnya'`;
  } else if (filter_instansi === '__INTERNAL_SEMUA__') {
    whereKlausa += ` AND COALESCE(p.kategori_instansi, 'lainnya') = 'internal_kpu'`;
  } else if (filter_instansi === '__EKSTERNAL_SEMUA__') {
    whereKlausa += ` AND COALESCE(p.kategori_instansi, 'lainnya') = 'eksternal'`;
  } else if (filter_instansi && filter_instansi !== '') {
    whereKlausa += ` AND p.instansi = ?`;
    params.push(filter_instansi);
  }

  // Filter tipe peserta
  if (filter_tipe && ['internal', 'eksternal'].includes(filter_tipe)) {
    whereKlausa += ` AND p.tipe_peserta = ?`;
    params.push(filter_tipe);
  }

  return { whereKlausa, params };
}

// =============================================================================
// POST /api/admin/pdf-daftar-hadir  (Dokumen Koordinasi Panitia — Daftar Peserta Terdaftar)
// =============================================================================
exports.generatePDFDaftarHadir = async (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const { id_acara, filter_instansi, filter_tipe } = req.body;

    // Validasi wajib
    if (!id_acara) {
      return res.status(400).json({ sukses: false, pesan: 'ID acara wajib diisi.', data: null });
    }

    // Ambil data acara
    const acara = db.prepare('SELECT * FROM acara WHERE id = ?').get(id_acara);
    if (!acara) {
      return res.status(404).json({ sukses: false, pesan: 'Acara tidak ditemukan.', data: null });
    }

    // Bangun query peserta — sertakan no_hp dan catatan untuk koordinasi lapangan
    const { whereKlausa, params } = bangunFilterQuery(id_acara, filter_instansi, filter_tipe);

    let query = `
      SELECT p.nomor_urut, p.nama_lengkap, p.jabatan, p.instansi, p.no_hp, p.catatan,
             p.tipe_peserta, p.status,
             COALESCE(p.kategori_instansi, 'lainnya') as kategori_instansi
      FROM peserta p
      ${whereKlausa}
        AND p.status NOT IN ('membatalkan', 'digantikan')
      ORDER BY
        CASE COALESCE(p.kategori_instansi, 'lainnya')
          WHEN 'internal_kpu' THEN 1
          WHEN 'eksternal'    THEN 2
          WHEN 'lainnya'      THEN 3
          ELSE 4
        END,
        p.instansi ASC,
        p.nomor_urut ASC
    `;

    const pesertaList = db.prepare(query).all(...params);

    if (pesertaList.length === 0) {
      return res.status(404).json({ sukses: false, pesan: 'Tidak ada peserta yang sesuai dengan filter yang dipilih.', data: null });
    }

    // Generate PDF
    const pdfBuffer = await generateDaftarPesertaPDF(acara, pesertaList, {
      filter_instansi: filter_instansi || ''
    });

    const namaAcara  = (acara.nama_acara || 'acara').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const tanggalStr = new Date().toISOString().slice(0, 10);
    const namaFile   = `daftar-peserta-${namaAcara}-${tanggalStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${namaFile}"`);
    return res.send(pdfBuffer);

  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Gagal membuat PDF. ' + (err.message || ''), data: null });
  }
};

// =============================================================================
// POST /api/admin/pdf-rekap-kehadiran
// =============================================================================
exports.generatePDFRekapKehadiran = async (req, res) => {
  try {
    const db = ambilKoneksiDB();
    const { id_acara, filter_instansi, filter_tipe, pola_ttd, ttd } = req.body;

    // Validasi wajib
    if (!id_acara) {
      return res.status(400).json({ sukses: false, pesan: 'ID acara wajib diisi.', data: null });
    }
    if (!pola_ttd || !['0', '1', '2'].includes(pola_ttd)) {
      return res.status(400).json({ sukses: false, pesan: 'Pola TTD tidak valid. Gunakan: 0, 1, atau 2.', data: null });
    }

    // Validasi array ttd sesuai pola
    const ttdArray = Array.isArray(ttd) ? ttd : [];
    if (pola_ttd === '1' && ttdArray.length < 1) {
      return res.status(400).json({ sukses: false, pesan: 'Pola TTD 1 membutuhkan 1 data penanda tangan.', data: null });
    }
    if (pola_ttd === '2' && ttdArray.length < 2) {
      return res.status(400).json({ sukses: false, pesan: 'Pola TTD 2 membutuhkan 2 data penanda tangan.', data: null });
    }

    // Ambil data acara
    const acara = db.prepare('SELECT * FROM acara WHERE id = ?').get(id_acara);
    if (!acara) {
      return res.status(404).json({ sukses: false, pesan: 'Acara tidak ditemukan.', data: null });
    }

    // Bangun query peserta rekap (semua status termasuk batal & diganti)
    const { whereKlausa, params } = bangunFilterQuery(id_acara, filter_instansi, filter_tipe);
    let query = `
      SELECT p.nomor_urut, p.nama_lengkap, p.jabatan, p.instansi,
             p.tipe_peserta, p.status, p.waktu_checkin, p.adalah_walkin,
             COALESCE(p.kategori_instansi, 'lainnya') as kategori_instansi
      FROM peserta p
      ${whereKlausa}
    `;

    query += `
      ORDER BY
        CASE COALESCE(p.kategori_instansi, 'lainnya')
          WHEN 'internal_kpu' THEN 1
          WHEN 'eksternal'    THEN 2
          WHEN 'lainnya'      THEN 3
          ELSE 4
        END,
        p.instansi ASC,
        CASE p.status
          WHEN 'hadir'       THEN 1
          WHEN 'terdaftar'   THEN 2
          WHEN 'membatalkan' THEN 3
          WHEN 'digantikan'  THEN 4
          ELSE 5
        END,
        p.nomor_urut ASC
    `;

    const pesertaList = db.prepare(query).all(...params);

    if (pesertaList.length === 0) {
      return res.status(404).json({ sukses: false, pesan: 'Tidak ada peserta yang sesuai dengan filter yang dipilih.', data: null });
    }

    // Hitung statistik dari hasil query
    const total_terdaftar = pesertaList.length;
    const total_hadir     = pesertaList.filter(p => p.status === STATUS_PESERTA.HADIR).length;
    const total_absen     = pesertaList.filter(p => p.status === STATUS_PESERTA.TERDAFTAR).length;
    const total_walkin    = pesertaList.filter(p => p.adalah_walkin && p.status === STATUS_PESERTA.HADIR).length;
    const total_batalkan  = pesertaList.filter(p => p.status === STATUS_PESERTA.MEMBATALKAN).length;
    const total_diganti   = pesertaList.filter(p => p.status === STATUS_PESERTA.DIGANTIKAN).length;
    const persen_hadir    = total_terdaftar > 0
      ? ((total_hadir / total_terdaftar) * 100).toFixed(1)
      : '0.0';

    const statistik = {
      total_terdaftar,
      total_hadir,
      total_absen,
      total_walkin,
      total_batalkan,
      total_diganti,
      persen_hadir
    };

    // Generate PDF
    const pdfBuffer = await generateRekapKehadiranPDF(acara, pesertaList, statistik, {
      filter_instansi: filter_instansi || '',
      pola_ttd,
      ttd: ttdArray
    });

    const namaAcara  = (acara.nama_acara || 'acara').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const tanggalStr = new Date().toISOString().slice(0, 10);
    const namaFile   = `rekap-kehadiran-${namaAcara}-${tanggalStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${namaFile}"`);
    return res.send(pdfBuffer);

  } catch (err) {
    return res.status(500).json({ sukses: false, pesan: 'Gagal membuat PDF. ' + (err.message || ''), data: null });
  }
};
