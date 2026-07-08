// Logo resmi KPU Provinsi Sumatera Selatan
// Disimpan di public/ agar bisa diakses sebagai file statis
const LOGOKPU_URL = '/logo.png';
const LOGOKPU_BASE64 = '/logo.png';

async function getLogoBase64() {
  const resp = await fetch(LOGOKPU_URL);
  const blob = await resp.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export { LOGOKPU_URL, LOGOKPU_BASE64, getLogoBase64 };
