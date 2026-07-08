import QRCode from 'qrcode';

/**
 * Menghasilkan QR Code dalam format Data URL (base64 PNG)
 * @param {string} idRegistrasi - ID Registrasi Peserta (misal: KPU-SUMSEL-2026-0001)
 * @returns {Promise<string>} Data URL base64 PNG
 */
export async function generateQRCode(idRegistrasi) {
  if (!idRegistrasi) return '';
  try {
    const dataUrl = await QRCode.toDataURL(idRegistrasi, {
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return dataUrl;
  } catch (error) {
    console.error('Gagal menghasilkan QR Code:', error);
    return '';
  }
}
