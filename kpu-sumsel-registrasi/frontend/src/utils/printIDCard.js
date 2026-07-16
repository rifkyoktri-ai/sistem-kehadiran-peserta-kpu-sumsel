import html2canvas from 'html2canvas';
import { LOGOKPU_URL } from '../constants/logo';

export async function cetakIDCard(elementId = 'id-card-print') {
  const el = document.getElementById(elementId);
  if (!el) throw new Error('Elemen ID Card tidak ditemukan.');

  const canvas = await html2canvas(el, {
    scale: 3,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#3d1f0a',
  });
  const imgData = canvas.toDataURL('image/png');

  // New card dimensions (105mm x 80mm)
  const widthMm = 105;
  const heightMm = 80;

  // Generate QR code (using participant ID if available)
  const QRCode = (await import('qrcode')).default;
  // Attempt to read an ID from a data attribute; fallback to a generic string
  const participantId = el.dataset.id || 'ID_UNKNOWN';
  const qrDataUrl = await QRCode.toDataURL(participantId, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 120,
    color: { dark: '#ffffff', light: '#3d1f0a' },
  });

  // Combine original canvas with QR code image
  const combinedCanvas = document.createElement('canvas');
  combinedCanvas.width = canvas.width;
  combinedCanvas.height = canvas.height;
  const ctx = combinedCanvas.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  const qrImg = new Image();
  await new Promise((resolve) => {
    qrImg.onload = () => {
      // Scale QR to match PDF dimensions proportionally
      const scale = canvas.width / (widthMm * 2.83465);
      const qrSize = 120 * scale;
      // Position QR at bottom‑right with some padding
      ctx.drawImage(qrImg, canvas.width - qrSize - 20, canvas.height - qrSize - 20, qrSize, qrSize);
      resolve();
    };
    qrImg.src = qrDataUrl;
  });

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [widthMm, heightMm] });
  doc.addImage(combinedCanvas.toDataURL('image/png'), 'PNG', 0, 0, widthMm, heightMm);
  doc.save('id-card.pdf');
}

export async function cetakIDCardBatch(dataPeserta, dataAcara) {
  const { jsPDF } = await import('jspdf');
  const QRCode = (await import('qrcode')).default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const cardW = 105; // mm
  const cardH = 80;  // mm
  const cols = 1;
  const rows = 3;
  const marginX = (210 - cols * cardW) / 2;
  const marginY = (297 - rows * cardH) / (rows + 1);
  let idx = 0;

  for (const peserta of dataPeserta) {
    if (idx > 0 && idx % (cols * rows) === 0) doc.addPage();
    const col = idx % cols;
    const row = Math.floor(idx / cols) % rows;
    const x = marginX + col * (cardW + marginX);
    const y = marginY + row * (cardH + marginY);

    // Generate QR code data URL
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(peserta.id, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 150,
        color: { dark: '#ffffff', light: '#3d1f0a' },
      });
    } catch (e) {
      console.error('Gagal membuat QR Code:', e);
    }

    const fotoUrl = peserta.foto_path ? `/${peserta.foto_path}` : null;

    await new Promise((resolve) => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div style="width:105mm;height:80mm;background:linear-gradient(180deg,#3d1f0a 0%,#2a1505 100%);padding:10px 14px;display:flex;flex-direction:column;align-items:center;color:white;font-family:Arial,sans-serif;box-sizing:border-box;position:relative;">
          <div style="position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,#c9a227,#f0d060,#c9a227)"></div>
          <div style="position:absolute;right:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,#c9a227,#f0d060,#c9a227)"></div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;margin-top:2px">
            <img src="${LOGOKPU_URL}" style="width:22px;height:22px" />
            <div style="font-size:7px;text-align:left;line-height:1.3;color:#f0d060">
              <div style="font-weight:bold">KOMISI PEMILIHAN UMUM</div>
              <div>PROVINSI SUMATERA SELATAN</div>
            </div>
          </div>
          <div style="width:100%;height:1.5px;background:#c9a227;margin-bottom:4px"></div>
          <div style="font-size:7px;font-weight:bold;text-align:center;color:#f0d060;letter-spacing:1px;margin-bottom:2px">PESERTA</div>
          <div style="font-size:8px;font-weight:bold;text-align:center;color:white;line-height:1.2;margin-bottom:3px;padding:0 8px">${dataAcara?.nama_acara || peserta.nama_acara || 'ACARA'}</div>
          <div style="font-size:6px;color:#f0d060;margin-bottom:5px;text-align:center">${dataAcara?.lokasi_acara || peserta.lokasi_acara || ''} ${dataAcara?.tanggal_acara || peserta.tanggal_acara || ''}</div>
          <div style="display:flex;align-items:flex-start;gap:10px;width:100%;flex:1">
            <div style="width:25mm;height:30mm;background:white;border-radius:3px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1.5px solid #c9a227">
              ${fotoUrl ? `<img src="${fotoUrl}" style="width:100%;height:100%;object-fit:cover" />` : '<div style="color:#999;font-size:8px;text-align:center">NO<br/>PHOTO</div>'}
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;flex:1;justify-content:center">
              <div style="font-size:10px;font-weight:bold;color:white;text-align:center;margin-bottom:3px">${peserta.nama_lengkap}</div>
              <div style="font-size:7px;color:#f0d060;font-family:monospace;margin-bottom:3px">${peserta.id}</div>
              <div style="font-size:6px;color:#ccc;text-align:center;line-height:1.3;margin-bottom:5px">${peserta.jabatan}<br/>${peserta.instansi}</div>
              ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:18mm;height:18mm" />` : ''}
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(div);
      setTimeout(async () => {
        const canvas2 = await html2canvas(div.querySelector('div'), { scale: 3, useCORS: true, allowTaint: false, backgroundColor: '#3d1f0a' });
        doc.addImage(canvas2.toDataURL('image/png'), 'PNG', x, y, cardW, cardH);
        document.body.removeChild(div);
        resolve();
      }, 100);
    });
    idx++;
  }
  doc.save('id-cards-batch.pdf');
}
