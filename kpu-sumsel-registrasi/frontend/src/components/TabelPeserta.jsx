import { useState, useRef } from 'react';
import StatusBadge from './StatusBadge';
import ModalKonfirmasi from './ModalKonfirmasi';
import ModalEditPeserta from './ModalEditPeserta';
import ModalIDCard from './ModalIDCard';

function authHeader(password, acaraId) {
  const headers = { 'Content-Type': 'application/json' };
  if (password && password.startsWith('eyJ')) {
    headers['Authorization'] = 'Bearer ' + password;
  } else {
    headers['x-password'] = password;
  }
  if (acaraId) {
    headers['x-acara-id'] = acaraId;
  }
  return headers;
}

export default function TabelPeserta({
  peserta = [],
  loading = false,
  page = 1,
  total = 0,
  perHalaman = 20,
  onPageChange,
  passwordAdmin,
  onRefresh,
  acaraId,
}) {
  const totalHalaman = Math.ceil(total / perHalaman) || 1;
  const [aksiLoading, setAksiLoading] = useState(null);

  // Modal state
  const [hapusTarget, setHapusTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [idCardTarget, setIdCardTarget] = useState(null);
  const fotoInputRef = useRef(null);
  const [fotoUploadingId, setFotoUploadingId] = useState(null);

  const handleAksi = async (id, jenisAksi) => {
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
        headers: authHeader(passwordAdmin, acaraId),
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

  const handleEditSimpan = async (perubahan) => {
    if (!editTarget) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/peserta/${editTarget.id}`, {
        method: 'PUT',
        headers: authHeader(passwordAdmin),
        body: JSON.stringify(perubahan),
      });
      const data = await res.json();
      if (res.ok) {
        setEditTarget(null);
        if (onRefresh) onRefresh();
      } else {
        alert(data.pesan || 'Gagal mengedit data.');
      }
    } catch {
      alert('Gagal terhubung ke server.');
    }
    setEditLoading(false);
  };

  const handleFotoUpload = async (id, file) => {
    if (!file) return;
    setFotoUploadingId(id);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const foto_base64 = e.target.result;
        const auth = passwordAdmin?.startsWith('eyJ')
          ? { 'Authorization': 'Bearer ' + passwordAdmin }
          : { 'x-password': passwordAdmin };
        const res = await fetch(`/api/peserta/${id}/foto`, {
          method: 'POST',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto_base64 }),
        });
        const data = await res.json();
        if (res.ok && onRefresh) onRefresh();
        else alert(data.pesan || 'Gagal upload foto.');
      };
      reader.readAsDataURL(file);
    } catch {
      alert('Gagal terhubung ke server.');
    }
    setFotoUploadingId(null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-[#E2E8F0] overflow-hidden flex flex-col">
      <ModalKonfirmasi
        terbuka={hapusTarget !== null}
        judul="Hapus Permanen?"
        pesan={`Data peserta "${hapusTarget?.nama_lengkap}" (${hapusTarget?.id}) akan dihapus permanen termasuk audit log. Tindakan ini tidak bisa dibatalkan.`}
        tombolKonfirmasi="Ya, Hapus"
        varian="merah"
        onKonfirmasi={() => {
          const target = hapusTarget;
          setHapusTarget(null);
          handleAksi(target.id, 'hapus');
        }}
        onBatal={() => setHapusTarget(null)}
      />

      <ModalEditPeserta
        terbuka={editTarget !== null}
        peserta={editTarget}
        onSimpan={handleEditSimpan}
        onBatal={() => setEditTarget(null)}
        simpanLoading={editLoading}
      />

      <ModalIDCard
        terbuka={idCardTarget !== null}
        peserta={idCardTarget}
        onTutup={() => setIdCardTarget(null)}
      />

      {/* Hidden file input untuk upload foto */}
      <input
        ref={fotoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const id = fotoInputRef.current?.dataset?.pesertaId;
          const file = e.target.files?.[0];
          if (id && file) handleFotoUpload(id, file);
          e.target.value = '';
        }}
      />

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center">
          <div className="h-10 w-10 border-4 border-[#EEF2F7] border-t-[#6B0F1A] rounded-full animate-spin mb-4"></div>
          <p className="text-[#5A6A8A] font-medium font-body">Memuat data peserta...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="font-display border-b" style={{ background: '#faf5f5', color: 'var(--kpu-maroon)' }}>
                  <th className="px-6 py-4 font-semibold text-sm w-16 text-center">No</th>
                  <th className="px-6 py-4 font-semibold text-sm">Peserta</th>
                  <th className="px-6 py-4 font-semibold text-sm hidden md:table-cell">Kontak</th>
                  <th className="px-6 py-4 font-semibold text-sm">Status</th>
                  <th className="px-6 py-4 font-semibold text-sm text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="font-body text-sm divide-y divide-[#E2E8F0]">
                {peserta.map((p, i) => (
                  <tr key={p.id} className="transition-colors group border-b" style={{ backgroundColor: '#fff' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fdf9f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}>
                    <td className="px-6 py-4 text-center text-[#5A6A8A]">
                      {(page - 1) * perHalaman + i + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#3A0708] uppercase text-base">{p.nama_lengkap}</span>
                        <span className="font-mono text-xs text-[#6B0F1A] mt-1">{p.id}</span>
                        <span className="text-[#5A6A8A] text-xs mt-1">{p.instansi} • {p.jabatan}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <a href={`mailto:${p.email}`} className="text-[#6B0F1A] hover:underline text-xs flex items-center gap-1">
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
                          <button
                            onClick={() => setEditTarget(p)}
                            disabled={aksiLoading === p.id}
                            className="bg-[rgba(107,15,26,0.07)] text-[#6B0F1A] hover:bg-[#6B0F1A] hover:text-white px-3 py-1.5 rounded text-xs font-bold transition disabled:opacity-50"
                            title="Edit Data Peserta"
                          >
                            ⚙ Edit
                          </button>
                          <button
                            onClick={() => {
                              fotoInputRef.current.dataset.pesertaId = p.id;
                              fotoInputRef.current.click();
                            }}
                            disabled={fotoUploadingId === p.id}
                            className="bg-[#FFF7ED] text-[#C2410C] hover:bg-[#C2410C] hover:text-white px-3 py-1.5 rounded text-xs font-bold transition disabled:opacity-50"
                            title="Upload Foto"
                          >
                            {fotoUploadingId === p.id ? '⏳' : '📷'} Foto
                          </button>
                          <button
                            onClick={() => setIdCardTarget(p)}
                            className="bg-[#FEF9C3] text-[#A16207] hover:bg-[#A16207] hover:text-white px-3 py-1.5 rounded text-xs font-bold transition"
                            title="Lihat & Cetak ID Card"
                          >
                            🪪 ID
                          </button>
                          {(p.status === 'terdaftar' || p.status === 'hadir') && (
                          <button
                            onClick={() => handleAksi(p.id, 'batalkan')}
                            disabled={aksiLoading === p.id}
                            className="btn-kpu-danger"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            title="Batalkan Peserta"
                          >
                            ✕ Batal
                          </button>
                        )}
                        {p.status === 'terdaftar' && (
                          <button
                            onClick={() => handleAksi(p.id, 'hadirkan')}
                            disabled={aksiLoading === p.id}
                            className="btn-kpu"
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                            title="Tandai Hadir"
                          >
                            ✓ Hadir
                          </button>
                        )}
                        <button
                          onClick={() => setHapusTarget(p)}
                          disabled={aksiLoading === p.id}
                          className="btn-kpu-danger"
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          title="Hapus permanen"
                        >
                          🗑 Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {peserta.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-[#5A6A8A]">
                      <div className="text-4xl mb-3 opacity-50">📂</div>
                      <p className="font-medium text-[#3A0708] text-lg">Tidak ada data peserta ditemukan.</p>
                      <p className="text-sm mt-1">Coba gunakan kata kunci pencarian yang berbeda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="bg-white border-t border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
              <span className="text-sm text-[#5A6A8A] font-body">
                Menampilkan <span className="font-bold text-[#3A0708]">{(page - 1) * perHalaman + 1}</span> - <span className="font-bold text-[#3A0708]">{Math.min(page * perHalaman, total)}</span> dari <span className="font-bold text-[#3A0708]">{total}</span> peserta
              </span>
              
              {total > perHalaman && (
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="h-9 px-4 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#3A0708] font-medium text-sm hover:bg-[#EEF2F7] disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    ← Prev
                  </button>
                  <div className="h-9 px-4 flex items-center justify-center rounded-lg bg-[rgba(107,15,26,0.07)] text-[#6B0F1A] font-bold text-sm">
                    {page} / {totalHalaman}
                  </div>
                  <button
                    disabled={page >= totalHalaman}
                    onClick={() => onPageChange(page + 1)}
                    className="h-9 px-4 flex items-center justify-center rounded-lg border border-[#E2E8F0] text-[#3A0708] font-medium text-sm hover:bg-[#EEF2F7] disabled:opacity-30 disabled:cursor-not-allowed transition"
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
