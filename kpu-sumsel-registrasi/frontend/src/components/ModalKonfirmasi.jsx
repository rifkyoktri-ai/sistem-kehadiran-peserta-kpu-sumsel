export default function ModalKonfirmasi({ terbuka, judul, pesan, onKonfirmasi, onBatal, tombolKonfirmasi = 'Ya, Hapus', varian = 'merah' }) {
  if (!terbuka) return null;

  const warnaTombol = varian === 'merah'
    ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
    : 'bg-[#6B0F1A] hover:bg-[#4A0A10]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onBatal}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 animate-[slideUp_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${varian === 'merah' ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#DCFCE7] text-[#16A34A]'}`}>
            {varian === 'merah' ? '⚠' : 'ℹ'}
          </div>
          <h3 className="font-display font-bold text-xl text-[#3A0708]">{judul}</h3>
        </div>
        <p className="font-body text-[#5A6A8A] mb-8 leading-relaxed">{pesan}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onBatal}
            className="h-11 px-6 rounded-xl border border-[#E2E8F0] text-[#3A0708] font-semibold text-sm hover:bg-[#EEF2F7] transition"
          >
            Batal
          </button>
          <button
            onClick={onKonfirmasi}
            className={`h-11 px-6 rounded-xl text-white font-bold text-sm transition ${warnaTombol}`}
          >
            {tombolKonfirmasi}
          </button>
        </div>
      </div>
    </div>
  );
}
