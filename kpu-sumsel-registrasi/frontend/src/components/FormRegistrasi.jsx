import { useState } from 'react';
import TombolPrimer from './TombolPrimer';

export default function FormRegistrasi({ onSubmit, loading, errorMsg, duplicateId, initialValues }) {
  const [form, setForm] = useState({
    nama_lengkap: initialValues?.nama_lengkap || '',
    instansi: initialValues?.instansi || '',
    jabatan: initialValues?.jabatan || '',
    email: initialValues?.email || '',
    no_hp: initialValues?.no_hp || '',
    catatan: initialValues?.catatan || '',
  });
  const [pdpChecked, setPdpChecked] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setLocalError('');
  };

  const validasi = () => {
    if (!form.nama_lengkap || !form.instansi || !form.jabatan || !form.email || !form.no_hp) {
      return 'Semua field dengan tanda bintang (*) wajib diisi.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return 'Format email tidak valid.';
    }
    if (form.no_hp.replace(/\D/g, '').length < 10) {
      return 'Nomor HP minimal 10 digit angka.';
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validasi();
    if (err) { setLocalError(err); return; }
    if (onSubmit) onSubmit(form);
  };

  const tampilError = errorMsg || localError;

  const kelasInput = `
    w-full px-4 py-3 rounded-lg text-sm font-body
    border-[1.5px] border-[#E2E8F0] bg-white text-[#0D1B3E]
    placeholder:text-[#5A6A8A]
    focus:outline-none focus:border-[#003580]
    focus:ring-[3px] focus:ring-[#003580]/12
    transition-all duration-200
  `;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {tampilError && (
        <div className="bg-[#FEE2E2] border-l-4 border-[#DC2626] text-[#B91C1C] p-4 rounded-r text-sm font-medium">
          <span>{tampilError}</span>
          {duplicateId && (
            <a href={`/cek-status`} className="font-bold underline hover:text-[#7F1D1D] ml-1">
              ID Anda: {duplicateId}. Cek Status di sini →
            </a>
          )}
        </div>
      )}

      <div>
        <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">Nama Lengkap *</label>
        <input
          type="text" name="nama_lengkap" value={form.nama_lengkap} onChange={handleChange}
          className={kelasInput}
          placeholder="Masukkan nama lengkap sesuai identitas"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">Instansi *</label>
          <input
            type="text" name="instansi" value={form.instansi} onChange={handleChange}
            className={kelasInput}
            placeholder="Contoh: KPU Kota Palembang"
          />
        </div>
        <div>
          <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">Jabatan *</label>
          <input
            type="text" name="jabatan" value={form.jabatan} onChange={handleChange}
            className={kelasInput}
            placeholder="Contoh: Komisioner / Staf"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">Email *</label>
          <input
            type="email" name="email" value={form.email} onChange={handleChange}
            className={kelasInput}
            placeholder="nama@domain.com"
          />
        </div>
        <div>
          <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">No. HP *</label>
          <input
            type="text" name="no_hp" value={form.no_hp} onChange={handleChange}
            className={kelasInput}
            placeholder="Minimal 10 digit angka"
          />
        </div>
      </div>

      <div>
        <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-2">Catatan (Opsional)</label>
        <textarea
          name="catatan" value={form.catatan} onChange={handleChange} rows="2"
          className={kelasInput}
          placeholder="Catatan medis/diet/keterangan..."
        />
      </div>

      <div className="bg-[#EEF2F7] border border-[#003580] rounded-lg p-4 flex items-start mt-2">
        <input
          id="pdp" type="checkbox" checked={pdpChecked}
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
          disabled={loading || !pdpChecked}
        >
          {loading ? 'MEMPROSES...' : 'DAFTAR SEKARANG'}
        </TombolPrimer>
      </div>
    </form>
  );
}
