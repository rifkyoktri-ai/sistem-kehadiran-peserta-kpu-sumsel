// =============================================================================
// KONSTANTA FRONTEND — Sistem Registrasi KPU Provinsi Sumatera Selatan
// =============================================================================

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const LABEL_STATUS = {
  terdaftar  : 'Terdaftar',
  hadir      : 'Hadir',
  membatalkan: 'Pendaftaran Dibatalkan',
  digantikan : 'Digantikan Peserta Lain',
};

export const WARNA_STATUS = {
  terdaftar  : 'bg-[rgba(107,15,26,0.08)] text-[#6B0F1A] border-[rgba(107,15,26,0.2)]',
  hadir      : 'bg-green-100 text-green-800 border-green-200',
  membatalkan: 'bg-red-100 text-red-800 border-red-200',
  digantikan : 'bg-gray-100 text-gray-600 border-gray-200',
};

export const NAMA_APLIKASI = 'Sistem Registrasi KPU Sumsel';
export const KPU_RED  = '#6B0F1A';
export const KPU_BLUE = '#4A0A10';
export const KPU_GOLD = '#C8930A';
