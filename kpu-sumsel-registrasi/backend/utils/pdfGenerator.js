const puppeteer = require('puppeteer');
const QRCode    = require('qrcode');
const path      = require('path');
const fs        = require('fs');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Baca file gambar (PNG/JPG) → data URI base64 */
function imgToDataUri(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const buf  = fs.readFileSync(filePath);
    const ext  = path.extname(filePath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (_) { return null; }
}

/** Baca SVG sebagai data URI (svg+xml) */
function svgToDataUri(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    return `data:image/svg+xml;base64,${Buffer.from(content).toString('base64')}`;
  } catch (_) { return null; }
}

/** Membaca file gambar logo KPU resolusi tinggi secara langsung */
function getLogoKPU() {
  return imgToDataUri(path.join(__dirname, '../../frontend/logo.png'));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main generator
// ─────────────────────────────────────────────────────────────────────────────
async function buatPDFIDCard(peserta, acara) {
  // 1. QR Code
  let qrDataUrl = '';
  if (peserta?.id) {
    try {
      qrDataUrl = await QRCode.toDataURL(String(peserta.id), {
        width: 200, margin: 1,
        color: { dark: '#3D0C0C', light: '#FFFFFF' }
      });
    } catch (_) {}
  }

  // 2. Aset gambar
  const logoKPU      = getLogoKPU();
  const logoBangga   = svgToDataUri(path.join(__dirname, '../../frontend/public/logo-bangga.svg'));
  const logoBerAKHLAK = svgToDataUri(path.join(__dirname, '../../frontend/public/logo-berakhlak.svg'));

  let fotoUrl = null;
  if (peserta.foto_path) {
    fotoUrl = imgToDataUri(path.join(__dirname, '..', peserta.foto_path));
  }

  // 3. Data peserta
  const isInternal   = peserta.tipe_peserta === 'internal';
  
  let nomorDisplay = peserta.id || '-';
  if (peserta.nomor_urut) {
    if (String(peserta.nomor_urut).includes('-')) {
      nomorDisplay = String(peserta.nomor_urut);
    } else {
      nomorDisplay = `${isInternal ? 'KPU' : 'EKS'}-${String(peserta.nomor_urut).padStart(4, '0')}`;
    }
  }

  const namaAcara = acara?.nama_acara || 'NAMA ACARA';
  const tanggal   = acara?.tanggal_acara || '';

  // ─────────────────────────────────────────────────────────────────────
  // STRATEGI: PDF = A4 (210×297mm), card (85×115mm) di tengah + crop marks
  // User cetak di A4 tanpa ubah setting apapun → potong → ID Card siap.
  // ─────────────────────────────────────────────────────────────────────
  const A4_W = 210, A4_H = 297;
  const CW = 85,    CH  = 115;
  const LEFT = (A4_W - CW) / 2;   // 62.5 mm
  const TOP  = (A4_H - CH) / 2;   // 91 mm
  const CM = 4, CG = 2;           // crop mark length & gap

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @page { size: ${A4_W}mm ${A4_H}mm; margin: 0; }

    html, body {
      width: ${A4_W}mm;
      height: ${A4_H}mm;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page { width: ${A4_W}mm; height: ${A4_H}mm; position: relative; background: #fff; }

    /* ── CROP MARKS ── */
    .crop { position: absolute; background: #999; }
    .crop-tl-h { width:${CM}mm; height:.2mm; top:${TOP}mm;      left:${LEFT-CG-CM}mm; }
    .crop-tl-v { width:.2mm; height:${CM}mm; top:${TOP-CG-CM}mm; left:${LEFT}mm; }
    .crop-tr-h { width:${CM}mm; height:.2mm; top:${TOP}mm;      left:${LEFT+CW+CG}mm; }
    .crop-tr-v { width:.2mm; height:${CM}mm; top:${TOP-CG-CM}mm; left:${LEFT+CW}mm; }
    .crop-bl-h { width:${CM}mm; height:.2mm; top:${TOP+CH}mm;   left:${LEFT-CG-CM}mm; }
    .crop-bl-v { width:.2mm; height:${CM}mm; top:${TOP+CH+CG}mm; left:${LEFT}mm; }
    .crop-br-h { width:${CM}mm; height:.2mm; top:${TOP+CH}mm;   left:${LEFT+CW+CG}mm; }
    .crop-br-v { width:.2mm; height:${CM}mm; top:${TOP+CH+CG}mm; left:${LEFT+CW}mm; }

    /* ── KARTU ── */
    .card {
      position: absolute;
      top: ${TOP}mm; left: ${LEFT}mm;
      width: ${CW}mm; height: ${CH}mm;
      background: #3D0C0C;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── STRIPE EMAS ── */
    .stripe {
      height: 1.5mm; flex-shrink: 0;
      background: linear-gradient(90deg,#4A2800,#C8930A,#FFD700,#FFFACD,#FFD700,#C8930A,#4A2800);
    }

    /* ── HEADER ── */
    .header {
      flex-shrink: 0; display: flex; align-items: center;
      padding: 2mm 2.5mm 1.8mm;
      background: linear-gradient(180deg,#2A0606 0%,#3D0C0C 100%);
      border-bottom: .25mm solid rgba(200,147,10,.35);
      position: relative;
    }
    .header-left { display: flex; align-items: center; gap: 2mm; flex: 1; }
    .header img.logo-kpu {
      width: 9mm; height: 9mm; object-fit: contain; flex-shrink: 0;
    }
    .header-text .title {
      font-size: 2.3mm; font-weight: bold; color: #FFD700;
      letter-spacing: .15mm; text-transform: uppercase; line-height: 1.3;
    }
    .header-text .subtitle {
      font-size: 1.9mm; color: #C8930A; letter-spacing: .1mm;
      text-transform: uppercase; line-height: 1.3; margin-top: .3mm;
    }

    /* ── LOGO KANAN ATAS ── */
    .header-right {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 1.5mm;
      flex-shrink: 0;
    }
    .header-right img.logo-tambahan {
      height: 4.5mm;
      width: auto;
      object-fit: contain;
      filter: brightness(0) invert(1);   /* agar terlihat di background merah tua */
      opacity: 0.85;
    }

    /* ── SECTION ACARA ── */
    .section-acara {
      flex-shrink: 0; background: rgba(0,0,0,.5);
      padding: 1.8mm 3mm 1.6mm; text-align: center;
    }
    .peserta-label {
      font-size: 1.6mm; color: #C8930A; letter-spacing: 1mm;
      text-transform: uppercase; font-weight: bold; margin-bottom: 1mm;
    }
    .acara-nama {
      font-size: 2.7mm; font-weight: bold; color: #fff;
      text-transform: uppercase; letter-spacing: .1mm; line-height: 1.4;
    }
    .acara-tanggal {
      margin-top: .7mm; font-size: 1.9mm; color: #FFD700;
      letter-spacing: .1mm; font-weight: bold;
    }

    /* ── FOTO ── */
    .foto-wrap {
      flex-shrink: 0; display: flex; justify-content: center; padding: 2.5mm 3mm 0;
    }
    .foto-box { position: relative; width: 31mm; height: 37mm; }
    .foto-inner {
      width: 31mm; height: 37mm; border: .7mm solid #C8930A;
      border-radius: 1.5mm; background: #2A0606; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
    }
    .foto-inner img { width: 100%; height: 100%; object-fit: cover; }
    .foto-placeholder { color: rgba(200,147,10,.35); font-size: 4mm; }
    .corner { position: absolute; width: 3.5mm; height: 3.5mm; }
    .corner-tl { top:-.8mm; left:-.8mm; border-top:.7mm solid #FFD700; border-left:.7mm solid #FFD700; border-radius:.5mm 0 0 0; }
    .corner-tr { top:-.8mm; right:-.8mm; border-top:.7mm solid #FFD700; border-right:.7mm solid #FFD700; border-radius:0 .5mm 0 0; }
    .corner-bl { bottom:-.8mm; left:-.8mm; border-bottom:.7mm solid #FFD700; border-left:.7mm solid #FFD700; border-radius:0 0 0 .5mm; }
    .corner-br { bottom:-.8mm; right:-.8mm; border-bottom:.7mm solid #FFD700; border-right:.7mm solid #FFD700; border-radius:0 0 .5mm 0; }

    /* ── INFO PESERTA ── */
    .info {
      flex: 1; padding: 1.8mm 3.5mm 1.2mm; text-align: center;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .nama { font-size: 3.5mm; font-weight: bold; color: #fff; line-height: 1.3; margin-bottom: .5mm; }
    .jabatan {
      font-size: 1.9mm; color: #C8930A; font-weight: bold;
      letter-spacing: .3mm; text-transform: uppercase; margin-bottom: 1.5mm;
    }
    .info-divider { width: 100%; height: .25mm; background: rgba(200,147,10,.3); margin-bottom: 1.5mm; }
    .badges { display: flex; justify-content: center; }
    .badge { background: rgba(200,147,10,.12); border: .25mm solid rgba(200,147,10,.35); padding: .9mm 2.5mm; }
    .badge:first-child { border-radius: 1mm 0 0 1mm; border-right: none; }
    .badge:last-child  { border-radius: 0 1mm 1mm 0; }
    .badge-label {
      font-size: 1.4mm; color: rgba(200,147,10,.6);
      text-transform: uppercase; letter-spacing: .2mm; margin-bottom: .4mm;
    }
    .badge-value { font-size: 1.9mm; font-weight: bold; color: #fff; }
    .badge-value.gold { color: #FFD700; }

    /* ── DIVIDER EMAS ── */
    .gold-divider {
      flex-shrink: 0; height: .25mm; margin: 0 3mm;
      background: linear-gradient(90deg,transparent,rgba(200,147,10,.5),rgba(255,215,0,.7),rgba(200,147,10,.5),transparent);
    }

    /* ── QR SECTION ── */
    .qr-section {
      flex-shrink: 0; background: rgba(0,0,0,.45);
      padding: 1.8mm 3mm 2.2mm; display: flex; align-items: center; gap: 2.5mm;
    }
    .qr-box {
      background: #fff; border-radius: 1mm; padding: 1mm;
      border: .5mm solid #C8930A; flex-shrink: 0;
    }
    .qr-box img { display: block; width: 14mm; height: 14mm; }
    .qr-label {
      font-size: 1.5mm; color: rgba(200,147,10,.55);
      text-transform: uppercase; letter-spacing: .3mm; margin-bottom: .6mm;
    }
    .qr-nomor {
      font-size: 3.6mm; font-weight: bold; color: #FFD700;
      font-family: 'Courier New', monospace; letter-spacing: .6mm; line-height: 1;
    }
    .qr-verified { display: flex; align-items: center; gap: 1mm; margin-top: 1mm; }
    .dot-green { width: 1.5mm; height: 1.5mm; border-radius: 50%; background: #4CAF50; flex-shrink: 0; }
    .qr-verified span { font-size: 1.6mm; color: rgba(255,255,255,.45); }

    /* ── AKSEN VERTIKAL ── */
    .vline {
      position: absolute; top: 14mm; bottom: 1.5mm; width: .5mm;
      background: linear-gradient(180deg,transparent,rgba(200,147,10,.25),rgba(255,215,0,.4),rgba(200,147,10,.25),transparent);
    }
    .vline-left { left: 1.2mm; } .vline-right { right: 1.2mm; }
  </style>
</head>
<body>
  <div class="page">

    <!-- ── CROP MARKS ── -->
    <div class="crop crop-tl-h"></div><div class="crop crop-tl-v"></div>
    <div class="crop crop-tr-h"></div><div class="crop crop-tr-v"></div>
    <div class="crop crop-bl-h"></div><div class="crop crop-bl-v"></div>
    <div class="crop crop-br-h"></div><div class="crop crop-br-v"></div>

    <!-- ── KARTU ID CARD ── -->
    <div class="card">
      <div class="stripe"></div>

      <!-- HEADER: Logo KPU kiri + 2 logo kanan -->
      <div class="header">
        <div class="header-left">
          ${logoKPU ? `<img class="logo-kpu" src="${logoKPU}" alt="Logo KPU">` : ''}
          <div class="header-text">
            <div class="title">Komisi Pemilihan Umum</div>
            <div class="subtitle">Provinsi Sumatera Selatan</div>
          </div>
        </div>
        <div class="header-right">
          ${logoBangga    ? `<img class="logo-tambahan" src="${logoBangga}" alt="Bangga Melayani Bangsa">` : ''}
          ${logoBerAKHLAK ? `<img class="logo-tambahan" src="${logoBerAKHLAK}" alt="BerAKHLAK">` : ''}
        </div>
      </div>

      <!-- SECTION ACARA -->
      <div class="section-acara">
        <div class="peserta-label">— Peserta —</div>
        <div class="acara-nama">${namaAcara}</div>
        <div class="acara-tanggal">Palembang, ${tanggal}</div>
      </div>

      <!-- FOTO -->
      <div class="foto-wrap">
        <div class="foto-box">
          <div class="foto-inner">
            ${fotoUrl ? `<img src="${fotoUrl}" alt="Foto">` : `<div class="foto-placeholder">📷</div>`}
          </div>
          <div class="corner corner-tl"></div>
          <div class="corner corner-tr"></div>
          <div class="corner corner-bl"></div>
          <div class="corner corner-br"></div>
        </div>
      </div>

      <!-- INFO PESERTA -->
      <div class="info">
        <div class="nama">${peserta.nama_lengkap}</div>
        <div class="jabatan">${peserta.jabatan}</div>
        <div class="info-divider"></div>
        <div class="badges">
          <div class="badge">
            <div class="badge-label">${isInternal ? 'Unit Kerja' : 'Instansi'}</div>
            <div class="badge-value">${peserta.instansi}</div>
          </div>
          <div class="badge">
            <div class="badge-label">Tipe</div>
            <div class="badge-value gold">${isInternal ? 'Internal KPU' : 'Eksternal'}</div>
          </div>
        </div>
      </div>

      <div class="gold-divider"></div>

      <!-- QR + NOMOR -->
      <div class="qr-section">
        <div class="qr-box">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR">` : ''}
        </div>
        <div>
          <div class="qr-label">Nomor Peserta</div>
          <div class="qr-nomor">${nomorDisplay}</div>
          <div class="qr-verified">
            <div class="dot-green"></div>
            <span>Terverifikasi · Scan untuk hadir</span>
          </div>
        </div>
      </div>

      <div class="stripe"></div>
      <div class="vline vline-left"></div>
      <div class="vline vline-right"></div>
    </div>
  </div>
</body>
</html>`;

  // ── Generate PDF via Puppeteer ──
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.setViewport({
      width:  Math.round(A4_W * 3.7795275591),
      height: Math.round(A4_H * 3.7795275591),
      deviceScaleFactor: 2
    });

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBytes = await page.pdf({
      preferCSSPageSize: true,   // ikuti @page { size: 210mm 297mm }
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      pageRanges: '1'
    });

    return Buffer.from(pdfBytes);
  } finally {
    if (browser) await browser.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers untuk PDF Daftar Hadir & Rekap Kehadiran
// ─────────────────────────────────────────────────────────────────────────────

/** Format tanggal ke format Indonesia: Rabu, 27 Agustus 2026 */
function formatTanggalIndonesia(dateStr) {
  if (!dateStr) return '-';
  const hari  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(dateStr);
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format tanggal hari ini: 29 Agustus 2026 */
function formatTanggalPendek(d) {
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format datetime sekarang: 29 Agustus 2026, Pukul 14.27 WIB */
function formatDatetimeIndonesia(d) {
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                 'Juli','Agustus','September','Oktober','November','Desember'];
  const jam   = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}, Pukul ${jam}.${menit} WIB`;
}

/** Format waktu check-in ISO string → "08.32 WIB" */
function formatWaktuCheckin(isoString) {
  if (!isoString) return '—';
  const d    = new Date(isoString);
  const jam   = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  return `${jam}.${menit} WIB`;
}

/** Menghasilkan HTML kop surat KPU beserta judul, sub-judul, dan info acara */
function buatHTMLKopSurat(acara, judulDokumen, subJudul, infoTambahan) {
  // Logo KPU
  let logoSrc = '';
  try {
    const logoPath = path.join(__dirname, '../../frontend/logo.png');
    if (fs.existsSync(logoPath)) {
      const buf = fs.readFileSync(logoPath);
      logoSrc = `data:image/png;base64,${buf.toString('base64')}`;
    }
  } catch (_) { /* fallback teks */ }

  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="Logo KPU" style="height:60px;width:auto;object-fit:contain;flex-shrink:0;">`
    : `<div style="height:60px;width:60px;display:flex;align-items:center;justify-content:center;font-size:10pt;font-weight:bold;color:#6B0F1A;border:2px solid #6B0F1A;border-radius:4px;flex-shrink:0;">[LOGO KPU]</div>`;

  const tanggalFormatted = formatTanggalIndonesia(acara.tanggal_acara);

  const pesertaLabel = infoTambahan.labelFilter
    ? `${infoTambahan.jumlahPeserta} orang dari ${infoTambahan.labelFilter}`
    : `${infoTambahan.jumlahPeserta} orang`;

  return `
    <!-- KOP SURAT -->
    <div style="display:flex;align-items:center;gap:16px;padding-bottom:10px;">
      ${logoHtml}
      <div style="flex:1;text-align:center;">
        <div style="font-size:13pt;font-weight:bold;color:#1A1A1A;line-height:1.4;">KOMISI PEMILIHAN UMUM</div>
        <div style="font-size:13pt;font-weight:bold;color:#1A1A1A;line-height:1.4;">PROVINSI SUMATERA SELATAN</div>
        <div style="font-size:9pt;color:#444;line-height:1.5;">Jl. Pangeran Ratu Blok B8, Jakabaring, Kota Palembang 30252</div>
        <div style="font-size:9pt;color:#444;">Telp. (0711) 514435 | sumsel.kpu.go.id</div>
      </div>
    </div>
    <div style="border-bottom:3px solid #6B0F1A;margin-bottom:2px;"></div>
    <div style="border-bottom:1px solid #6B0F1A;margin-bottom:14px;"></div>

    <!-- JUDUL DOKUMEN -->
    <div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:14pt;font-weight:bold;text-transform:uppercase;color:#1A1A1A;margin-bottom:4px;">${judulDokumen}</div>
      ${subJudul ? `<div style="font-size:12pt;font-weight:bold;color:#6B0F1A;">${subJudul}</div>` : ''}
    </div>

    <!-- INFO ACARA -->
    <table style="width:100%;margin-bottom:14px;font-size:10pt;border-collapse:collapse;">
      <tr>
        <td style="width:110px;padding:2px 0;vertical-align:top;color:#555;">Kegiatan</td>
        <td style="width:10px;padding:2px 0;vertical-align:top;color:#555;">:</td>
        <td style="padding:2px 0;vertical-align:top;font-weight:bold;color:#1A1A1A;">${acara.nama_acara}</td>
      </tr>
      <tr>
        <td style="padding:2px 0;vertical-align:top;color:#555;">Hari/Tgl</td>
        <td style="padding:2px 0;vertical-align:top;color:#555;">:</td>
        <td style="padding:2px 0;vertical-align:top;color:#1A1A1A;">${tanggalFormatted}</td>
      </tr>
      <tr>
        <td style="padding:2px 0;vertical-align:top;color:#555;">Waktu</td>
        <td style="padding:2px 0;vertical-align:top;color:#555;">:</td>
        <td style="padding:2px 0;vertical-align:top;color:#1A1A1A;">${acara.waktu_acara} WIB s.d. Selesai</td>
      </tr>
      <tr>
        <td style="padding:2px 0;vertical-align:top;color:#555;">Tempat</td>
        <td style="padding:2px 0;vertical-align:top;color:#555;">:</td>
        <td style="padding:2px 0;vertical-align:top;color:#1A1A1A;">${acara.lokasi_acara}</td>
      </tr>
      <tr>
        <td style="padding:2px 0;vertical-align:top;color:#555;">Peserta</td>
        <td style="padding:2px 0;vertical-align:top;color:#555;">:</td>
        <td style="padding:2px 0;vertical-align:top;color:#1A1A1A;">${pesertaLabel}</td>
      </tr>
    </table>
  `;
}

/** Menghasilkan HTML bagian tanda tangan berdasarkan pola */
function buatHTMLTandaTangan(polaTTD, ttdArray, tanggalStr) {
  if (polaTTD === '0') {
    return `
      <div style="margin-top:24px;font-size:8pt;color:#666;text-align:center;font-style:italic;border-top:1px solid #eee;padding-top:10px;">
        Dokumen ini digenerate otomatis oleh Sistem Registrasi Kehadiran KPU Provinsi Sumatera Selatan.
        Untuk keperluan arsip resmi, harap ditandatangani oleh pejabat yang berwenang.
      </div>
    `;
  }

  const tanggalPalembang = `Palembang, ${tanggalStr}`;

  if (polaTTD === '1') {
    const ttd = ttdArray[0] || {};
    return `
      <div style="margin-top:30px;text-align:right;padding-right:20px;">
        <div style="font-size:10pt;color:#1A1A1A;">${tanggalPalembang}</div>
        <div style="font-size:10pt;margin-top:6px;color:#1A1A1A;">${ttd.label || ''},</div>
        <div style="font-size:10pt;color:#555;">${ttd.jabatan || ''}</div>
        <div style="height:60px;"></div>
        <div style="font-size:10pt;font-weight:bold;color:#1A1A1A;">(${ttd.nama || ''})</div>
      </div>
    `;
  }

  if (polaTTD === '2') {
    const ttdKiri  = ttdArray[0] || {};
    const ttdKanan = ttdArray[1] || {};
    return `
      <div style="margin-top:30px;display:flex;justify-content:space-between;padding:0 20px;">
        <div style="text-align:center;min-width:200px;">
          <div style="font-size:10pt;color:#1A1A1A;">${tanggalPalembang}</div>
          <div style="font-size:10pt;margin-top:6px;color:#1A1A1A;">${ttdKiri.label || ''},</div>
          <div style="font-size:10pt;color:#555;">${ttdKiri.jabatan || ''}</div>
          <div style="height:60px;"></div>
          <div style="font-size:10pt;font-weight:bold;color:#1A1A1A;">(${ttdKiri.nama || ''})</div>
        </div>
        <div style="text-align:center;min-width:200px;">
          <div style="font-size:10pt;color:#1A1A1A;">${tanggalPalembang}</div>
          <div style="font-size:10pt;margin-top:6px;color:#1A1A1A;">${ttdKanan.label || ''},</div>
          <div style="font-size:10pt;color:#555;">${ttdKanan.jabatan || ''}</div>
          <div style="height:60px;"></div>
          <div style="font-size:10pt;font-weight:bold;color:#1A1A1A;">(${ttdKanan.nama || ''})</div>
        </div>
      </div>
    `;
  }

  return '';
}

/** Menghasilkan CSS global untuk PDF (footer, thead repeat, dll) */
function buatHTMLFooterCSS(datetimeStr) {
  return `
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
        color: #1A1A1A;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page {
        size: A4 portrait;
        margin: 15mm 15mm 25mm 15mm;
      }
      thead { display: table-header-group; }
      tbody { display: table-row-group; }
      tr    { page-break-inside: avoid; }
      .footer-info {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 16mm;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding: 0 15mm 5mm 15mm;
        font-size: 7.5pt;
        color: #888;
        border-top: 1px solid #ddd;
      }
      .page-number::after {
        content: counter(page);
      }
      .page-total::after {
        content: counter(pages);
      }
      @media print {
        .footer-info { position: fixed; bottom: 0; }
      }
    </style>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generator PDF Daftar Peserta Terdaftar (dokumen koordinasi panitia)
// ─────────────────────────────────────────────────────────────────────────────
async function generateDaftarPesertaPDF(acara, pesertaList, opsi) {
  const { filter_instansi } = opsi;
  const sekarang = new Date();
  const datetimeStr = formatDatetimeIndonesia(sekarang);
  const tanggalTTD  = formatTanggalPendek(sekarang);

  // Sub-judul filter
  const subJudul = (filter_instansi && filter_instansi !== '__LAINNYA__')
    ? filter_instansi
    : (filter_instansi === '__LAINNYA__' ? 'Instansi Lainnya' : '');

  const labelFilter = subJudul || '';

  const kopHtml   = buatHTMLKopSurat(acara, 'DAFTAR PESERTA TERDAFTAR', subJudul, {
    jumlahPeserta: pesertaList.length,
    labelFilter
  });
  const footerCSS = buatHTMLFooterCSS(datetimeStr);

  // Baris tabel peserta dengan separator kategori instansi
  let barisHtml = '';
  let kategoriSebelumnya = null;
  let nomorUrut = 1;

  const labelKategori = {
    'internal_kpu': '── INTERNAL KPU ──',
    'eksternal'   : '── EKSTERNAL RESMI ──',
    'lainnya'     : '── INSTANSI LAINNYA ──'
  };

  const adaMultiKategori = new Set(
    pesertaList.map(p => p.kategori_instansi || 'lainnya')
  ).size > 1;

  for (const p of pesertaList) {
    const kat = p.kategori_instansi || 'lainnya';

    if (adaMultiKategori && kat !== kategoriSebelumnya) {
      barisHtml += `
        <tr style="page-break-after: avoid;">
          <td colspan="7"
              style="background:#6B0F1A;color:#FFFFFF;font-weight:bold;font-size:8.5pt;padding:6px 10px;text-align:center;letter-spacing:1px;border:1px solid #E5C9C9;page-break-after:avoid;">
            ${labelKategori[kat] || kat.toUpperCase()}
          </td>
        </tr>
      `;
      kategoriSebelumnya = kat;
    }

    const bg = nomorUrut % 2 === 0 ? '#FFFFFF' : '#FFF5F5';
    let nomorReg = '';
    if (p.nomor_urut) {
      nomorReg = String(p.nomor_urut).includes('-') ? p.nomor_urut
        : `${p.tipe_peserta === 'internal' ? 'KPU' : 'EKS'}-${String(p.nomor_urut).padStart(4, '0')}`;
    }
    const noHp = p.no_hp || '—';
    const catatan = p.catatan || '';
    barisHtml += `
      <tr style="background:${bg};height:32px;page-break-inside:avoid;">
        <td style="padding:5px 6px;text-align:center;border:1px solid #E5C9C9;font-size:9.5pt;">${nomorUrut}</td>
        <td style="padding:5px 7px;text-align:center;border:1px solid #E5C9C9;font-size:8.5pt;color:#555;">${nomorReg}</td>
        <td style="padding:5px 8px;border:1px solid #E5C9C9;font-size:9.5pt;">${p.nama_lengkap || ''}</td>
        <td style="padding:5px 8px;border:1px solid #E5C9C9;font-size:9pt;">${p.jabatan || ''}</td>
        <td style="padding:5px 8px;border:1px solid #E5C9C9;font-size:9pt;">${p.instansi || ''}</td>
        <td style="padding:5px 8px;text-align:center;border:1px solid #E5C9C9;font-size:9pt;color:#1D4ED8;">${noHp}</td>
        <td style="padding:5px 8px;border:1px solid #E5C9C9;font-size:9pt;color:#666;">${catatan}</td>
      </tr>
    `;
    nomorUrut++;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${footerCSS}
</head>
<body>
  <div style="padding:0;">
    ${kopHtml}

    <!-- TABEL PESERTA -->
    <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
      <thead>
        <tr style="background:#6B0F1A;color:#FFFFFF;font-weight:bold;font-size:10pt;">
          <th style="padding:8px 6px;text-align:center;border:1px solid #E5C9C9;width:4%;">No.</th>
          <th style="padding:8px 7px;text-align:center;border:1px solid #E5C9C9;width:11%;">No. Reg</th>
          <th style="padding:8px 8px;text-align:left;border:1px solid #E5C9C9;width:23%;">Nama Lengkap</th>
          <th style="padding:8px 8px;text-align:left;border:1px solid #E5C9C9;width:15%;">Jabatan</th>
          <th style="padding:8px 8px;text-align:left;border:1px solid #E5C9C9;width:22%;">Instansi / Unit Kerja</th>
          <th style="padding:8px 8px;text-align:center;border:1px solid #E5C9C9;width:13%;">No. HP</th>
          <th style="padding:8px 8px;text-align:left;border:1px solid #E5C9C9;width:12%;">Keterangan</th>
        </tr>
      </thead>
      <tbody>
        ${barisHtml}
      </tbody>
    </table>

    <!-- CATATAN BAWAH -->
    <div style="margin-top:14px;font-size:8pt;color:#555;border-top:1px solid #ddd;padding-top:8px;">
      <span style="font-weight:bold;">Catatan:</span> Dokumen ini dicetak untuk keperluan koordinasi panitia.
      Kehadiran dicatat secara otomatis melalui sistem verifikasi QR Code saat acara berlangsung.
    </div>
  </div>
</body>
</html>`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="font-family: Arial, sans-serif; font-size: 7.5pt; color: #888; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm 0 15mm; border-top: 1px solid #ddd; margin-top: 2px;">
          <span>Dicetak oleh Sistem: ${datetimeStr}</span>
          <span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span> | Daftar Peserta Terdaftar - ${acara.nama_acara || ''}</span>
        </div>
      `,
      margin: { top: '15mm', right: '15mm', bottom: '25mm', left: '15mm' },
      timeout: 30000
    });
    await page.close();
    return Buffer.from(pdfBytes);
  } finally {
    if (browser) await browser.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Generator PDF Rekap Kehadiran Peserta
// ─────────────────────────────────────────────────────────────────────────────
async function generateRekapKehadiranPDF(acara, pesertaList, statistik, opsi) {
  const { filter_instansi, pola_ttd, ttd } = opsi;
  const sekarang = new Date();
  const datetimeStr = formatDatetimeIndonesia(sekarang);
  const tanggalTTD  = formatTanggalPendek(sekarang);

  // Sub-judul filter
  const subJudul = (filter_instansi && filter_instansi !== '__LAINNYA__')
    ? filter_instansi
    : (filter_instansi === '__LAINNYA__' ? 'Instansi Lainnya' : '');

  const labelFilter = subJudul || '';

  const kopHtml   = buatHTMLKopSurat(acara, 'REKAP KEHADIRAN PESERTA', subJudul, {
    jumlahPeserta: pesertaList.length,
    labelFilter
  });
  const ttdHtml   = buatHTMLTandaTangan(pola_ttd, ttd, tanggalTTD);
  const footerCSS = buatHTMLFooterCSS(datetimeStr);

  // Hitung persentase dengan format koma Indonesia
  const persenRaw = statistik.total_terdaftar > 0
    ? ((statistik.total_hadir / statistik.total_terdaftar) * 100)
    : 0;
  const persenStr = persenRaw.toFixed(2).replace('.', ',') + '%';

  const persenAbsen = statistik.total_terdaftar > 0
    ? (((statistik.total_terdaftar - statistik.total_hadir) / statistik.total_terdaftar) * 100)
    : 0;
  const persenAbsenStr = persenAbsen.toFixed(2).replace('.', ',') + '%';

  // Komposisi per kategori instansi
  const komposisi = {
    internal_kpu: { label: 'Internal KPU', total: 0, hadir: 0 },
    eksternal:    { label: 'Eksternal Resmi', total: 0, hadir: 0 },
    lainnya:      { label: 'Instansi Lainnya', total: 0, hadir: 0 }
  };

  for (const p of pesertaList) {
    const kat = p.kategori_instansi || 'lainnya';
    if (komposisi[kat]) {
      komposisi[kat].total++;
      if (p.status === 'hadir') komposisi[kat].hadir++;
    }
  }

  const komposisiAktif = Object.entries(komposisi)
    .filter(([_, v]) => v.total > 0)
    .map(([k, v]) => ({ ...v, key: k }));

  // Tabel ringkasan sederhana (formal)
  const statistikHtml = `
    <div style="border:1.5px solid #6B0F1A;margin-bottom:16px;">
      <div style="background:#6B0F1A;color:#FFFFFF;font-size:10pt;font-weight:bold;padding:6px 12px;letter-spacing:0.5px;">RINGKASAN KEHADIRAN</div>
      <table style="width:100%;font-size:10pt;border-collapse:collapse;">
        <thead>
          <tr style="background:#F3F4F6;">
            <th style="padding:6px 12px;text-align:left;border:1px solid #D1D5DB;width:60%;">Keterangan</th>
            <th style="padding:6px 12px;text-align:center;border:1px solid #D1D5DB;width:20%;">Jumlah</th>
            <th style="padding:6px 12px;text-align:center;border:1px solid #D1D5DB;width:20%;">Persentase</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background:#FFFFFF;">
            <td style="padding:5px 12px;border:1px solid #D1D5DB;">Total Terdaftar</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;font-weight:bold;">${statistik.total_terdaftar} orang</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;">—</td>
          </tr>
          <tr style="background:#F0FFF4;">
            <td style="padding:5px 12px;border:1px solid #D1D5DB;color:#065F46;font-weight:bold;">Hadir</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;font-weight:bold;color:#065F46;">${statistik.total_hadir} orang</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;font-weight:bold;color:#065F46;">${persenStr}</td>
          </tr>
          <tr style="background:#FFFBEB;">
            <td style="padding:5px 12px;border:1px solid #D1D5DB;color:#92400E;">Belum Hadir</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;color:#92400E;">${statistik.total_absen} orang</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;color:#92400E;">${persenAbsenStr}</td>
          </tr>
          <tr style="background:#FFFFFF;">
            <td style="padding:5px 12px;border:1px solid #D1D5DB;color:#555;">Walk-In (termasuk dalam Hadir)</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;">${statistik.total_walkin} orang</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;">—</td>
          </tr>
          <tr style="background:#FFF5F5;">
            <td style="padding:5px 12px;border:1px solid #D1D5DB;color:#991B1B;">Membatalkan</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;color:#991B1B;">${statistik.total_batalkan} orang</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;">—</td>
          </tr>
          <tr style="background:#F5F3FF;">
            <td style="padding:5px 12px;border:1px solid #D1D5DB;color:#5B21B6;">Digantikan</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;color:#5B21B6;">${statistik.total_diganti} orang</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;">—</td>
          </tr>
          ${komposisiAktif.length > 1 ? komposisiAktif.map((k, i) => `
          <tr style="background:${i % 2 === 0 ? '#F9FAFB' : '#FFFFFF'};">
            <td style="padding:5px 12px 5px 24px;border:1px solid #D1D5DB;color:#6B0F1A;font-size:9.5pt;">— ${k.label}</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;font-size:9.5pt;">${k.total} terdaftar</td>
            <td style="padding:5px 12px;text-align:center;border:1px solid #D1D5DB;font-size:9.5pt;color:#065F46;">${k.hadir} hadir (${k.total > 0 ? (k.hadir / k.total * 100).toFixed(2).replace('.', ',') : '0,00'}%)</td>
          </tr>
          `).join('') : ''}
        </tbody>
      </table>
    </div>
  `;

  // Helper render status teks formal
  const renderStatus = (status) => {
    const map = {
      hadir      : { bg: '#D1FAE5', color: '#065F46', text: 'HADIR' },
      terdaftar  : { bg: '#FEF3C7', color: '#92400E', text: 'BELUM HADIR' },
      membatalkan: { bg: '#FEE2E2', color: '#991B1B', text: 'MEMBATALKAN' },
      digantikan : { bg: '#EDE9FE', color: '#5B21B6', text: 'DIGANTIKAN' },
    };
    const s = map[status] || { bg: '#F3F4F6', color: '#374151', text: (status || '').toUpperCase() };
    return `<span style="background:${s.bg};color:${s.color};padding:2px 6px;font-size:7.5pt;font-weight:bold;letter-spacing:0.3px;">${s.text}</span>`;
  };

  // Baris tabel rekap dengan separator kategori instansi
  let barisHtml = '';
  let kategoriSebelumnya = null;
  let nomorUrut = 1;

  const labelKategori = {
    'internal_kpu': '── INTERNAL KPU ──',
    'eksternal'   : '── EKSTERNAL RESMI ──',
    'lainnya'     : '── INSTANSI LAINNYA ──'
  };

  const adaMultiKategori = new Set(
    pesertaList.map(p => p.kategori_instansi || 'lainnya')
  ).size > 1;

  for (const p of pesertaList) {
    const kat = p.kategori_instansi || 'lainnya';

    if (adaMultiKategori && kat !== kategoriSebelumnya) {
      barisHtml += `
        <tr style="page-break-after: avoid;">
          <td colspan="7"
              style="background:#6B0F1A;color:#FFFFFF;font-weight:bold;font-size:8.5pt;padding:6px 10px;text-align:center;letter-spacing:1px;border:1px solid #E5C9C9;page-break-after:avoid;">
            ${labelKategori[kat] || kat.toUpperCase()}
          </td>
        </tr>
      `;
      kategoriSebelumnya = kat;
    }

    const bg = nomorUrut % 2 === 0 ? '#FFFFFF' : '#FFF5F5';
    let jamHadir = '<span style="color:#999;">—</span>';
    if (p.status === 'hadir' && p.waktu_checkin) {
      jamHadir = formatWaktuCheckin(p.waktu_checkin);
      if (p.adalah_walkin) jamHadir += ' (Walk-In)';
    }

    let nomorReg = '';
    if (p.nomor_urut) {
      nomorReg = String(p.nomor_urut).includes('-') ? p.nomor_urut
        : `${p.tipe_peserta === 'internal' ? 'KPU' : 'EKS'}-${String(p.nomor_urut).padStart(4, '0')}`;
    }
    barisHtml += `
      <tr style="background:${bg};page-break-inside:avoid;">
        <td style="padding:5px 6px;text-align:center;border:1px solid #E5C9C9;font-size:9.5pt;">${nomorUrut}</td>
        <td style="padding:5px 6px;text-align:center;border:1px solid #E5C9C9;font-size:9pt;color:#555;">${nomorReg}</td>
        <td style="padding:5px 8px;border:1px solid #E5C9C9;font-size:9.5pt;">${p.nama_lengkap || ''}</td>
        <td style="padding:5px 8px;border:1px solid #E5C9C9;font-size:9.5pt;">${p.jabatan || ''}</td>
        <td style="padding:5px 8px;border:1px solid #E5C9C9;font-size:9.5pt;">${p.instansi || ''}</td>
        <td style="padding:5px 6px;text-align:center;border:1px solid #E5C9C9;font-size:8.5pt;">${renderStatus(p.status)}</td>
        <td style="padding:5px 6px;text-align:center;border:1px solid #E5C9C9;font-size:9pt;">${jamHadir}</td>
      </tr>
    `;
    nomorUrut++;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${footerCSS}
</head>
<body>
  <div style="padding:0;">
    ${kopHtml}
    ${statistikHtml}

    <!-- TABEL REKAP PESERTA -->
    <table style="width:100%;border-collapse:collapse;font-size:9.5pt;">
      <thead>
        <tr style="background:#6B0F1A;color:#FFFFFF;font-weight:bold;font-size:10pt;">
          <th style="padding:8px 6px;text-align:center;border:1px solid #E5C9C9;width:4%;">No.</th>
          <th style="padding:8px 6px;text-align:center;border:1px solid #E5C9C9;width:10%;">No. Reg</th>
          <th style="padding:8px 8px;text-align:left;border:1px solid #E5C9C9;width:22%;">Nama Lengkap</th>
          <th style="padding:8px 8px;text-align:left;border:1px solid #E5C9C9;width:15%;">Jabatan</th>
          <th style="padding:8px 8px;text-align:left;border:1px solid #E5C9C9;width:22%;">Instansi / Unit Kerja</th>
          <th style="padding:8px 6px;text-align:center;border:1px solid #E5C9C9;width:13%;">Status</th>
          <th style="padding:8px 6px;text-align:center;border:1px solid #E5C9C9;width:14%;">Jam Hadir</th>
        </tr>
      </thead>
      <tbody>
        ${barisHtml}
      </tbody>
    </table>

    ${ttdHtml}
  </div>
</body>
</html>`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="font-family: Arial, sans-serif; font-size: 7.5pt; color: #888; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm 0 15mm; border-top: 1px solid #ddd; margin-top: 2px;">
          <span>Dicetak oleh Sistem: ${datetimeStr}</span>
          <span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span> | Rekap Kehadiran - ${acara.nama_acara || ''}</span>
        </div>
      `,
      margin: { top: '15mm', right: '15mm', bottom: '25mm', left: '15mm' },
      timeout: 30000
    });
    await page.close();
    return Buffer.from(pdfBytes);
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { buatPDFIDCard, generateDaftarPesertaPDF, generateRekapKehadiranPDF };
