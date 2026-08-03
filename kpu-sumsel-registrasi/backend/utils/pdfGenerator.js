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

module.exports = { buatPDFIDCard };
