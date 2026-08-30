import React from 'react';

// Konfigurasi label berdasarkan desain institusional KPU
const konfigStatus = {
  terdaftar  : { label: 'Terdaftar' },
  hadir      : { label: 'Hadir ✓' },
  membatalkan: { label: 'Dibatalkan' },
  digantikan : { label: 'Digantikan' },
};

/**
 * StatusBadge - Komponen untuk menampilkan status peserta.
 * @param {string} status - Status peserta ('terdaftar', 'hadir', 'membatalkan', 'digantikan')
 */
export default function StatusBadge({ status, className = '' }) {
  const cfg = konfigStatus[status] || { label: status || 'Tidak Diketahui' };
  
  let kpuBadgeClass = "kpu-badge ";
  if (status === 'terdaftar') kpuBadgeClass += "kpu-badge-terdaftar";
  else if (status === 'hadir') kpuBadgeClass += "kpu-badge-hadir";
  else kpuBadgeClass += "kpu-badge-batal";

  return (
    <span className={`${kpuBadgeClass} ${className}`}>
      {cfg.label}
    </span>
  );
}
