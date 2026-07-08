import { jsPDF } from 'jspdf';
import { LOGOKPU_URL } from '../constants/logo';

/**
 * Menghasilkan file PDF ID Card ukuran A6 landscape dan mengunduhnya otomatis.
 * @param {object} peserta - Objek data peserta
 * @param {string} qrDataURL - Base64 Data URL untuk QR Code
 */
export async function downloadIDCard(peserta, qrDataURL) {
  if (!peserta) return;

  // Ambil logo dari file statis dan konversi ke base64
  let logoBase64 = null;
  try {
    const resp = await fetch(LOGOKPU_URL);
    const blob = await resp.blob();
    logoBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    // Fallback: tanpa logo
  }

  // A6: 148mm x 105mm (Landscape)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a6'
  });

  const width = 148;
  const height = 105;

  // 1. Top Accent Line (Emas - 3mm)
  doc.setFillColor(200, 151, 42); // #C8972A
  doc.rect(0, 0, width, 3, 'F');

  // 2. Header Background (Biru KPU - 18mm)
  doc.setFillColor(0, 53, 128); // #003580
  doc.rect(0, 3, width, 18, 'F');

  // 3. Header Logo & Text
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 8, 5, 14, 14);
    } catch (e) {
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('KPU', 8, 14);
    }
  } else {
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('KPU', 8, 14);
  }

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('KOMISI PEMILIHAN UMUM', 24, 10);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('PROVINSI SUMATERA SELATAN', 24, 14);

  // 4. Title Card (Tanda Peserta)
  doc.setTextColor(0, 53, 128);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('T A N D A   P E S E R T A', width / 2, 30, { align: 'center' });

  // Nama Acara & Keterangan (Dinamis dari state/database jika ada)
  const namaAcara = peserta.nama_acara || 'KEGIATAN KPU PROVINSI SUMATERA SELATAN';
  const infoJadwal = `${peserta.tanggal_acara || 'Tahun 2026'}  |  ${peserta.lokasi_acara || 'Sumatera Selatan'}`;

  doc.setTextColor(26, 26, 46); // #1A1A2E
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(namaAcara.toUpperCase(), width / 2, 36, { align: 'center' });

  doc.setTextColor(107, 114, 128); // #6B7280
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(infoJadwal, width / 2, 41, { align: 'center' });

  // Pembatas Tipis
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(10, 44, width - 10, 44);

  // 5. Data Peserta (Kiri)
  doc.setTextColor(26, 26, 46);
  doc.setFontSize(8);

  const startX = 12;
  let startY = 51;
  const spacing = 5.2;

  const fields = [
    { label: 'No. Peserta', val: `: ${String(peserta.nomor_urut).padStart(3, '0')}` },
    { label: 'ID Registrasi', val: `: ${peserta.id}` },
    { label: 'Nama Lengkap', val: `: ${peserta.nama_lengkap.toUpperCase()}` },
    { label: 'Instansi', val: `: ${peserta.instansi}` },
    { label: 'Jabatan', val: `: ${peserta.jabatan}` }
  ];

  fields.forEach((f) => {
    doc.setFont('Helvetica', 'bold');
    doc.text(f.label, startX, startY);
    doc.setFont('Helvetica', 'normal');
    doc.text(f.val, startX + 22, startY);
    startY += spacing;
  });

  // 6. QR Code (Kanan - 30mm x 30mm)
  if (qrDataURL) {
    try {
      doc.addImage(qrDataURL, 'PNG', 105, 48, 30, 30);
    } catch (e) {
      console.error('Gagal menambahkan QR ke PDF:', e);
    }
  }

  // Info instruksi di atas garis bawah
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(6);
  doc.text('Tunjukkan kartu ini kepada petugas pada saat registrasi masuk.', width / 2, 98, { align: 'center' });

  // 7. Bottom Accent Line (Emas - 3mm)
  doc.setFillColor(200, 151, 42); // #C8972A
  doc.rect(0, height - 3, width, 3, 'F');

  // Download PDF
  const namaFile = `ID_Card_${peserta.id}.pdf`;
  doc.save(namaFile);
}
