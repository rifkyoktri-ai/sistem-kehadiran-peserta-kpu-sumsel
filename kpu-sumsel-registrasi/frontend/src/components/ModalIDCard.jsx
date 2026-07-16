import { useState, useEffect } from 'react';
import IDCard from './IDCard';
import { cetakIDCard } from '../utils/printIDCard';
import { API_BASE_URL } from '../constants';

export default function ModalIDCard({ terbuka, peserta, onTutup }) {
  const [acaraInfo, setAcaraInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (terbuka && peserta) {
      setLoading(true);
      fetch(`${API_BASE_URL}/acara/info`)
        .then((r) => r.json())
        .then((data) => {
          if (data.sukses) setAcaraInfo(data.data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [terbuka, peserta]);

  if (!terbuka || !peserta) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onTutup}>
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-bold text-lg text-[#0D1B3E] mb-4 text-center">
          Preview ID Card
        </h2>

        <div className="flex justify-center mb-6">
          {loading ? (
            <div className="h-64 flex items-center text-[#5A6A8A]">Memuat...</div>
          ) : (
            <IDCard peserta={peserta} acaraInfo={acaraInfo} />
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={async () => {
              try {
                await cetakIDCard();
              } catch (e) {
                alert('Gagal mencetak: ' + e.message);
              }
            }}
            className="flex-1 bg-[#003580] text-white font-bold py-3 rounded-xl hover:bg-[#002a66] transition"
          >
            Cetak PDF
          </button>
          <button
            onClick={onTutup}
            className="flex-1 bg-[#EEF2F7] text-[#0D1B3E] font-bold py-3 rounded-xl hover:bg-[#DEE3EC] transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
