import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

export async function cetakIDCard(peserta = null) {
  const element = document.getElementById('id-card-print');
  if (!element) return;

  const qrImg = element.querySelector('#qr-code-img');
  if (qrImg && peserta?.id) {
    try {
      const qrDataUrl = await QRCode.toDataURL(String(peserta.id), {
        width: 64,
        margin: 1,
        color: { dark: '#3D0C0C', light: '#FFFFFF' },
      });
      if (qrDataUrl !== qrImg.src) {
        qrImg.src = qrDataUrl;
        await new Promise((resolve) => {
          qrImg.onload = resolve;
          qrImg.onerror = resolve;
        });
      }
    } catch (e) {
      // proceed without QR
    }
  }

  const images = element.querySelectorAll('img');
  await Promise.all(Array.from(images).map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));

  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
  });

  const rect = element.getBoundingClientRect();
  const aspectRatio = rect.width / rect.height;
  const pdfWidth = 105;
  const pdfHeight = pdfWidth / aspectRatio;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
  });

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);

  const nomorUrut = peserta?.nomor_urut || peserta?.id || 'IDCard';
  pdf.save(`IDCard-${nomorUrut}.pdf`);
}