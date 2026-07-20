import React from 'react';

export default function ModalDuplikat({ isOpen, nama, nomor_urut, token, onClose }) {
  if (!isOpen) return null;

  const handleCetak = () => {
    window.location.href = `/cetak/${nomor_urut}?token=${token || ''}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border-t-4 border-[#C8972A]">
        <div className="text-center">
          <span className="text-4xl mb-3 block">⚠️</span>
          <h3 className="text-xl font-bold text-[#3A0708] font-display mb-2">
            Anda Sudah Terdaftar
          </h3>
          <p className="text-sm text-[#5A6A8A] font-body mb-5">
            Anda sudah terdaftar di acara ini dengan data berikut:
          </p>
        </div>

        <div className="bg-[#EEF2F7] rounded-xl p-4 mb-5 font-body text-sm space-y-2 border border-[#E2E8F0] text-[#3A0708]">
          <div className="flex justify-between">
            <span className="text-[#5A6A8A]">Nama:</span>
            <span className="font-semibold uppercase">{nama}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5A6A8A]">Nomor:</span>
            <span className="font-bold text-[#6B0F1A]">{nomor_urut}</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCetak}
            className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm transition-colors focus:outline-none" style={{ background: 'linear-gradient(135deg, #6B0F1A, #4A0A10)' }}
          >
            Cetak ID Card Saya
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl text-[#5A6A8A] font-semibold text-sm bg-[#EEF2F7] hover:bg-[#E2E8F0] transition-colors focus:outline-none"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
