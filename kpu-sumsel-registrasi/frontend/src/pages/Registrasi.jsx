import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../constants';
import HeaderUtama from '../components/HeaderUtama';
import TombolPrimer from '../components/TombolPrimer';

export default function Registrasi() {
  const navigate = useNavigate();
  const [acara, setAcara] = useState(null);
  const [loadingAcara, setLoadingAcara] = useState(true);
  const [form, setForm] = useState({ nama_lengkap: '', instansi: '', jabatan: '', email: '', no_hp: '', catatan: '' });
  const [pdpChecked, setPdpChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateId, setDuplicateId] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/acara/info`)
      .then((res) => res.json())
      .then((resJson) => {
        if (resJson.sukses) setAcara(resJson.data);
        setLoadingAcara(false);
      })
      .catch(() => setLoadingAcara(false));
  }, []);

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrorMsg('');
    setDuplicateId('');
  };

  const validasiInput = () => {
    if (!form.nama_lengkap || !form.instansi || !form.jabatan || !form.email || !form.no_hp) {
      return 'Semua field dengan tanda bintang (*) wajib diisi.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      return 'Format alamat email tidak valid.';
    }
    const hpClean = form.no_hp.replace(/\D/g, '');
    if (hpClean.length < 10) {
      return 'Nomor HP tidak valid. Minimal harus 10 digit angka.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errorMsgValidasi = validasiInput();
    if (errorMsgValidasi) {
      setErrorMsg(errorMsgValidasi);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setDuplicateId('');

    try {
      const res = await fetch(`${API_BASE_URL}/peserta/daftar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const resJson = await res.json();

      if (res.status === 409 && resJson.data?.id_terdaftar) {
        setDuplicateId(resJson.data.id_terdaftar);
        setErrorMsg('Email ini sudah terdaftar.');
      } else if (!resJson.sukses) {
        setErrorMsg(resJson.pesan || 'Gagal mendaftar. Silakan coba lagi.');
      } else {
        navigate(`/konfirmasi/${resJson.data.id}`);
      }
    } catch (err) {
      setErrorMsg('Koneksi internet bermasalah. Hubungi panitia.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAcara) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEF2F7] text-[#003580] font-semibold">
        <div className="flex flex-col items-center">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
        </div>
      </div>
    );
  }

  const kuotaHabis = acara && (acara.sisa_kuota <= 0 || parseInt(acara.total_terdaftar) >= parseInt(acara.kuota_maksimal));
  const registrasiTutup = acara && (acara.status_registrasi === 'tutup' || kuotaHabis);

  const namaAcara = acara?.nama_acara || 'KEGIATAN KPU PROVINSI SUMATERA SELATAN';
  const tanggal = acara?.tanggal_acara || 'Tanggal belum ditentukan';
  const waktu = acara?.waktu_acara || 'Waktu belum ditentukan';
  const lokasi = acara?.lokasi_acara || 'Lokasi belum ditentukan';

  // Kelas Tailwind untuk input field — konsisten di seluruh form
  const kelasInput = `
    w-full px-4 py-3 rounded-lg text-sm font-body
    border-[1.5px] border-[#E2E8F0] bg-white text-[#0D1B3E]
    placeholder:text-[#5A6A8A]
    focus:outline-none focus:border-[#003580]
    focus:ring-[3px] focus:ring-[#003580]/12
    transition-all duration-200
  `;

  return (
    <div className="min-h-screen bg-[#EEF2F7] flex flex-col">
      <HeaderUtama />

      <main className="flex-1">
        {/* Banner Acara */}
        <section 
          style={{ background: 'linear-gradient(160deg, #001f5b 0%, #003580 100%)' }}
          className="py-14 px-8"
        >
          <div className="max-w-4xl mx-auto">
            {/* Badge */}
            <span 
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6"
              style={{ background: 'rgba(200,151,42,0.15)', color: '#E8B84B', border: '1px solid rgba(200,151,42,0.4)' }}
            >
              ● Acara Resmi KPU
            </span>

            {/* Judul acara */}
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-2 font-display">
              {namaAcara}
            </h2>

            {/* Garis emas tipis */}
            <div className="h-px w-full my-6" style={{ background: 'rgba(200,151,42,0.4)' }} />

            {/* Info 3 kolom */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[ 
                ['📅', 'Tanggal', tanggal], 
                ['🕙', 'Waktu', waktu], 
                ['📍', 'Lokasi', lokasi] 
              ].map(([ikon, label, nilai]) => (
                <div key={label}>
                  <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'rgba(200,151,42,0.8)' }}>
                    {ikon} {label}
                  </p>
                  <p className="text-base font-semibold text-white">{nilai}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Form Registrasi Wrapper */}
        <section className="py-12 px-8">
          <div className="max-w-3xl mx-auto">
            {registrasiTutup ? (
              <div className="bg-[#FEF3C7] border-2 border-[#D97706] text-[#92400E] p-8 rounded-2xl text-center shadow-card">
                <h3 className="font-display font-bold text-2xl mb-2">Pendaftaran Telah Ditutup</h3>
                <p className="font-body text-base">
                  Pendaftaran ditutup karena batas kuota telah terpenuhi atau masa pendaftaran telah berakhir. 
                  Silakan hubungi panitia untuk info lebih lanjut.
                </p>
              </div>
            ) : (
              <div 
                className="bg-white rounded-2xl p-8 md:p-10 relative overflow-hidden"
                style={{ boxShadow: '0 4px 20px rgba(0, 53, 128, 0.08)' }}
              >
                {/* Garis kiri emas 4px */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C8972A]"></div>
                
                <div className="mb-8">
                  <h3 className="font-display font-bold text-2xl text-[#003580] mb-1">Formulir Pendaftaran Peserta</h3>
                  <p className="font-body text-sm text-[#5A6A8A]">Lengkapi data diri Anda dengan benar sesuai identitas</p>
                </div>
                
                {errorMsg && (
                  <div className="bg-[#FEE2E2] border-l-4 border-[#DC2626] text-[#B91C1C] p-4 mb-6 rounded-r text-sm font-medium">
                    <span>{errorMsg} </span>
                    {duplicateId && (
                      <Link to="/cek-status" className="font-bold underline hover:text-[#7F1D1D] ml-1">
                        ID Anda: {duplicateId}. Cek Status di sini →
                      </Link>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">Nama Lengkap *</label>
                    <input 
                      type="text" name="nama_lengkap" value={form.nama_lengkap} onChange={handleInputChange} 
                      className={kelasInput} placeholder="Masukkan nama lengkap sesuai identitas" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">Instansi / Unit Kerja *</label>
                      <input 
                        type="text" name="instansi" value={form.instansi} onChange={handleInputChange} 
                        className={kelasInput} placeholder="Contoh: KPU Kota Palembang" 
                      />
                    </div>
                    <div>
                      <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">Jabatan *</label>
                      <input 
                        type="text" name="jabatan" value={form.jabatan} onChange={handleInputChange} 
                        className={kelasInput} placeholder="Contoh: Komisioner / Staf" 
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">Email *</label>
                      <input 
                        type="email" name="email" value={form.email} onChange={handleInputChange} 
                        className={kelasInput} placeholder="Contoh: nama@domain.com" 
                      />
                    </div>
                    <div>
                      <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">Nomor HP / WhatsApp *</label>
                      <input 
                        type="text" name="no_hp" value={form.no_hp} onChange={handleInputChange} 
                        className={kelasInput} placeholder="Minimal 10 digit angka" 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">Catatan Khusus (Opsional)</label>
                    <textarea 
                      name="catatan" value={form.catatan} onChange={handleInputChange} rows="3" 
                      className={kelasInput} placeholder="Catatan medis/diet/keterangan pengganti..."
                    ></textarea>
                  </div>

                  {/* UU PDP */}
                  <div className="bg-[#EEF2F7] border border-[#003580] rounded-lg p-4 flex items-start mt-8">
                    <input 
                      id="pdp" type="checkbox" checked={pdpChecked} onChange={(e) => setPdpChecked(e.target.checked)} 
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-[#003580] focus:ring-[#003580]" 
                    />
                    <label htmlFor="pdp" className="ml-3 text-sm font-body text-[#0D1B3E] leading-relaxed cursor-pointer">
                      Saya menyetujui penggunaan data pribadi oleh KPU Provinsi Sumatera Selatan untuk 
                      keperluan administrasi acara ini sesuai UU PDP No. 27 Tahun 2022.
                    </label>
                  </div>

                  <div className="pt-2">
                    <TombolPrimer 
                      type="submit" 
                      varian="primer" 
                      ukuran="lg" 
                      fullWidth={true} 
                      disabled={submitting || !pdpChecked}
                    >
                      {submitting ? 'MEMPROSES...' : 'DAFTAR SEKARANG'}
                    </TombolPrimer>
                  </div>
                </form>

                <div className="text-center mt-8 text-sm font-body">
                  <Link to="/cek-status" className="text-[#003580] font-semibold hover:underline">
                    Sudah terdaftar? Cek status di sini →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer minimal */}
      <footer className="py-6 text-center text-[#5A6A8A] text-xs">
        &copy; {new Date().getFullYear()} KPU Provinsi Sumatera Selatan.
      </footer>
    </div>
  );
}
