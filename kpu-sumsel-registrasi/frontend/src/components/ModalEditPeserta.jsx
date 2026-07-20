import { useState } from 'react';
import TombolPrimer from './TombolPrimer';
import { INSTANSI_OPTIONS, JABATAN_OPTIONS } from '../constants/masterData';

const FIELD_LABEL = {
  nama_lengkap: 'Nama Lengkap',
  instansi: 'Instansi',
  jabatan: 'Jabatan',
  no_hp: 'No. HP',
  catatan: 'Catatan',
};

export default function ModalEditPeserta({ terbuka, peserta, onSimpan, onBatal, simpanLoading }) {
  const [form, setForm] = useState(null);

  if (!terbuka || !peserta) return null;

  const data = form || peserta;
  const fields = ['nama_lengkap', 'instansi', 'jabatan', 'no_hp', 'catatan'];

  const adaPerubahan = fields.some((f) => (form?.[f] ?? peserta[f]) !== peserta[f]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...(prev || peserta), [field]: value }));
  };

  const handleSubmit = () => {
    if (!adaPerubahan) {
      onBatal();
      return;
    }
    const perubahan = {};
    for (const f of fields) {
      const valBaru = form?.[f] ?? peserta[f];
      if (valBaru !== peserta[f]) perubahan[f] = valBaru;
    }
    onSimpan(perubahan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onBatal}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8 animate-[slideUp_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#EEF2F7] flex items-center justify-center text-lg">⚙</div>
          <h3 className="font-display font-bold text-xl text-[#3A0708]">Edit Data Peserta</h3>
        </div>

        <p className="font-mono text-xs text-[#6B0F1A] mb-6 bg-[rgba(107,15,26,0.05)] px-3 py-2 rounded-lg">{peserta.id}</p>

        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f}>
              <label className="block text-xs font-semibold text-[#3A0708] mb-1">{FIELD_LABEL[f]}</label>
              {f === 'catatan' ? (
                <textarea
                  value={form?.[f] ?? peserta[f] ?? ''}
                  onChange={(e) => handleChange(f, e.target.value)}
                  rows={3}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#6B0F1A]"
                />
              ) : f === 'instansi' ? (
                <select
                  value={form?.[f] ?? peserta[f] ?? ''}
                  onChange={(e) => handleChange(f, e.target.value)}
                  className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#6B0F1A]"
                >
                  <option value="">-- Pilih Instansi/Unit Kerja --</option>
                  {INSTANSI_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              ) : f === 'jabatan' ? (
                <select
                  value={form?.[f] ?? peserta[f] ?? ''}
                  onChange={(e) => handleChange(f, e.target.value)}
                  className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#6B0F1A]"
                >
                  <option value="">-- Pilih Jabatan --</option>
                  {JABATAN_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f === 'no_hp' ? 'tel' : 'text'}
                  value={form?.[f] ?? peserta[f] ?? ''}
                  onChange={(e) => handleChange(f, e.target.value)}
                  className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#6B0F1A]"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-[#E2E8F0]">
          <button
            onClick={onBatal}
            className="h-11 px-6 rounded-xl border border-[#E2E8F0] text-[#3A0708] font-semibold text-sm hover:bg-[#EEF2F7] transition"
          >
            Batal
          </button>
          <TombolPrimer
            onClick={handleSubmit}
            disabled={!adaPerubahan || simpanLoading}
            varian="primer"
          >
            {simpanLoading ? 'MENYIMPAN...' : 'SIMPAN'}
          </TombolPrimer>
        </div>
      </div>
    </div>
  );
}
