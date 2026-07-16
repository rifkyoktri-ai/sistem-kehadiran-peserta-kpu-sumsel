import { useState, useRef } from 'react';

export default function FotoUpload({ onChange, required = false, label = 'Upload Foto' }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    setError('');
    if (!file) { onChange(null); return; }

    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran foto maksimal 2MB');
      onChange(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    onChange(file);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <label className="block font-display font-semibold text-sm text-[#0D1B3E] mb-1 self-start">{label}</label>
      <div
        onClick={() => inputRef.current.click()}
        className={`w-full max-w-[180px] h-48 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:border-[#003580] overflow-hidden bg-[#EEF2F7] transition-all ${preview ? 'border-[#16A34A]' : 'border-[#E2E8F0]'}`}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-[#5A6A8A] p-4">
            <div className="text-4xl mb-2">📷</div>
            <div className="text-sm font-medium">Klik untuk upload</div>
            <div className="text-xs mt-1">JPG/PNG, maks 2MB</div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
        required={required}
      />

      {error && <p className="text-xs text-[#DC2626] font-medium">{error}</p>}

      {preview && (
        <button
          type="button"
          onClick={() => { setPreview(null); onChange(null); inputRef.current.value = ''; }}
          className="text-xs text-[#B91C1C] hover:underline font-medium"
        >
          Hapus foto
        </button>
      )}
    </div>
  );
}
