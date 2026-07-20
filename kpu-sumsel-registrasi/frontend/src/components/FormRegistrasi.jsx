import { useState } from 'react';
import TombolPrimer from './TombolPrimer';
import KameraCapture from './KameraCapture';
import ModalDuplikat from './ModalDuplikat';
import { INSTANSI_OPTIONS, JABATAN_OPTIONS } from '../constants/masterData';

export default function FormRegistrasi({ onSubmit, loading, errorMsg, duplicateId, initialValues, onFotoChange, duplicateData, modalDuplikatOpen, onCloseDuplicateModal }) {
  const [fotoBase64, setFotoBase64] = useState(null);
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
    if (!fotoBase64) {
        setLocalError('Foto wajib diambil sebelum mendaftar.');
        return;
      } if (onSubmit) onSubmit(form);
  };

  const tampilError = errorMsg || localError;

  const kelasInput = "input-kpu";
  const kelasSelect = "select-kpu";

  return (
    <>
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
          <label className="kpu-form-label">Nama Lengkap *</label>
          <input
            type="text" name="nama_lengkap" value={form.nama_lengkap} onChange={handleChange}
            className={kelasInput}
            placeholder="Masukkan nama lengkap sesuai identitas"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="kpu-form-label">Instansi *</label>
            <select
              name="instansi" value={form.instansi} onChange={handleChange}
              className={kelasSelect} required
            >
              <option value="">-- Pilih Instansi/Unit Kerja --</option>
              {INSTANSI_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="kpu-form-label">Jabatan *</label>
            <select
              name="jabatan" value={form.jabatan} onChange={handleChange}
              className={kelasSelect} required
            >
              <option value="">-- Pilih Jabatan --</option>
              {JABATAN_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="kpu-form-label">Email *</label>
            <input
              type="email" name="email" value={form.email} onChange={handleChange}
              className={kelasInput}
              placeholder="nama@domain.com"
            />
          </div>
          <div>
            <label className="kpu-form-label">No. HP *</label>
            <input
              type="text" name="no_hp" value={form.no_hp} onChange={handleChange}
              className={kelasInput}
              placeholder="Minimal 10 digit angka"
            />
          </div>
        </div>

        <div>
          <label className="kpu-form-label">Catatan (Opsional)</label>
          <textarea
            name="catatan" value={form.catatan} onChange={handleChange} rows="2"
            className={kelasInput}
            placeholder="Catatan medis/diet/keterangan..."
          />
        </div>

        <KameraCapture
          label="Upload Foto Wajah"
          required={true}
          error={localError}
          onChange={(base64) => {
            setFotoBase64(base64);
            if (onFotoChange) onFotoChange(base64);
          }}
        />

        <div className="bg-[#FFF5F5] border border-[#6B0F1A] rounded-lg p-4 flex items-start mt-2">
          <input
            id="pdp" type="checkbox" checked={pdpChecked}
            onChange={(e) => setPdpChecked(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-[#6B0F1A] focus:ring-[#6B0F1A]"
          />
          <label htmlFor="pdp" className="ml-3 text-sm font-body text-[#3A0708] leading-relaxed cursor-pointer">
            Saya menyetujui penggunaan data pribadi oleh KPU Provinsi Sumatera Selatan untuk 
            keperluan administrasi acara ini sesuai UU PDP No. 27 Tahun 2022.
          </label>
        </div>

        <div className="pt-2">
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
