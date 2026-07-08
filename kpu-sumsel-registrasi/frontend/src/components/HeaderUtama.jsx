import React from 'react';
import { LOGOKPU_URL } from '../constants/logo';

export default function HeaderUtama({ judulPanel, slotKanan }) {
  return (
    <header>
      {/* Background gradient */}
      <div 
        style={{ background: 'linear-gradient(135deg, #A81A14 0%, #D8241C 60%, #0D1B3E 100%)' }}
        className="px-8 py-5"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Kiri: Logo + Nama Institusi */}
          <div className="flex items-center gap-4">
            <img src={LOGOKPU_URL} alt="Logo KPU" className="h-14 w-14 object-contain" />
            <div>
              <p className="text-xs font-semibold tracking-widest text-blue-200 uppercase">
                Komisi Pemilihan Umum
              </p>
              <h1 className="text-xl font-bold text-white font-display leading-tight">
                Provinsi Sumatera Selatan
              </h1>
              {judulPanel && (
                <p className="text-sm font-medium mt-0.5" style={{ color: '#E8B84B' }}>
                  {judulPanel}
                </p>
              )}
            </div>
          </div>

          {/* Kanan: slot opsional */}
          {slotKanan && <div>{slotKanan}</div>}
          
        </div>
      </div>

      {/* Garis emas */}
      <div className="h-1" style={{
        background: 'linear-gradient(90deg, #C8972A 0%, #E8B84B 50%, #C8972A 100%)'
      }} />
    </header>
  );
}
