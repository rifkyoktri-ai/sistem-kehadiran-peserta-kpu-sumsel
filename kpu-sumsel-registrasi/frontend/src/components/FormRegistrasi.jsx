import { useState } from 'react';
import KameraCapture from './KameraCapture';
import ModalDuplikat from './ModalDuplikat';
import {
  INSTANSI_OPTIONS,
  EXTERNAL_INSTANSI_OPTIONS,
  JABATAN_OPTIONS,
} from '../constants/masterData';

export default function FormRegistrasi({
  onSubmit,
  loading,
  errorMsg,
  duplicateId,
  initialValues,
  onFotoChange,
  duplicateData,
  modalDuplikatOpen,
  onCloseDuplicateModal,
}) {
  const [tipePeserta, setTipePeserta] = useState('internal');
  const [fotoBase64, setFotoBase64] = useState(null);
  const [form, setForm] = useState({
    nama_lengkap: initialValues?.nama_lengkap || '',
    instansi:     initialValues?.instansi     || '',
    jabatan:      initialValues?.jabatan      || '',

    no_hp:        initialValues?.no_hp        || '',
    catatan:      initialValues?.catatan      || '',
  });
  const [instansiLainnya, setInstansiLainnya] = useState('');
  const [pdpChecked, setPdpChecked] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleTipeChange = (tipe) => {
    setTipePeserta(tipe);
    setForm({ nama_lengkap: '', instansi: '', jabatan: '', no_hp: '', catatan: '' });
    setInstansiLainnya('');
    setLocalError('');
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setLocalError('');
  };

  const instansiFinal = form.instansi === 'Lainnya' ? instansiLainnya.trim() : form.instansi;

  const validasi = () => {
    if (!form.nama_lengkap) return 'Nama lengkap wajib diisi.';
    if (!form.instansi) return 'Instansi / Unit Kerja wajib dipilih.';
    if (form.instansi === 'Lainnya' && !instansiLainnya.trim())
      return 'Mohon isi nama instansi Anda pada kolom di bawah dropdown.';
    if (!form.jabatan) return 'Jabatan wajib diisi.';

    if (!form.no_hp) return 'Nomor HP wajib diisi.';
    if (form.no_hp.replace(/\D/g, '').length < 10) return 'Nomor HP minimal 10 digit angka.';
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validasi();
    if (err) { setLocalError(err); return; }
    if (!fotoBase64) { setLocalError('Foto wajib diambil sebelum mendaftar.'); return; }
    if (onSubmit) onSubmit({ ...form, instansi: instansiFinal, tipe_peserta: tipePeserta });
  };

  const tampilError = errorMsg || localError;
  const instansiList = tipePeserta === 'internal' ? INSTANSI_OPTIONS : EXTERNAL_INSTANSI_OPTIONS;
  const jabatanList  = tipePeserta === 'internal' ? JABATAN_OPTIONS  : [];

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Toggle Tipe Peserta */}
        <div className="mb-2 relative z-10">
          <label className="kpu-form-label">Tipe Peserta *</label>
          <div className="kpu-toggle mb-3">
            {[
              { value: 'internal',  label: '🏛️ Internal KPU', desc: 'KPU Provinsi / Kab/Kota' },
              { value: 'eksternal', label: '🤝 Eksternal',     desc: 'Instansi Mitra KPU'     },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleTipeChange(opt.value)}
                className={`kpu-toggle-btn ${tipePeserta === opt.value ? 'active' : ''}`}
              >
                <span className="font-display font-bold text-sm block">{opt.label}</span>
                <span className="text-xs opacity-80 mt-0.5 block">{opt.desc}</span>
                {tipePeserta === opt.value && (
                  <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">
                    DIPILIH ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {tampilError && (
          <div className="bg-[#FEE2E2] border-l-4 border-[#DC2626] text-[#B91C1C] p-4 rounded-r text-sm font-medium">
            <span>{tampilError}</span>
            {duplicateId && (
              <a href="/cek-status" className="font-bold underline hover:text-[#7F1D1D] ml-1">
                ID Anda: {duplicateId}. Cek Status di sini →
              </a>
            )}
          </div>
        )}

        {/* Instansi + Jabatan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="kpu-form-label">Instansi / Unit Kerja *</label>
            <select
              name="instansi"
              value={form.instansi}
              onChange={handleChange}
              className="select-kpu"
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
                onChange={(e) => { setInstansiLainnya(e.target.value); setLocalError(''); }}
                className="input-kpu mt-2"
                placeholder="Tulis nama instansi Anda..."
                required
                autoFocus
              />
            )}
          </div>
          <div>
            <label className="kpu-form-label">Jabatan *</label>
            {tipePeserta === 'internal' ? (
              <select
                name="jabatan"
                value={form.jabatan}
                onChange={handleChange}
                className="select-kpu"
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
                onChange={handleChange}
                className="input-kpu"
                placeholder="Ketik jabatan Anda..."
                required
              />
            )}
          </div>
        </div>

        {/* Nama Lengkap */}
        <div className="relative z-10">
          <label className="kpu-form-label">Nama Lengkap *</label>
          <input
            type="text"
            name="nama_lengkap"
            value={form.nama_lengkap}
            onChange={handleChange}
            className="input-kpu"
            placeholder="Masukkan nama lengkap sesuai identitas"
            required
          />
        </div>

        {/* No HP */}
        <div className="relative z-10">

          <div>
            <label className="kpu-form-label">Nomor HP / WhatsApp *</label>
            <input
              type="text"
              name="no_hp"
              value={form.no_hp}
              onChange={handleChange}
              className="input-kpu"
              placeholder="Minimal 10 digit angka"
              required
            />
          </div>
        </div>

        {/* Catatan */}
        <div className="relative z-10">
          <label className="kpu-form-label">Catatan Khusus (Opsional)</label>
          <textarea
            name="catatan"
            value={form.catatan}
            onChange={handleChange}
            rows="3"
            className="input-kpu"
            placeholder="Catatan medis/diet/keterangan pengganti..."
          />
        </div>

        {/* Upload Foto */}
        <KameraCapture
          label="Upload Foto Wajah"
          required={true}
          error={localError}
          onChange={(base64) => {
            setFotoBase64(base64);
            if (onFotoChange) onFotoChange(base64);
          }}
        />

        {/* Info Prefix ID */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-medium"
          style={{
            background: tipePeserta === 'internal' ? 'rgba(107,15,26,0.06)' : 'rgba(200,151,42,0.08)',
            color: '#5A6A8A',
          }}
        >
          <span className="text-base">🪪</span>
          <span>
            ID peserta Anda akan menggunakan prefix&nbsp;
            <strong style={{ color: tipePeserta === 'internal' ? '#6B0F1A' : '#C8972A' }}>
              {tipePeserta === 'internal' ? 'KPU-XXXX' : 'EKS-XXXX'}
            </strong>
          </span>
        </div>

        {/* UU PDP */}
        <div className="bg-[#FFF5F5] border border-[#6B0F1A] rounded-lg p-4 flex items-start mt-2">
          <input
            id="pdp"
            type="checkbox"
            checked={pdpChecked}
            onChange={(e) => setPdpChecked(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-[#6B0F1A] focus:ring-[#6B0F1A]"
          />
          <label htmlFor="pdp" className="ml-3 text-sm font-body text-[#3A0708] leading-relaxed cursor-pointer">
            Saya menyetujui penggunaan data pribadi oleh KPU Provinsi Sumatera Selatan untuk
            keperluan administrasi acara ini sesuai UU PDP No. 27 Tahun 2022.
          </label>
        </div>

        <div className="pt-2 relative z-10">
          <button
            type="submit"
            className="btn-kpu w-full"
            disabled={loading || !pdpChecked}
          >
            {loading ? 'MEMPROSES...' : 'DAFTAR SEKARANG'}
          </button>
        </div>
      </form>

      <ModalDuplikat
        isOpen={modalDuplikatOpen}
        nama={duplicateData?.nama}
        nomor_urut={duplicateData?.nomor_urut}
        token={duplicateData?.token}
        onClose={onCloseDuplicateModal}
      />
    </>
  );
}
