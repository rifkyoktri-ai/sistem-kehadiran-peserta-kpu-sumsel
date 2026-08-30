import React from 'react';
import { LOGOKPU_URL } from '../constants/logo';

export default function HeaderUtama({ judulPanel, slotKanan }) {
  return (
    <header style={{
      background: 'linear-gradient(90deg, #2A0508 0%, #4A0A10 50%, #3A0708 100%)',
      borderBottom: '2px solid #C8930A',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Shimmer line atas navbar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg,transparent,rgba(255,215,0,0.4),transparent)'
      }} />

      {/* Pola titik dekoratif */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(200,147,10,0.06) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />

      <div className="px-8 py-5 relative" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Kiri: Logo + Nama Institusi */}
          <div className="flex items-center gap-4">
            <img src={LOGOKPU_URL} alt="Logo KPU"
              style={{ width: '56px', height: '56px', objectFit: 'contain', flexShrink: 0 }}
            />
            
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#FFD700', opacity: 0.9 }}>
                Komisi Pemilihan Umum
              </p>
              <h1 className="text-xl font-bold font-display leading-tight" style={{ color: '#FFD700' }}>
                Provinsi Sumatera Selatan
              </h1>
              {judulPanel && (
                <p className="text-sm font-bold mt-1" style={{ color: '#C8930A' }}>
                  {judulPanel}
                </p>
              )}
            </div>
          </div>

          {/* Kanan: slot opsional */}
          {slotKanan && <div>{slotKanan}</div>}
          
        </div>
      </div>
    </header>
  );
}
