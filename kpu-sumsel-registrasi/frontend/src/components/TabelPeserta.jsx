import { useRef, useState } from 'react';
import StatusBadge from './StatusBadge';
import TombolPrimer from './TombolPrimer';

export default function TabelPeserta({
  peserta = [],
  loading = false,
  page = 1,
  total = 0,
  perHalaman = 20,
  onPageChange,
  passwordAdmin,
  onRefresh,
}) {
  const totalHalaman = Math.ceil(total / perHalaman) || 1;
  const [aksiLoading, setAksiLoading] = useState(null);
  const [hapusKonfirm, setHapusKonfirm] = useState(null);

  const handleAksi = async (id, jenisAksi) => {
    if (jenisAksi === 'hapus') {
      if (hapusKonfirm !== id) {
        setHapusKonfirm(id);
        setTimeout(() => setHapusKonfirm(null), 4000);
        return;
      }
      setHapusKonfirm(null);
      if (!confirm('⚠️ PERINGATAN: Data akan dihapus PERMANEN!\\n\\nSemua data peserta termasuk audit log akan hilang.\\n\\nLanjutkan?')) return;
    } else {
      if (!confirm(`Yakin ingin ${jenisAksi === 'batalkan' ? 'membatalkan' : 'menandai hadir'} peserta ini?`)) return;
    }
    
    setAksiLoading(id);
    try {
      let url = '';
      let method = 'POST';
      let body = null;

      if (jenisAksi === 'batalkan') {
        url = `/api/admin/batalkan/${id}`;
        body = JSON.stringify({ alasan: 'Dibatalkan oleh admin' });
      } else if (jenisAksi === 'hadirkan') {
        url = `/api/checkin/tandai-hadir`;
        body = JSON.stringify({ identifier: id });
      } else if (jenisAksi === 'hapus') {
        url = `/api/admin/peserta/${id}/hapus`;
        method = 'DELETE';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-password': passwordAdmin
        },
        body
      });

      if (res.ok) {
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.pesan || 'Gagal melakukan aksi.');
      }
    } catch (e) {
      alert('Terjadi kesalahan jaringan.');
    }
    setAksiLoading(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-[#E2E8F0] overflow-hidden flex flex-col">
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center">
          <div className="h-10 w-10 border-4 border-[#EEF2F7] border-t-[#003580] rounded-full animate-spin mb-4"></div>
          <p className="text-[#5A6A8A] font-medium font-body">Memuat data peserta...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#003580] text-white font-display border-b border-[#001f5b]">
                  <th className="px-6 py-4 font-semibold text-sm w-16 text-center">No</th>
                  <th className="px-6 py-4 font-semibold text-sm">Peserta</th>
                  <th className="px-6 py-4 font-semibold text-sm hidden md:table-cell">Kontak</th>
                  <th className="px-6 py-4 font-semibold text-sm">Status</th>
                  <th className="px-6 py-4 font-semibold text-sm text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="font-body text-sm divide-y divide-[#E2E8F0]">
                {peserta.map((p, i) => (
                  <tr key={p.id} className="hover:bg-[#EEF2F7]/60 transition-colors group">
                    <td className="px-6 py-4 text-center text-[#5A6A8A]">
                      {(page - 1) * perHalaman + i + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#0D1B3E] uppercase text-base">{p.nama_lengkap}</span>
                        <span className="font-mono text-xs text-[#003580] mt-1">{p.id}</span>
                        <span className="text-[#5A6A8A] text-xs mt-1">{p.instansi} • {p.jabatan}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <a href={`mailto:${p.email}`} className="text-[#003580] hover:underline text-xs flex items-center gap-1">
                          ✉ {p.email}
                        </a>
                        <a href={`https://wa.me/${p.no_hp.replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="text-green-600 hover:underline text-xs flex items-center gap-1">
                          ✆ {p.no_hp}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(p.status === 'terdaftar' || p.status === 'hadir') && (
                          <button 
                            onClick={() => handleAksi(p.id, 'batalkan')}
                            disabled={aksiLoading === p.id}
                            className="bg-[#FEE2E2] text-[#B91C1C] hover:bg-[#DC2626] hover:text-white px-3 py-1.5 rounded text-xs font-bold transition disabled:opacity-50"
                            title="Batalkan Peserta"
                          >
                            ✕ Batal
                          </button>
                        )}
                        {p.status === 'terdaftar' && (
                          <button 
                            onClick={() => handleAksi(p.id, 'hadirkan')}
                            disabled={aksiLoading === p.id}
                            className="bg-[#DCFCE7] text-[#15803D] hover:bg-[#16A34A] hover:text-white px-3 py-1.5 rounded text-xs font-bold transition disabled:opacity-50"
                            title="Tandai Hadir"
                          >
                            ✓ Hadir
                          </button>
                        )}
                        <button 
                          onClick={() => handleAksi(p.id, 'hapus')}
                          disabled={aksiLoading === p.id}
                          className={`px-3 py-1.5 rounded text-xs font-bold transition disabled:opacity-50 ${
                            hapusKonfirm === p.id
                              ? 'bg-[#DC2626] text-white animate-pulse'
                              : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600'
                          }`}
                          title="Hapus permanen"
                        >
                          {hapusKonfirm === p.id ? 'Klik lagi untuk konfirmasi' : '🗑 Hapus'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {peserta.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-[#5A6A8A]">
                      <div className="text-4xl mb-3 opacity-50">📂</div>
                      <p className="font-medium text-[#0D1B3E] text-lg">Tidak ada data peserta ditemukan.</p>
                      <p className="text-sm mt-1">Coba gunakan kata kunci pencarian yang berbeda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="bg-white border-t border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
              <span className="text-sm text-[#5A6A8A] font-body">
                Menampilkan <span className="font-bold text-[#0D1B3E]">{(page - 1) * perHalaman + 1}</span> - <span className="font-bold text-[#0D1B3E]">{Math.min(page * perHalaman, total)}</span> dari <span className="font-bold text-[#0D1B3E]">{total}</span> peserta
              </span>
              
              {total > perHalaman && (
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="h-9 px-4 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#0D1B3E] font-medium text-sm hover:bg-[#EEF2F7] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    ← Prev
                  </button>
                  <div className="h-9 px-4 flex items-center justify-center rounded-lg bg-[#EEF2F7] text-[#003580] font-bold text-sm">
                    {page} / {totalHalaman}
                  </div>
                  <button
                    disabled={page >= totalHalaman}
                    onClick={() => onPageChange(page + 1)}
                    className="h-9 px-4 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#0D1B3E] font-medium text-sm hover:bg-[#EEF2F7] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
