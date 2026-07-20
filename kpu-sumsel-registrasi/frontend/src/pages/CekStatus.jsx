import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../constants';
import { cetakIDCard } from '../utils/printIDCard';
import StatusBadge from '../components/StatusBadge';
import HeaderUtama from '../components/HeaderUtama';
import TombolPrimer from '../components/TombolPrimer';
import IDCard from '../components/IDCard';

export default function CekStatus() {
  const [email, setEmail] = useState('');
  const [peserta, setPeserta] = useState(null);
  const [acara, setAcara] = useState(null);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/acara/info`)
      .then((res) => res.json())
      .then((resJson) => {
        if (resJson.sukses) setAcara(resJson.data);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleCekStatus = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Masukkan email terdaftar Anda.');
      return;
    }

    setSearching(true);
    setErrorMsg('');
    setPeserta(null);

    try {
      const res = await fetch(`${API_BASE_URL}/peserta/cek-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const resJson = await res.json();

      if (res.status === 404) {
        setErrorMsg('Email tidak ditemukan dalam daftar peserta.');
      } else if (!resJson.sukses) {
        setErrorMsg(resJson.pesan || 'Gagal memeriksa status.');
      } else {
        setPeserta(resJson.data);
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF2F7] flex flex-col">
      <HeaderUtama />

      <main className="flex-1 py-12 px-6 flex flex-col items-center">
        {/* Header Judul Section */}
        <div className="w-full max-w-2xl mb-6 relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C8972A]"></div>
          <div className="pl-6 py-1">
            <h2 className="font-display font-bold text-2xl text-[#6B0F1A]">Cek Status Pendaftaran</h2>
            <p className="font-body text-[#5A6A8A]">Masukkan email yang digunakan saat pendaftaran</p>
          </div>
        </div>

        {/* Form Pencarian */}
        <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-card mb-8">
          <form onSubmit={handleCekStatus} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input 
                type="email" 
                value={email} 
                onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }} 
                className="w-full h-14 px-5 rounded-xl text-base font-body border-[1.5px] border-[#E2E8F0] bg-white text-[#3A0708] placeholder:text-[#5A6A8A] focus:outline-none focus:border-[#6B0F1A] focus:ring-[3px] focus:ring-[#6B0F1A]/12 transition-all duration-200" 
                placeholder="nama@domain.com" 
              />
            </div>
            <div className="w-full md:w-auto">
              <TombolPrimer type="submit" disabled={searching} className="h-14 px-8 min-w-[160px]" fullWidth={true}>
                {searching ? 'MEMERIKSA...' : 'CEK STATUS'}
              </TombolPrimer>
            </div>
          </form>
        </div>

        {errorMsg && (
          <div className="w-full max-w-2xl bg-[#FEE2E2] border-l-4 border-[#DC2626] text-[#B91C1C] p-4 rounded text-sm font-medium mb-6">
            {errorMsg}
          </div>
        )}

        {/* Hasil Pencarian */}
        {peserta && (
          <div className="w-full max-w-2xl animate-[slideUp_250ms_ease-out]">
            {(peserta.status === 'terdaftar' || peserta.status === 'hadir') ? (
              /* Card: Terdaftar / Hadir */
              <div className="bg-white rounded-2xl p-8 shadow-card relative overflow-hidden border border-[#E2E8F0]">
                <div className="absolute top-6 right-6">
                  <StatusBadge status={peserta.status} />
                </div>
                
                <div className="mb-6">
                  <p className="font-body font-bold text-[#6B0F1A] mb-2">
                    No. {String(peserta.nomor_urut).padStart(3, '0')} &mdash; <span className="font-mono">{peserta.id}</span>
                  </p>
                  <h3 className="font-display font-bold text-2xl text-[#3A0708] uppercase">{peserta.nama_lengkap}</h3>
                  <p className="font-body text-[#3A0708] mt-1">{peserta.instansi}</p>
                  <p className="font-body text-[#5A6A8A]">{peserta.jabatan}</p>
                </div>
                
                <div className="h-px w-full bg-[#E2E8F0] mb-6 relative">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[#C8972A]">◆</div>
                </div>

                <div className="flex justify-center mb-6">
                  <IDCard peserta={{ ...peserta, nama_acara: acara?.nama_acara, tanggal_acara: acara?.tanggal_acara, lokasi_acara: acara?.lokasi_acara }} acaraInfo={acara} />
                </div>

                <div className="flex flex-col gap-3">
                  <TombolPrimer onClick={async () => { try { await cetakIDCard(); } catch (e) { alert(e.message); } }} varian="primer" fullWidth>
                    🖨 CETAK ID CARD
                  </TombolPrimer>
                </div>
              </div>
            ) : (
              /* Card: Batal / Ganti */
              <div className="bg-[#FEE2E2] rounded-2xl p-8 border-2 border-[#DC2626] shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 shrink-0 bg-[#DC2626] text-white rounded-full flex items-center justify-center font-bold text-xl">✕</div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-[#B91C1C] mb-2">Pendaftaran {peserta.status === 'digantikan' ? 'Digantikan' : 'Dibatalkan'}</h3>
                    <p className="font-body text-[#B91C1C]">
                      {peserta.status === 'membatalkan' 
                        ? 'Pendaftaran Anda telah dibatalkan. Hubungi panitia untuk informasi lebih lanjut.'
                        : 'Slot kehadiran Anda telah dialihkan/digantikan oleh peserta lain. Hubungi panitia untuk informasi lebih lanjut.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
