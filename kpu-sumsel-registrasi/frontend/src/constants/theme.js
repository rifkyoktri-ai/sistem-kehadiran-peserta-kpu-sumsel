// Design tokens resmi sistem KPU Provinsi Sumatera Selatan
// Semua nilai warna bersumber dari file ini — tidak boleh hardcode di komponen

const TEMA = {
  // ── WARNA PRIMER: MERAH KPU ──────────────────────────────────
  merahKPU      : '#D8241C',   // Merah utama — dari logo KPU (piksel asli)
  merahGelap    : '#A81A14',   // Merah gelap — hover, gradient gelap
  merahMuda     : '#FCEDED',   // Merah sangat pucat — background halaman

  // ── WARNA SEKUNDER: KUNING EMAS ──────────────────────────────
  emasKPU       : '#D2B704',   // Kuning emas — dari logo KPU (piksel asli)
  emasTerang    : '#E8CC20',   // Kuning emas terang — hover
  emasRedup     : '#FBF5CC',   // Kuning emas pucat — background badge

  // ── WARNA STRUKTURAL ─────────────────────────────────────────
  hitamKPU      : '#1F1A17',   // Hitam dari logo — teks utama, border kuat
  putihKPU      : '#FAFAFA',   // Putih dari logo — latar card, form
  abuHalus      : '#F5F0F0',   // Abu kemerahan sangat pucat — background halaman

  // ── WARNA STATUS (tetap menggunakan konvensi universal) ──────
  hijauStatus   : '#16A34A',   // Status hadir
  hijauMuda     : '#DCFCE7',   // Background status hadir
  merahStatus   : '#DC2626',   // Status error/batal (berbeda dari merahKPU)
  merahStatusBg : '#FEE2E2',   // Background status batal
  kuningStatus  : '#D97706',   // Status warning
  kuningStatusBg: '#FEF3C7',   // Background warning

  // ── TEKS ────────────────────────────────────────────────────
  teksPrimer    : '#1F1A17',   // Hitam KPU — teks utama
  teksSekunder  : '#6B5A5A',   // Coklat abu — teks sekunder
  teksDisable   : '#9CA3AF',   // Abu — teks disabled

  // ── STRUKTURAL ──────────────────────────────────────────────
  cardBg        : '#FAFAFA',   // Putih KPU — latar card
  borderHalus   : '#EDE0E0',   // Border card (sedikit kemerahan)
  borderFokus   : '#D8241C',   // Border input saat fokus — merah KPU
};

// Shadow konsisten — bernuansa merah KPU
const SHADOW = {
  card     : '0 4px 20px rgba(216, 36, 28, 0.08)',
  cardHover: '0 8px 32px rgba(216, 36, 28, 0.15)',
  header   : '0 2px 12px rgba(168, 26, 20, 0.30)',
  tombol   : '0 4px 12px rgba(216, 36, 28, 0.35)',
};

export { TEMA, SHADOW };
