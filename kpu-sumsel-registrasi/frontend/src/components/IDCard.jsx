import { useState, useEffect } from 'react';
import { generateQRCode } from '@/utils/generateQR';
import { downloadIDCard } from '@/utils/generatePDF';
import { KPU_BLUE, KPU_GOLD } from '@/constants';

export default function IDCard({ peserta, acara }) {
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (peserta?.id) {
      generateQRCode(peserta.id).then(setQrUrl);
    }
  }, [peserta?.id]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const fullData = {
        ...peserta,
        nama_acara: acara?.nama_acara,
        tanggal_acara: acara?.tanggal_acara,
        lokasi_acara: acara?.lokasi_acara,
      };
      await downloadIDCard(fullData, qrUrl);
    } catch (e) {
      console.error('Gagal unduh PDF:', e);
    }
    setLoading(false);
  };

  if (!peserta) return null;

  return (
    <div className="space-y-4">
      <div
        className="border border-gray-300 rounded-lg overflow-hidden shadow-sm mx-auto"
        style={{ maxWidth: '350px', aspectRatio: '1.414' }}
      >
        <div style={{ height: '3px', backgroundColor: KPU_GOLD }} />
        <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: KPU_BLUE }}>
          <span className="text-white font-bold text-xs tracking-wide">KOMISI PEMILIHAN UMUM</span>
          <span className="text-white text-[8px] tracking-wider opacity-80">SUMATERA SELATAN</span>
        </div>
        <div className="p-4 flex flex-col justify-between h-[calc(100%-36px)]">
          <div className="text-center">
            <h4 className="font-bold text-xs tracking-widest" style={{ color: KPU_BLUE }}>TANDA PESERTA</h4>
            <p className="font-bold text-[9px] text-gray-700 uppercase truncate mt-0.5">
              {acara?.nama_acara || 'KEGIATAN KPU'}
            </p>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="space-y-1.5 w-2/3">
              <div>
                <span className="text-gray-500 font-semibold block text-[9px]">No. Peserta</span>
                <span className="font-bold text-sm">{String(peserta.nomor_urut).padStart(3, '0')}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block text-[9px]">ID Registrasi</span>
                <span className="font-mono font-bold text-xs" style={{ color: KPU_BLUE }}>{peserta.id}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block text-[9px]">Nama</span>
                <span className="font-bold text-xs uppercase truncate block">{peserta.nama_lengkap}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block text-[9px]">Instansi</span>
                <span className="text-xs truncate block">{peserta.instansi}</span>
              </div>
              <div>
                <span className="text-gray-500 font-semibold block text-[9px]">Jabatan</span>
                <span className="text-xs truncate block">{peserta.jabatan}</span>
              </div>
            </div>
            <div className="w-1/3 flex justify-end">
              {qrUrl ? (
                <img src={qrUrl} alt="QR" className="w-28 h-28 border-2 p-0.5 rounded" />
              ) : (
                <div className="w-28 h-28 border-2 bg-gray-100 flex items-center justify-center text-[9px] text-gray-400 rounded">QR</div>
              )}
            </div>
          </div>
        </div>
        <div style={{ height: '3px', backgroundColor: KPU_GOLD }} />
      </div>

      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full py-2.5 text-white font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50"
        style={{ backgroundColor: KPU_GOLD }}
      >
        {loading ? 'Menyiapkan PDF...' : '⬇ Unduh ID Card (PDF)'}
      </button>
    </div>
  );
}
