/**
 * Mengunduh PDF ID Card yang dibuat secara langsung oleh Server Node.js (PDFKit / Backend PDF Generator).
 */
export async function cetakIDCard(peserta = null) {
  if (!peserta?.id) {
    alert('Data peserta tidak valid.');
    return;
  }

  const BASE_URL = import.meta.env.VITE_API_URL || '/api';
  const downloadUrl = `${BASE_URL}/peserta/${peserta.id}/pdf`;

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Server merespon dengan status ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const prefix = peserta.tipe_peserta === 'internal' ? 'KPU' : 'EKS';
    const nomorFormatted = peserta.nomor_urut ? `${prefix}-${String(peserta.nomor_urut).padStart(4, '0')}` : peserta.id;
    a.download = `IDCard-${nomorFormatted}.pdf`;

    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Gagal mengunduh ID Card dari server:', err);
    alert('Gagal mengunduh PDF ID Card dari server. Pastikan server backend aktif.');
  }
}