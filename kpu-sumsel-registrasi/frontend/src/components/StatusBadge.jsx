import React from 'react';

// Konfigurasi status berdasarkan desain institusional KPU
const konfigStatus = {
  terdaftar  : { bg: '#EEF2F7', teks: '#003580', dot: '#003580', label: 'Terdaftar' },
  hadir      : { bg: '#DCFCE7', teks: '#15803D', dot: '#16A34A', label: 'Hadir ✓' },
  membatalkan: { bg: '#FEE2E2', teks: '#B91C1C', dot: '#DC2626', label: 'Dibatalkan' },
  digantikan : { bg: '#F3F4F6', teks: '#6B7280', dot: '#9CA3AF', label: 'Digantikan' },
};

/**
 * StatusBadge - Komponen untuk menampilkan status peserta.
 * @param {string} status - Status peserta ('terdaftar', 'hadir', 'membatalkan', 'digantikan')
 */
export default function StatusBadge({ status, className = '' }) {
  const cfg = konfigStatus[status] || { bg: '#F3F4F6', teks: '#6B7280', dot: '#9CA3AF', label: status || 'Tidak Diketahui' };

  return (
    <span 
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${className}`}
      style={{ background: cfg.bg, color: cfg.teks }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}
