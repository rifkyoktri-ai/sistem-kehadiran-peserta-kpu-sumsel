import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../constants';
import { generateQRCode } from '../utils/generateQR';
import { downloadIDCard } from '../utils/generatePDF';
import { cetakIDCard } from '../utils/printIDCard';
import StatusBadge from '../components/StatusBadge';
import HeaderUtama from '../components/HeaderUtama';
import TombolPrimer from '../components/TombolPrimer';
import IDCard from '../components/IDCard';

export default function Konfirmasi() {
  const { id } = useParams();
  const [peserta, setPeserta] = useState(null);
  const [acara, setAcara] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resP, resA] = await Promise.all([
          fetch(`${API_BASE_URL}/peserta/info/${id}`),
          fetch(`${API_BASE_URL}/acara/info`)
        ]);
        const dataP = await resP.json();
        const dataA = await resA.json();

        if (dataP.sukses) {
          setPeserta(dataP.data);
          const qrUrl = await generateQRCode(dataP.data.id);
          setQrCodeUrl(qrUrl);
        } else {
          setErrorMsg(dataP.pesan || 'Peserta tidak ditemukan.');
        }

        if (dataA.sukses) setAcara(dataA.data);
      } catch (err) {
        setErrorMsg('Gagal memuat data dari server.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleUnduhPDF = () => {
    if (!peserta) return;
    const fullData = {
      ...peserta,
      nama_acara: acara?.nama_acara,
      tanggal_acara: acara?.tanggal_acara,
      lokasi_acara: acara?.lokasi_acara
    };
    downloadIDCard(fullData, qrCodeUrl);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEF2F7]">
        <div className="flex flex-col items-center">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#EEF2F7] px-4 text-center">
        <p className="text-[#DC2626] font-bold text-lg mb-4">{errorMsg}</p>
        <Link to="/" className="text-[#003580] hover:underline">Kembali ke Halaman Registrasi</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF2F7] flex flex-col">
      <HeaderUtama />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-2xl mx-auto">
          {/* Card Utama */}
          <div className="bg-white rounded-2xl p-8 shadow-card mb-6">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#DCFCE7] text-[#16A34A] rounded-full mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="font-display text-3xl font-bold text-[#0D1B3E] mb-2">Pendaftaran Berhasil!</h2>
              <p className="font-body text-[#5A6A8A]">Simpan ID registrasi Anda sebagai referensi resmi KPU</p>
            </div>

            {/* Divider emas tipis */}
            <div className="h-px w-full bg-[#E2E8F0] relative my-8">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[#C8972A]">◆</div>
            </div>

            {/* Card Info */}
            <div className="bg-[#EEF2F7] rounded-xl p-6 mb-8 border border-[#E2E8F0]">
              <table className="w-full text-sm font-body">
                <tbody>
                  <tr className="border-b border-[#E2E8F0]"><td className="py-3 text-[#5A6A8A] font-medium w-1/3">No. Peserta</td><td className="py-3 font-bold text-[#0D1B3E]">{String(peserta.nomor_urut).padStart(3, '0')}</td></tr>
                  <tr className="border-b border-[#E2E8F0]"><td className="py-3 text-[#5A6A8A] font-medium">ID Registrasi</td><td className="py-3 font-mono font-bold text-[#003580]">{peserta.id}</td></tr>
                  <tr className="border-b border-[#E2E8F0]"><td className="py-3 text-[#5A6A8A] font-medium">Nama Lengkap</td><td className="py-3 font-bold text-[#0D1B3E] uppercase">{peserta.nama_lengkap}</td></tr>
                  <tr className="border-b border-[#E2E8F0]"><td className="py-3 text-[#5A6A8A] font-medium">Instansi</td><td className="py-3 text-[#0D1B3E]">{peserta.instansi}</td></tr>
                  <tr className="border-b border-[#E2E8F0]"><td className="py-3 text-[#5A6A8A] font-medium">Jabatan</td><td className="py-3 text-[#0D1B3E]">{peserta.jabatan}</td></tr>
                  <tr><td className="py-3 text-[#5A6A8A] font-medium">Status</td><td className="py-3"><StatusBadge status={peserta.status} /></td></tr>
                </tbody>
              </table>
            </div>

            {/* Visual Preview ID Card */}
            <div className="mb-8">
              <p className="text-center font-display font-semibold text-[#003580] mb-4">Preview ID Card</p>
              <div className="flex justify-center">
                <IDCard peserta={{ ...peserta, nama_acara: acara?.nama_acara, tanggal_acara: acara?.tanggal_acara, lokasi_acara: acara?.lokasi_acara }} acaraInfo={acara} />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <TombolPrimer onClick={async () => { try { await cetakIDCard(); } catch (e) { alert(e.message); } }} fullWidth={true} varian="primer" ukuran="lg">
                🖨 CETAK ID CARD
              </TombolPrimer>
              
              <TombolPrimer onClick={handleUnduhPDF} fullWidth={true} varian="outline" ukuran="lg">
                ⬇ UNDUH PDF (QR)
              </TombolPrimer>
              
              <Link to="/cek-status" className="block">
                <TombolPrimer fullWidth={true} varian="outline" ukuran="lg">
                  Cek Status Pendaftaran
                </TombolPrimer>
              </Link>
            </div>
          </div>

          {/* Warning Card */}
          <div className="bg-[#FEF3C7] border border-[#D97706] rounded-xl p-5 shadow-sm flex gap-4 items-start">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-display font-bold text-[#92400E] mb-1">Catatan Penting</h4>
              <p className="font-body text-sm text-[#92400E]">
                Harap cetak atau simpan PDF ID Card Anda di ponsel. Tunjukkan kepada petugas di meja registrasi saat menghadiri lokasi acara.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
