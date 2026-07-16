import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../constants';
import HeaderUtama from '../components/HeaderUtama';
import TombolPrimer from '../components/TombolPrimer';
import KameraCapture from '../components/KameraCapture';
import ModalDuplikat from '../components/ModalDuplikat';
import {
  INSTANSI_OPTIONS,
  EXTERNAL_INSTANSI_OPTIONS,
  JABATAN_OPTIONS,
} from '../constants/masterData';

export default function Registrasi() {
  const navigate = useNavigate();

  const [acara, setAcara] = useState(null);
  const [loadingAcara, setLoadingAcara] = useState(true);
  const [tipePeserta, setTipePeserta] = useState('internal');
  const [form, setForm] = useState({
    nama_lengkap: '',
    instansi: '',
    jabatan: '',
    email: '',
    no_hp: '',
    catatan: '',
  });
  const [instansiLainnya, setInstansiLainnya] = useState('');
  const [pdpChecked, setPdpChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateId, setDuplicateId] = useState('');
  const [fotoBase64, setFotoBase64] = useState(null);

  const [modalDuplikatOpen, setModalDuplikatOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState({ nama: '', nomor_urut: '', token: '' });

  useEffect(() => {
    fetch(`${API_BASE_URL}/acara/info`)
      .then((res) => res.json())
      .then((resJson) => {
        if (resJson.sukses) setAcara(resJson.data);
        setLoadingAcara(false);
      })
      .catch(() => setLoadingAcara(false));
  }, []);

  const handleTipeChange = (tipe) => {
    setTipePeserta(tipe);
    setForm({ nama_lengkap: '', instansi: '', jabatan: '', email: '', no_hp: '', catatan: '' });
    setInstansiLainnya('');
    setErrorMsg('');
    setDuplicateId('');
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrorMsg('');
    setDuplicateId('');
  };

  const instansiFinal = form.instansi === 'Lainnya' ? instansiLainnya.trim() : form.instansi;

  const validasiInput = () => {
    if (!form.nama_lengkap) return 'Nama lengkap wajib diisi.';
    if (!form.instansi) return 'Instansi / Unit Kerja wajib dipilih.';
    if (form.instansi === 'Lainnya' && !instansiLainnya.trim())
      return 'Mohon isi nama instansi Anda pada kolom di bawah dropdown.';
    if (!form.jabatan) return 'Jabatan wajib diisi.';
    if (tipePeserta === 'eksternal') {
      if (!form.email) return 'Email wajib diisi untuk peserta eksternal.';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) return 'Format alamat email tidak valid.';
    }
    if (!form.no_hp) return 'Nomor HP wajib diisi.';
    const hpClean = form.no_hp.replace(/\D/g, '');
    if (hpClean.length < 10) return 'Nomor HP minimal 10 digit angka.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validasiInput();
    if (err) { setErrorMsg(err); return; }
    if (!fotoBase64) {
      setErrorMsg('Foto wajib diambil sebelum mendaftar.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    setDuplicateId('');
    try {
      const payload = { ...form, instansi: instansiFinal, tipe_peserta: tipePeserta, foto_base64: fotoBase64 };
      const res = await fetch(`${API_BASE_URL}/peserta/daftar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resJson = await res.json();
      if (res.status === 409 && resJson.error === 'duplikat') {
        setDuplicateData({
          nama: resJson.data?.nama || '',
          nomor_urut: resJson.data?.nomor_urut || '',
          token: resJson.data?.id || resJson.data?.token || ''
        });
        setModalDuplikatOpen(true);
      } else if (res.status === 409 && resJson.data?.id_terdaftar) {
        setDuplicateId(resJson.data.id_terdaftar);
        setErrorMsg('Email / nomor HP ini sudah terdaftar untuk acara ini.');
      } else if (!resJson.sukses) {
        setErrorMsg(resJson.pesan || 'Gagal mendaftar. Silakan coba lagi.');
      } else {
        navigate(`/konfirmasi/${resJson.data.id}`);
      }
    } catch {
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
  const tanggal   = acara?.tanggal_acara || 'Tanggal belum ditentukan';
  const waktu     = acara?.waktu_acara   || 'Waktu belum ditentukan';
  const lokasi    = acara?.lokasi_acara  || 'Lokasi belum ditentukan';

  const kelasInput = `
    w-full px-4 py-3 rounded-lg text-sm font-body
    border-[1.5px] border-[#E2E8F0] bg-white text-[#0D1B3E]
    placeholder:text-[#5A6A8A]
    focus:outline-none focus:border-[#003580]
    focus:ring-[3px] focus:ring-[#003580]/12
    transition-all duration-200
  `;

  const instansiList = tipePeserta === 'internal' ? INSTANSI_OPTIONS : EXTERNAL_INSTANSI_OPTIONS;
  const jabatanList = tipePeserta === 'internal' ? JABATAN_OPTIONS : [];

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
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6"
              style={{ background: 'rgba(200,151,42,0.15)', color: '#E8B84B', border: '1px solid rgba(200,151,42,0.4)' }}
            >
              ● Acara Resmi KPU
            </span>

            <h2 className="text-4xl font-extrabold text-white leading-tight mb-2 font-display">
              {namaAcara}
            </h2>

            <div className="h-px w-full my-6" style={{ background: 'rgba(200,151,42,0.4)' }} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                ['📅', 'Tanggal', tanggal],
                ['🕙', 'Waktu', waktu],
                ['📍', 'Lokasi', lokasi],
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

        {/* Form Registrasi */}
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
                {/* Garis kiri emas */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C8972A]"></div>

                <div className="mb-6">
                  <h3 className="font-display font-bold text-2xl text-[#003580] mb-1">Formulir Pendaftaran Peserta</h3>
                  <p className="font-body text-sm text-[#5A6A8A]">Lengkapi data diri Anda dengan benar sesuai identitas</p>
                </div>

                {/* Toggle Tipe Peserta */}
                <div className="mb-8">
                  <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-3">
                    Tipe Peserta *
                  </label>
                  <div className="flex gap-3">
                    {[
                      { value: 'internal', label: '🏛️ Internal KPU', desc: 'KPU Provinsi / Kab/Kota' },
                      { value: 'eksternal', label: '🤝 Eksternal', desc: 'Instansi Mitra KPU' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleTipeChange(opt.value)}
                        className="flex-1 flex flex-col items-start px-5 py-4 rounded-xl border-2 transition-all duration-200 text-left"
                        style={{
                          borderColor: tipePeserta === opt.value ? '#003580' : '#E2E8F0',
                          background: tipePeserta === opt.value ? 'rgba(0,53,128,0.06)' : '#fff',
                        }}
                      >
                        <span className="font-display font-bold text-sm text-[#0D1B3E]">{opt.label}</span>
                        <span className="text-xs text-[#5A6A8A] mt-0.5">{opt.desc}</span>
                        {tipePeserta === opt.value && (
                          <span className="mt-2 text-[10px] font-bold text-[#003580] bg-[#003580]/10 px-2 py-0.5 rounded-full">
                            DIPILIH ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Message */}
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

                  {/* Baris 1: Instansi + Jabatan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">
                        Instansi / Unit Kerja *
                      </label>
                      <select
                        name="instansi"
                        value={form.instansi}
                        onChange={handleInputChange}
                        className={kelasInput}
                        required
                      >
                        <option value="">-- Pilih Instansi/Unit Kerja --</option>
                        {instansiList.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      {form.instansi === 'Lainnya' && (
                        <input
                          type="text"
                          value={instansiLainnya}
                          onChange={(e) => { setInstansiLainnya(e.target.value); setErrorMsg(''); }}
                          className={kelasInput + ' mt-2'}
                          placeholder="Tulis nama instansi Anda..."
                          required
                          autoFocus
                        />
                      )}
                    </div>
                    <div>
                      <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">
                        Jabatan *
                      </label>
                      {tipePeserta === 'internal' ? (
                        <select
                          name="jabatan"
                          value={form.jabatan}
                          onChange={handleInputChange}
                          className={kelasInput}
                          required
                        >
                          <option value="">-- Pilih Jabatan --</option>
                          {jabatanList.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="jabatan"
                          value={form.jabatan}
                          onChange={handleInputChange}
                          className={kelasInput}
                          placeholder="Ketik jabatan Anda..."
                          required
                        />
                      )}
                    </div>
                  </div>

                  {/* Nama Lengkap */}
                  <div>
                    <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      name="nama_lengkap"
                      value={form.nama_lengkap}
                      onChange={handleInputChange}
                      className={kelasInput}
                      placeholder="Masukkan nama lengkap sesuai identitas"
                      required
                    />
                  </div>

                  {/* Email + No HP */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">
                        Email {tipePeserta === 'eksternal' ? '*' : '(Opsional)'}
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleInputChange}
                        className={kelasInput}
                        placeholder="Contoh: nama@domain.com"
                        required={tipePeserta === 'eksternal'}
                      />
                      {tipePeserta === 'internal' && (
                        <p className="text-xs text-[#5A6A8A] mt-1">* Opsional untuk peserta internal KPU</p>
                      )}
                    </div>
                    <div>
                      <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">
                        Nomor HP / WhatsApp *
                      </label>
                      <input
                        type="text"
                        name="no_hp"
                        value={form.no_hp}
                        onChange={handleInputChange}
                        className={kelasInput}
                        placeholder="Minimal 10 digit angka"
                        required
                      />
                    </div>
                  </div>

                  {/* Catatan */}
                  <div>
                    <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">
                      Catatan Khusus (Opsional)
                    </label>
                    <textarea
                      name="catatan"
                      value={form.catatan}
                      onChange={handleInputChange}
                      rows="3"
                      className={kelasInput}
                      placeholder="Catatan medis/diet/keterangan pengganti..."
                    ></textarea>
                  </div>

                  {/* Upload Foto */}
                  <KameraCapture
                    label="Upload Foto Wajah"
                    required={true}
                    error={errorMsg}
                    onChange={(base64) => setFotoBase64(base64)}
                  />

                  {/* Prefix info */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium"
                    style={{ background: tipePeserta === 'internal' ? 'rgba(0,53,128,0.06)' : 'rgba(200,151,42,0.08)', color: '#5A6A8A' }}
                  >
                    <span className="text-base">🪪</span>
                    <span>
                      ID peserta Anda akan menggunakan prefix&nbsp;
                      <strong style={{ color: tipePeserta === 'internal' ? '#003580' : '#C8972A' }}>
                        {tipePeserta === 'internal' ? 'KPU-XXXX' : 'EKS-XXXX'}
                      </strong>
                    </span>
                  </div>

                  {/* UU PDP */}
                  <div className="bg-[#EEF2F7] border border-[#003580] rounded-lg p-4 flex items-start mt-2">
                    <input
                      id="pdp"
                      type="checkbox"
                      checked={pdpChecked}
                      onChange={(e) => setPdpChecked(e.target.checked)}
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

      <footer className="py-6 text-center text-[#5A6A8A] text-xs">
        &copy; {new Date().getFullYear()} KPU Provinsi Sumatera Selatan.
      </footer>

      <ModalDuplikat
        isOpen={modalDuplikatOpen}
        nama={duplicateData.nama}
        nomor_urut={duplicateData.nomor_urut}
        token={duplicateData.token}
        onClose={() => setModalDuplikatOpen(false)}
      />
    </div>
  );
}
