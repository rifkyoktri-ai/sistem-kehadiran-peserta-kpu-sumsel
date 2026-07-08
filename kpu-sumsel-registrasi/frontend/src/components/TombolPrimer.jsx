import React from 'react';

/**
 * TombolPrimer - Tombol standar institusional
 * 
 * @param {string} varian - 'primer' (biru), 'sukses' (hijau), 'bahaya' (merah), 'emas' (emas), 'outline', 'outline-hijau', 'outline-emas'
 * @param {string} ukuran - 'sm', 'md', 'lg'
 * @param {boolean} fullWidth - Jika true, tombol akan mengambil lebar penuh (w-full)
 * @param {boolean} disabled - Jika true, tombol tidak bisa diklik
 * @param {React.ReactNode} children - Isi tombol
 * @param {function} onClick - Event handler klik
 * @param {string} className - Kelas CSS tambahan
 * @param {string} type - 'button', 'submit', 'reset'
 */
export default function TombolPrimer({
  varian = 'primer',
  ukuran = 'md',
  fullWidth = false,
  disabled = false,
  children,
  onClick,
  className = '',
  type = 'button',
  ...props
}) {
  let kelasDasar = 'inline-flex justify-center items-center font-display rounded-lg transition-all duration-200 ';
  
  if (fullWidth) kelasDasar += 'w-full ';
  if (disabled) kelasDasar += 'opacity-50 cursor-not-allowed ';
  else kelasDasar += 'hover:-translate-y-0.5 '; // Efek angkat sedikit (hover: transform translateY(-2px))

  // Ukuran
  switch (ukuran) {
    case 'sm':
      kelasDasar += 'px-4 py-2 text-sm font-semibold ';
      break;
    case 'lg':
      kelasDasar += 'px-8 py-4 text-base font-bold min-w-[200px] ';
      break;
    case 'md':
    default:
      kelasDasar += 'px-6 py-3 text-sm font-bold ';
      break;
  }

  // Varian (Warna & Shadow)
  let gayaKhusus = {};
  switch (varian) {
    case 'sukses':
      kelasDasar += 'text-white ';
      gayaKhusus = {
        background: disabled ? '#16A34A' : '#16A34A',
        boxShadow: disabled ? 'none' : '0 4px 12px rgba(22, 163, 74, 0.30)',
      };
      if (!disabled) kelasDasar += 'hover:bg-green-700 '; // #15803D (hover green)
      break;
    case 'bahaya':
      kelasDasar += 'text-white ';
      gayaKhusus = {
        background: disabled ? '#DC2626' : '#DC2626',
        boxShadow: disabled ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.30)',
      };
      if (!disabled) kelasDasar += 'hover:bg-red-700 '; // #B91C1C
      break;
    case 'emas':
      kelasDasar += 'text-white ';
      gayaKhusus = {
        background: disabled ? '#C8972A' : '#C8972A',
        boxShadow: disabled ? 'none' : '0 4px 12px rgba(200, 151, 42, 0.30)',
      };
      if (!disabled) kelasDasar += 'hover:bg-yellow-600 '; // #B45309 (approximate darker gold)
      break;
    case 'outline':
      kelasDasar += 'bg-white border-2 border-[#003580] text-[#003580] ';
      if (!disabled) {
        kelasDasar += 'hover:bg-[#003580] hover:text-white ';
        gayaKhusus = { boxShadow: '0 4px 12px rgba(0, 53, 128, 0.15)' };
      }
      break;
    case 'outline-hijau':
      kelasDasar += 'bg-white border-2 border-[#16A34A] text-[#16A34A] ';
      if (!disabled) {
        kelasDasar += 'hover:bg-[#16A34A] hover:text-white ';
        gayaKhusus = { boxShadow: '0 4px 12px rgba(22, 163, 74, 0.15)' };
      }
      break;
    case 'outline-emas':
      kelasDasar += 'bg-white border-2 border-[#C8972A] text-[#C8972A] ';
      if (!disabled) {
        kelasDasar += 'hover:bg-[#C8972A] hover:text-white ';
        gayaKhusus = { boxShadow: '0 4px 12px rgba(200, 151, 42, 0.15)' };
      }
      break;
    case 'outline-abu':
      kelasDasar += 'bg-white border border-gray-300 text-gray-700 ';
      if (!disabled) {
        kelasDasar += 'hover:bg-gray-50 ';
      }
      break;
    case 'primer':
    default:
      kelasDasar += 'text-white ';
      gayaKhusus = {
        background: disabled ? '#003580' : '#003580', // Biru KPU
        boxShadow: disabled ? 'none' : '0 4px 12px rgba(0, 53, 128, 0.30)',
      };
      // hover manual lewat className (karena style inline hover sulit di React tanpa pustaka external, 
      // jadi kita gunakan kombinasi tailwind utility untuk hover jika memungkinkan, atau hanya biarkan box-shadow yang mengangkat)
      // Kita tambahkan Tailwind color class untuk fallback hover
      if (!disabled) kelasDasar += 'hover:bg-[#001f5b] '; // hover ke biru gelap
      break;
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${kelasDasar} ${className}`}
      style={gayaKhusus}
      {...props}
    >
      {children}
    </button>
  );
}
