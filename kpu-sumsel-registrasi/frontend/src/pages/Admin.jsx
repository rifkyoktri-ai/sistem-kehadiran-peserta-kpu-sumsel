import { useState, useEffect } from 'react';
import { LOGOKPU_URL } from '../constants/logo';
import TabelPeserta from '../components/TabelPeserta';
import HeaderUtama from '../components/HeaderUtama';
import TombolPrimer from '../components/TombolPrimer';
import StatusBadge from '../components/StatusBadge';
import ModalKonfirmasi from '../components/ModalKonfirmasi';
import { useAuth } from '../context/AuthContext';
import { getAuthHeader } from '../utils/api';

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.pesan || 'Login gagal.');
        return;
      }
      if (data.data && data.data.token) {
        onLogin(data.data.token, data.data.level);
      } else {
        onLogin(password);
      }
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #2A0508 0%, #4A0A10 50%, #3A0708 100%)' }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-card p-8 md:p-10 relative overflow-hidden">
        {/* Garis emas atas */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #C8972A 0%, #E8B84B 50%, #C8972A 100%)' }}></div>
        
        <div className="text-center mb-8">
          <img src={LOGOKPU_URL} alt="KPU Sumsel" className="h-16 mx-auto mb-4" />
          <h1 className="text-xl font-bold font-display text-[#6B0F1A] uppercase tracking-wide">KPU Provinsi Sumatera Selatan</h1>
          
          <div className="flex items-center justify-center my-4">
            <div className="h-px w-12 bg-[#E2E8F0]"></div>
            <span className="px-3 text-[#C8972A] text-xs">◆</span>
            <div className="h-px w-12 bg-[#E2E8F0]"></div>
          </div>

          <h2 className="text-xl font-bold font-display text-[#6B0F1A]">Dashboard Administrator</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="kpu-form-label">Username</label>
            <input
              type="text" value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-kpu"
              placeholder="Masukkan username" required
            />
          </div>
          <div>
            <label className="kpu-form-label">Password</label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-kpu font-mono tracking-widest"
              placeholder="••••••••" required
            />
          </div>
          {error && <p className="text-sm text-[#B91C1C] text-center font-medium bg-[#FEE2E2] p-2 rounded-lg">{error}</p>}
          
          <div className="pt-2">
            <button type="submit" className="btn-kpu w-full" disabled={loading}>
              {loading ? 'MEMPROSES...' : 'MASUK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ password, onLogout }) {
  const [rekap, setRekap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('rekap');
  const [peserta, setPeserta] = useState([]);
  const [pesertaPage, setPesertaPage] = useState(1);
  const [pesertaTotal, setPesertaTotal] = useState(0);
  const [pesertaSearch, setPesertaSearch] = useState('');
  const [loadingPeserta, setLoadingPeserta] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', pesan: '' }
  const [feedbackProgress, setFeedbackProgress] = useState(100);
  const [tanggalHariIni, setTanggalHariIni] = useState('');
  const [resetConfirm, setResetConfirm] = useState(false);

  // State fitur PDF Laporan Kehadiran
  const [modalPDF, setModalPDF] = useState(false);
  const [jenisPDF, setJenisPDF] = useState('daftar-hadir');
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [daftarInstansi, setDaftarInstansi] = useState({ internal: [], eksternal: [], lainnya: [] });
  const [formPDF, setFormPDF] = useState({
    filter_instansi: '',
    filter_tipe: '',
    pola_ttd: '1',
    ttd: [{ label: 'Ketua Panitia', jabatan: '', nama: '' }]
  });

  // Sesi Multi-Acara
  const [daftarAcara, setDaftarAcara] = useState([]);
  const [idAcaraSelected, setIdAcaraSelected] = useState('');

  const ubahHeader = (h) => {
    if (password.startsWith('eyJ')) {
      return { ...h, 'Authorization': 'Bearer ' + password, 'Content-Type': 'application/json' };
    }
    return { ...h, 'x-password': password, 'Content-Type': 'application/json' };
  };

  const apiFetch = async (url, options = {}) => {
    const resp = await fetch(url, {
      ...options,
      headers: ubahHeader(options.headers || {}),
    });
    if (!resp.ok) {
      let msg = 'Gagal';
      try { msg = (await resp.json()).pesan || msg; } catch { msg = resp.statusText || msg; }
      throw new Error(msg);
    }
    return resp.json();
  };

  const muatDaftarAcara = async () => {
    try {
      const data = await apiFetch('/api/admin/acara');
      const list = data.data || [];
      setDaftarAcara(list);
      
      // Jika belum ada yang dipilih, pilih yang aktif
      const activeAcara = list.find(ac => ac.adalah_aktif);
      if (activeAcara) {
        setIdAcaraSelected(activeAcara.id);
      } else if (list.length > 0) {
        setIdAcaraSelected(list[0].id);
      }
    } catch {
      setFeedback('❌ Gagal memuat daftar acara.');
    }
  };

  const muatRekap = () => {
    if (!idAcaraSelected) return;
    fetch(`/api/admin/rekap?id_acara=${idAcaraSelected}`, { headers: getAuthHeader(password) })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setRekap(d.data || d))
      .catch(() => setError('Gagal memuat rekap'))
      .finally(() => setLoading(false));
  };

  // Load daftar acara pertama kali
  useEffect(() => {
    setTanggalHariIni(new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    muatDaftarAcara();
  }, [password]);

  // Refetch rekap saat acara yang dipilih berubah atau interval 30s berjalan
  useEffect(() => {
    if (idAcaraSelected) {
      setLoading(true);
      muatRekap();
      const interval = setInterval(() => {
        muatRekap();
      }, 30000); // 30 detik
      return () => clearInterval(interval);
    }
  }, [password, idAcaraSelected]);

  const handleExportCSV = async () => {
    if (!idAcaraSelected) return;
    try {
      const resp = await fetch(`/api/admin/export-csv?id_acara=${idAcaraSelected}`, { headers: getAuthHeader(password) });
      if (!resp.ok) throw new Error('Gagal export');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const targetAcara = daftarAcara.find(ac => ac.id === idAcaraSelected);
      const filename = targetAcara ? `peserta_${targetAcara.nama_acara.replace(/[^a-zA-Z0-9]/g, '_')}.csv` : 'peserta.csv';
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      tampilFeedback('success', 'CSV berhasil di-download.');
    } catch {
      tampilFeedback('error', 'Gagal export CSV.');
    }
  };

  const handleBackup = async () => {
    try {
      const data = await apiFetch('/api/admin/backup');
      tampilFeedback('success', 'Backup berhasil: ' + data.data.file);
    } catch (err) {
      tampilFeedback('error', 'Gagal backup: ' + (err.message || ''));
    }
  };

  const tampilFeedback = (type, pesan) => {
    setFeedback({ type, pesan });
    setFeedbackProgress(100);
    let prog = 100;
    const interval = setInterval(() => {
      prog -= 2;
      setFeedbackProgress(prog);
      if (prog <= 0) {
        clearInterval(interval);
        setFeedback(null);
      }
    }, 80); // 80ms × 50 steps = ~4 detik
  };

  const muatPeserta = async (hal = 1, cari = '') => {
    if (!idAcaraSelected) return;
    setLoadingPeserta(true);
    try {
      const params = new URLSearchParams({ halaman: hal, per_halaman: 20, id_acara: idAcaraSelected });
      if (cari) params.set('search', cari);
      const data = await apiFetch('/api/admin/peserta?' + params.toString());
      setPeserta(data.data.peserta);
      setPesertaTotal(data.data.total);
      setPesertaPage(data.data.halaman);
    } catch {
      setFeedback('❌ Gagal memuat peserta.');
    }
    setLoadingPeserta(false);
  };

  const muatAuditLog = async () => {
    if (!idAcaraSelected) return;
    setLoadingAudit(true);
    try {
      const data = await apiFetch(`/api/admin/audit-log?id_acara=${idAcaraSelected}`);
      setAuditLog(data.data.logs || data.data || []);
    } catch {
      setFeedback('❌ Gagal memuat audit log.');
    }
    setLoadingAudit(false);
  };

  const handleResetAuditLog = async () => {
    try {
      const data = await apiFetch('/api/admin/audit-log', { method: 'DELETE' });
      tampilFeedback('success', data.pesan || 'Audit log berhasil direset.');
      muatAuditLog();
    } catch (err) {
      tampilFeedback('error', err.message || 'Gagal mereset audit log.');
    }
    setResetConfirm(false);
  };

  // ── Fungsi PDF Laporan Kehadiran ──────────────────────────────────────────

  const bukaModalPDF = async (jenis) => {
    setJenisPDF(jenis);
    setFormPDF({ filter_instansi: '', filter_tipe: '', pola_ttd: '1', ttd: [{ label: 'Ketua Panitia', jabatan: '', nama: '' }] });
    setModalPDF(true);
    const acaraAktif = daftarAcara.find(ac => ac.id === idAcaraSelected);
    if (!acaraAktif) return;
    try {
      const res = await fetch(
        `/api/admin/instansi-list?id_acara=${acaraAktif.id}`,
        { headers: getAuthHeader(password) }
      );
      const data = await res.json();
      if (data.sukses) setDaftarInstansi({ internal: [], eksternal: [], lainnya: [], ...data.data });
    } catch (err) {
      console.error('Gagal fetch instansi:', err);
    }
  };

  const handlePolaTTD = (pola) => {
    let ttdBaru = [];
    if (pola === '1') {
      ttdBaru = [{ label: 'Ketua Panitia', jabatan: '', nama: '' }];
    } else if (pola === '2') {
      ttdBaru = [
        { label: 'Mengetahui', jabatan: '', nama: '' },
        { label: 'Ketua Panitia', jabatan: '', nama: '' }
      ];
    }
    setFormPDF(prev => ({ ...prev, pola_ttd: pola, ttd: ttdBaru }));
  };

  const handleTTDChange = (index, field, value) => {
    setFormPDF(prev => {
      const ttdBaru = [...prev.ttd];
      ttdBaru[index] = { ...ttdBaru[index], [field]: value };
      return { ...prev, ttd: ttdBaru };
    });
  };

  const generatePDF = async () => {
    const acaraAktif = daftarAcara.find(ac => ac.id === idAcaraSelected);
    if (!acaraAktif) return;
    setLoadingPDF(true);
    try {
      const endpoint = jenisPDF === 'daftar-hadir'
        ? '/api/admin/pdf-daftar-hadir'
        : '/api/admin/pdf-rekap-kehadiran';

      const reqBody = jenisPDF === 'daftar-hadir'
          ? { id_acara: acaraAktif.id, filter_instansi: formPDF.filter_instansi, filter_tipe: formPDF.filter_tipe }
          : { id_acara: acaraAktif.id, ...formPDF };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { ...getAuthHeader(password), 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
      });

      if (!res.ok) {
        let errMsg = 'Gagal generate PDF';
        try { const errData = await res.json(); errMsg = errData.pesan || errMsg; } catch {}
        tampilFeedback('error', errMsg);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const namaFile = jenisPDF === 'daftar-hadir'
        ? `daftar-peserta-${acaraAktif.kode_acara}.pdf`
        : `rekap-kehadiran-${acaraAktif.kode_acara}.pdf`;
      a.href = url;
      a.download = namaFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setModalPDF(false);
      tampilFeedback('success', `PDF berhasil diunduh: ${namaFile}`);
    } catch (err) {
      tampilFeedback('error', 'Terjadi kesalahan: ' + err.message);
    } finally {
      setLoadingPDF(false);
    }
  };

  useEffect(() => {
    if (tab === 'peserta') muatPeserta(1, pesertaSearch);
    if (tab === 'audit') muatAuditLog();
  }, [tab, idAcaraSelected]);

  const tabs = [
    { key: 'rekap', label: '📊 Rekap', desc: 'Ringkasan data acara' },
    { key: 'peserta', label: '👥 Peserta', desc: 'Manajemen data peserta' },
    { key: 'kelola-acara', label: '📅 Kelola Acara', desc: 'Daftar & buat acara baru' },
    { key: 'pengaturan', label: '⚙ Pengaturan', desc: 'Konfigurasi acara KPU' },
    { key: 'audit', label: '📋 Audit Log', desc: 'Riwayat aktivitas sistem' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#EEF2F7]">
      <HeaderUtama judulPanel="Dashboard Admin" />

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        <aside 
          className="w-[260px] min-h-full flex flex-col shrink-0 overflow-y-auto"
          style={{ 
            background: 'linear-gradient(180deg, #2A0508 0%, #3A0708 100%)',
            borderRight: '1px solid rgba(200,147,10,0.2)' 
          }}
        >
          <div className="p-6 border-b border-white/10">
            <h2 className="font-display text-lg" style={{ color: '#FFD700', fontWeight: 700 }}>Menu Admin</h2>
            <p className="text-xs mt-1" style={{ color: 'rgba(200,147,10,0.6)' }}>Sistem Registrasi KPU</p>
          </div>

          {/* Pemilih Acara */}
          <div className="px-6 py-4 border-b border-white/10">
            <label className="block mb-2 uppercase" style={{ color: 'rgba(200,147,10,0.5)', fontSize: '11px', letterSpacing: '1.5px', fontWeight: 'bold' }}>Pilih Acara</label>
            <select 
              value={idAcaraSelected}
              onChange={(e) => setIdAcaraSelected(e.target.value)}
              className="w-full h-10 px-2 text-xs focus:outline-none"
              style={{
                background: 'rgba(200,147,10,0.08)',
                border: '1px solid rgba(200,147,10,0.3)',
                color: '#F5D060',
                borderRadius: '6px'
              }}
            >
              {daftarAcara.map(ac => (
                <option key={ac.id} value={ac.id} className="text-[#1F1A17]">
                  {ac.nama_acara} ({ac.kode_acara})
                </option>
              ))}
            </select>
          </div>
          
          <nav className="flex-1 py-4">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all group ${
                    active 
                    ? '' 
                    : 'hover:bg-[rgba(200,147,10,0.08)] hover:text-[#F5D060]'
                  }`}
                  style={active ? {
                    background: 'rgba(200,147,10,0.15)',
                    borderLeft: '3px solid #FFD700',
                    color: '#FFD700',
                    fontWeight: 600
                  } : {
                    borderLeft: '3px solid transparent',
                    color: 'rgba(255,255,255,0.55)'
                  }}
                >
                  <span className="text-lg transition-colors" style={active ? { color: '#FFD700' } : { color: 'rgba(255,255,255,0.4)' }} >
                    {t.label.split(' ')[0]}
                  </span>
                  <span className="font-display">{t.label.split(' ').slice(1).join(' ')}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-6" style={{ borderTop: '1px solid rgba(200,147,10,0.15)' }}>
            <p className="text-[10px] mb-4 font-bold" style={{ color: 'rgba(200,147,10,0.4)' }}>Sistem Versi 2.0</p>
            <button 
              onClick={onLogout} 
              className="w-full flex items-center gap-2 text-white/80 hover:text-[#FF6B6B] transition-colors font-semibold text-sm"
            >
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>🚪</span> Keluar Sistem
            </button>
          </div>
        </aside>

        {/* KONTEN UTAMA */}
        <main className="flex-1 overflow-y-auto">
          {feedback && (
            <div className="fixed top-6 right-6 z-50 min-w-[300px] max-w-sm shadow-2xl rounded-xl overflow-hidden" style={{ animation: 'slideInRight 0.3s ease-out' }}>
              <div className={`flex items-start gap-3 px-5 py-4 ${
                feedback.type === 'success'
                  ? 'bg-white border-l-4 border-[#16A34A]'
                  : 'bg-white border-l-4 border-[#DC2626]'
              }`}>
                <span className="text-xl mt-0.5">{feedback.type === 'success' ? '✅' : '❌'}</span>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${ feedback.type === 'success' ? 'text-[#16A34A]' : 'text-[#DC2626]' }`}>
                    {feedback.type === 'success' ? 'Berhasil' : 'Gagal'}
                  </p>
                  <p className="text-[#3A0708] text-sm mt-0.5">{feedback.pesan}</p>
                </div>
                <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
              </div>
              <div className="h-1 bg-gray-100">
                <div
                  className={`h-full transition-none ${ feedback.type === 'success' ? 'bg-[#16A34A]' : 'bg-[#DC2626]' }`}
                  style={{ width: feedbackProgress + '%', transition: 'width 0.08s linear' }}
                />
              </div>
            </div>
          )}

          <div className="p-8">
            {/* Tampilan Rekap */}
            {tab === 'rekap' && (
              <div className="animate-[slideUp_250ms_ease-out]">
                <div className="mb-8">
                  <h2 className="text-3xl font-display font-bold text-[#4A0A10]">Selamat datang, Admin</h2>
                  <p className="text-[#5A6A8A] mt-1 font-body">KPU Provinsi Sumatera Selatan · {tanggalHariIni}</p>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-2xl"></div>)}
                  </div>
                ) : rekap ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="kpu-stat-card" style={{ position: 'relative' }}>
                      <div className="kpu-glow"></div>
                      <i className="ti ti-users" style={{ fontSize: '28px', color: 'rgba(255,255,255,0.15)', position: 'absolute', bottom: '12px', right: '14px', zIndex: 10 }}></i>
                      <div className="kpu-stat-num">{rekap.total_terdaftar || 0}</div>
                      <div className="kpu-stat-label">Total Terdaftar</div>
                      <div className="w-full h-1 bg-white/20 mt-4 rounded-full overflow-hidden relative z-10">
                        <div className="h-full bg-white/40 w-1/2"></div>
                      </div>
                    </div>
                    
                    <div className="kpu-stat-card" style={{ position: 'relative' }}>
                      <div className="kpu-glow"></div>
                      <i className="ti ti-circle-check" style={{ fontSize: '28px', color: 'rgba(255,255,255,0.15)', position: 'absolute', bottom: '12px', right: '14px', zIndex: 10 }}></i>
                      <div className="kpu-stat-num">{rekap.total_hadir || 0}</div>
                      <div className="kpu-stat-label">Hadir (Check-in)</div>
                      <div className="w-full h-1 bg-white/20 mt-4 rounded-full overflow-hidden relative z-10">
                        <div className="h-full bg-white" style={{ width: `${rekap.total_aktif ? (rekap.total_hadir / rekap.total_aktif) * 100 : 0}%` }}></div>
                      </div>
                    </div>

                    <div className="kpu-stat-card" style={{ position: 'relative' }}>
                      <div className="kpu-glow"></div>
                      <i className="ti ti-circle-x" style={{ fontSize: '28px', color: 'rgba(255,255,255,0.15)', position: 'absolute', bottom: '12px', right: '14px', zIndex: 10 }}></i>
                      <div className="kpu-stat-num">{(rekap.total_membatalkan || 0) + (rekap.total_digantikan || 0)}</div>
                      <div className="kpu-stat-label">Dibatalkan / Diganti</div>
                    </div>

                    <div className="kpu-stat-card" style={{ position: 'relative' }}>
                      <div className="kpu-glow"></div>
                      <i className="ti ti-chart-bar" style={{ fontSize: '28px', color: 'rgba(255,255,255,0.15)', position: 'absolute', bottom: '12px', right: '14px', zIndex: 10 }}></i>
                      <div className="kpu-stat-num">
                        {rekap.total_aktif && rekap.total_aktif > 0 
                          ? Math.round((rekap.total_hadir / rekap.total_aktif) * 100) 
                          : 0}%
                      </div>
                      <div className="kpu-stat-label">Tingkat Kehadiran Aktif</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#DC2626]">Gagal memuat rekap data.</p>
                )}

                <div className="bg-white rounded-2xl shadow-card border border-[#E2E8F0] p-6">
                  <div className="flex items-center gap-3 mb-6 relative">
                    <div className="absolute left-[-24px] top-0 bottom-0 w-1 bg-[#C8972A]"></div>
                    <h3 className="font-display font-semibold text-xl text-[#3A0708]">Aksi Cepat</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <TombolPrimer onClick={handleExportCSV} varian="outline-emas" icon="📥">
                      Export CSV Peserta
                    </TombolPrimer>
                    <TombolPrimer onClick={handleBackup} varian="primer" icon="💾">
                      Backup Database
                    </TombolPrimer>

                    {/* Tombol PDF — dengan deskripsi perbedaan */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => bukaModalPDF('daftar-hadir')}
                        className="group flex flex-col items-start px-5 py-3 rounded-xl border-2 border-[#6B0F1A] text-[#6B0F1A] hover:bg-[#6B0F1A] hover:text-white transition-all"
                      >
                        <span className="text-sm font-bold flex items-center gap-2">📋 Daftar Peserta</span>
                        <span className="text-[10px] font-normal opacity-70 group-hover:opacity-90 mt-0.5">Koordinasi panitia · nama, instansi & No. HP</span>
                      </button>
                      <button
                        onClick={() => bukaModalPDF('rekap-kehadiran')}
                        className="group flex flex-col items-start px-5 py-3 rounded-xl border-2 border-[#1D4ED8] text-[#1D4ED8] hover:bg-[#1D4ED8] hover:text-white transition-all"
                      >
                        <span className="text-sm font-bold flex items-center gap-2">📊 Rekap Kehadiran</span>
                        <span className="text-[10px] font-normal opacity-70 group-hover:opacity-90 mt-0.5">Status real-time · statistik kehadiran</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Data Peserta */}
            {tab === 'peserta' && (
              <div className="animate-[slideUp_250ms_ease-out]">
                <div className="kpu-section-header mb-6" style={{ zIndex: 1 }}>
                  <div className="kpu-dots" />
                  <div className="kpu-line-gold" />
                  <h3 className="kpu-section-title">Data Peserta</h3>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                  <div className="flex-1 w-full flex gap-3">
                    <input 
                      type="text" 
                      placeholder="Cari nama, instansi, atau ID..." 
                      value={pesertaSearch}
                      onChange={(e) => setPesertaSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && muatPeserta(1, pesertaSearch)}
                      className="w-full md:max-w-md h-12 px-4 rounded-lg border-[1.5px] border-[#E2E8F0] focus:outline-none focus:border-[#6B0F1A] focus:ring-[3px] focus:ring-[#6B0F1A]/12"
                    />
                    <TombolPrimer onClick={() => muatPeserta(1, pesertaSearch)} varian="primer">
                      Cari
                    </TombolPrimer>
                  </div>
                  <div>
                    <TombolPrimer onClick={handleExportCSV} varian="outline-emas">
                      Export CSV
                    </TombolPrimer>
                  </div>
                </div>

                <TabelPeserta
                  peserta={peserta}
                  loading={loadingPeserta}
                  page={pesertaPage}
                  total={pesertaTotal}
                  onPageChange={(hal) => muatPeserta(hal, pesertaSearch)}
                  passwordAdmin={password} // Pass password for actions inside TabelPeserta if it edits data
                  onRefresh={() => { muatPeserta(pesertaPage, pesertaSearch); muatRekap(); }}
                  acaraId={idAcaraSelected} // Pass selected acara ID for hadir action
                />
              </div>
            )}

            {/* Tab Kelola Acara */}
            {tab === 'kelola-acara' && (
              <div className="animate-[slideUp_250ms_ease-out]">
                <div className="flex items-center gap-3 mb-6 relative">
                  <div className="absolute left-[-16px] top-0 bottom-0 w-1 bg-[#C8972A]"></div>
                  <h3 className="font-display font-bold text-2xl text-[#3A0708]">Manajemen Multi-Acara</h3>
                </div>
                <KelolaAcaraPanel 
                  password={password} 
                  apiFetch={apiFetch} 
                  onRefresh={muatDaftarAcara} 
                  currentActiveId={idAcaraSelected} 
                  setFeedback={(msg) => { const isErr = msg.startsWith('❌'); tampilFeedback(isErr ? 'error' : 'success', msg.replace(/^[✅❌]\s*/, '')); }} 
                />
              </div>
            )}

            {/* Tab Pengaturan Acara */}
            {tab === 'pengaturan' && (
              <div className="animate-[slideUp_250ms_ease-out]">
                <div className="flex items-center gap-3 mb-6 relative">
                  <div className="absolute left-[-16px] top-0 bottom-0 w-1 bg-[#C8972A]"></div>
                  <h3 className="font-display font-bold text-2xl text-[#3A0708]">Pengaturan Acara</h3>
                </div>
                <PengaturanForm 
                  password={password} 
                  idAcara={idAcaraSelected}
                  onSuccess={() => tampilFeedback('success', 'Pengaturan berhasil disimpan!')} 
                  onError={(pesan) => tampilFeedback('error', pesan || 'Gagal menyimpan pengaturan.')} 
                />
              </div>
            )}

            {/* Tab Audit Log */}
            {tab === 'audit' && (
              <div className="animate-[slideUp_250ms_ease-out]">
                <div className="flex items-center gap-3 mb-6 relative">
                  <div className="absolute left-[-16px] top-0 bottom-0 w-1 bg-[#C8972A]"></div>
                  <h3 className="font-display font-bold text-2xl text-[#3A0708]">Riwayat Aktivitas Sistem</h3>
                  <button
                    onClick={() => setResetConfirm(true)}
                    className="ml-auto h-9 px-4 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition flex items-center gap-1.5"
                  >
                    Reset Seluruh Log
                  </button>
                </div>

                <div className="bg-white rounded-2xl shadow-card border border-[#E2E8F0] overflow-hidden">
                  {loadingAudit ? (
                    <p className="text-center text-gray-500 py-10 animate-pulse">Memuat log...</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-white text-left font-display" style={{ background: 'linear-gradient(90deg, #2A0508, #4A0A10)' }}>
                            <th className="px-6 py-4 font-semibold whitespace-nowrap">Waktu</th>
                            <th className="px-6 py-4 font-semibold">Aktor</th>
                            <th className="px-6 py-4 font-semibold">Aksi</th>
                            <th className="px-6 py-4 font-semibold">ID Peserta</th>
                            <th className="px-6 py-4 font-semibold">Detail</th>
                          </tr>
                        </thead>
                        <tbody className="font-body">
                          {auditLog.length > 0 ? auditLog.map((log, idx) => {
                            let chipClass = "bg-gray-100 text-gray-700";
                            if (log.aksi === 'REGISTRASI' || log.aksi === 'WALKIN') chipClass = "bg-[rgba(200,147,10,0.15)] text-[#C8930A]";
                            if (log.aksi === 'CHECKIN') chipClass = "bg-green-100 text-green-700";
                            if (log.aksi === 'BATALKAN') chipClass = "bg-red-100 text-red-700";
                            if (log.aksi === 'EDIT_DATA') chipClass = "bg-yellow-100 text-yellow-700";
                            if (log.aksi === 'GANTI_PESERTA') chipClass = "bg-purple-100 text-purple-700";

                            return (
                              <tr key={log.id} className={`border-b border-[#E2E8F0] hover:bg-[#EEF2F7] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                <td className="px-6 py-3 whitespace-nowrap text-[#5A6A8A]">{log.waktu?.slice(0, 19).replace('T', ' ')}</td>
                                <td className="px-6 py-3 font-medium text-[#4A0A10]">{log.aktor}</td>
                                <td className="px-6 py-3">
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${chipClass}`}>
                                    {log.aksi}
                                  </span>
                                </td>
                                <td className="px-6 py-3 font-mono text-xs text-[#6B0F1A]">{log.id_peserta || '-'}</td>
                                <td className="px-6 py-3 text-[#5A6A8A] text-xs max-w-xs truncate" title={log.detail}>{log.detail}</td>
                              </tr>
                            );
                          }) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-16 text-center text-[#5A6A8A]">
                                <div className="text-4xl mb-3">📋</div>
                                <p className="font-medium text-[#3A0708] text-base">Belum ada riwayat aktivitas.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ModalKonfirmasi
              terbuka={resetConfirm}
              judul="Reset Seluruh Audit Log"
              pesan="Semua riwayat aktivitas sistem akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
              tombolKonfirmasi="Ya, Reset Semua"
              varian="merah"
              onKonfirmasi={handleResetAuditLog}
              onBatal={() => setResetConfirm(false)}
            />

            {/* ── MODAL PDF LAPORAN KEHADIRAN ─────────────────────────────── */}
            {modalPDF && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">

                  {/* Header Modal */}
                  <div className={`flex items-center justify-between p-5 border-b border-gray-200 ${
                    jenisPDF === 'daftar-hadir' ? 'bg-[#FFF5F5]' : 'bg-[#EFF6FF]'
                  }`}>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">
                        {jenisPDF === 'daftar-hadir' ? '📋 Daftar Peserta Terdaftar' : '📊 Rekap Kehadiran Peserta'}
                      </h3>
                      <p className="text-xs mt-1 text-gray-500">
                        {jenisPDF === 'daftar-hadir'
                          ? 'Dokumen koordinasi panitia — daftar peserta terdaftar beserta No. HP untuk komunikasi lapangan'
                          : 'Laporan kehadiran real-time dengan status, jam hadir & ringkasan statistik'}
                      </p>
                      {/* Badge perbedaan fitur */}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {jenisPDF === 'daftar-hadir' ? (
                          <>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">✓ No. Reg & No. HP</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">✓ Peserta Aktif Saja</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">✗ Tanpa Status Kehadiran</span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">✓ Status Real-time</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">✓ Jam Check-in</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">✓ Statistik Kehadiran</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setModalPDF(false)}
                      className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none ml-4 flex-shrink-0"
                    >✕</button>
                  </div>

                  <div className="p-5 space-y-5">

                    {/* BAGIAN 1: Filter Instansi */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Filter Instansi / Wilayah
                      </label>
                      <select
                        value={formPDF.filter_instansi}
                        onChange={(e) => setFormPDF(prev => ({ ...prev, filter_instansi: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]"
                      >
                        {/* Default: semua */}
                        <option value="">── Semua Instansi ──</option>

                        {/* Shortcut per kategori */}
                        {(daftarInstansi.internal?.length > 0 || 
                          daftarInstansi.eksternal?.length > 0 || 
                          daftarInstansi.lainnya?.length > 0) && (
                          <optgroup label="── Filter Per Kategori ──">
                            {daftarInstansi.internal?.length > 0 && (
                              <option value="__INTERNAL_SEMUA__">
                                🏛️ Semua Internal KPU ({daftarInstansi.internal.length} instansi)
                              </option>
                            )}
                            {daftarInstansi.eksternal?.length > 0 && (
                              <option value="__EKSTERNAL_SEMUA__">
                                🤝 Semua Eksternal Resmi ({daftarInstansi.eksternal.length} instansi)
                              </option>
                            )}
                            {daftarInstansi.lainnya?.length > 0 && (
                              <option value="__LAINNYA__">
                                📋 Semua Instansi Lainnya ({daftarInstansi.lainnya.length} instansi)
                              </option>
                            )}
                          </optgroup>
                        )}

                        {/* Instansi spesifik internal */}
                        {daftarInstansi.internal?.length > 0 && (
                          <optgroup label="── Internal KPU (Spesifik) ──">
                            {daftarInstansi.internal.map(inst => (
                              <option key={inst} value={inst}>{inst}</option>
                            ))}
                          </optgroup>
                        )}

                        {/* Instansi spesifik eksternal resmi */}
                        {daftarInstansi.eksternal?.length > 0 && (
                          <optgroup label="── Eksternal Resmi (Spesifik) ──">
                            {daftarInstansi.eksternal.map(inst => (
                              <option key={inst} value={inst}>{inst}</option>
                            ))}
                          </optgroup>
                        )}

                        {/* Instansi lainnya spesifik */}
                        {daftarInstansi.lainnya?.length > 0 && (
                          <optgroup label="── Instansi Lainnya (Spesifik) ──">
                            {daftarInstansi.lainnya.map(inst => (
                              <option key={inst} value={inst}>{inst}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Pilih kategori atau instansi spesifik</p>
                    </div>

                    {/* BAGIAN 2: Filter Tipe Peserta */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Filter Tipe Peserta
                      </label>
                      <select
                        value={formPDF.filter_tipe}
                        onChange={(e) => setFormPDF(prev => ({ ...prev, filter_tipe: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]"
                      >
                        <option value="">Semua Tipe</option>
                        <option value="internal">Internal KPU</option>
                        <option value="eksternal">Eksternal</option>
                      </select>
                    </div>

                    {/* DIVIDER */}
                    <hr className="border-gray-200" />

                    {/* BAGIAN 3: Pola Tanda Tangan — hanya untuk Rekap Kehadiran */}
                    {jenisPDF === 'rekap-kehadiran' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Pola Tanda Tangan
                      </label>
                      <div className="flex gap-3">
                        {[
                          { val: '0', label: 'Tanpa TTD' },
                          { val: '1', label: '1 Penanda Tangan' },
                          { val: '2', label: '2 Penanda Tangan' },
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => handlePolaTTD(opt.val)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                              formPDF.pola_ttd === opt.val
                                ? 'bg-[#6B0F1A] text-white border-[#6B0F1A]'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-[#6B0F1A]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    )}

                    {/* BAGIAN 4: Form Input TTD (hanya untuk Rekap Kehadiran) */}
                    {jenisPDF === 'rekap-kehadiran' && formPDF.pola_ttd !== '0' && formPDF.ttd.map((ttd, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                        <p className="text-sm font-semibold text-[#6B0F1A]">
                          {formPDF.pola_ttd === '2'
                            ? (idx === 0 ? '← Kiri (Mengetahui)' : '→ Kanan (Ketua Panitia)')
                            : 'Penanda Tangan'}
                        </p>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Label (contoh: Ketua Panitia)</label>
                          <input
                            type="text"
                            value={ttd.label}
                            onChange={(e) => handleTTDChange(idx, 'label', e.target.value)}
                            placeholder="Ketua Panitia"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Jabatan Lengkap</label>
                          <input
                            type="text"
                            value={ttd.jabatan}
                            onChange={(e) => handleTTDChange(idx, 'jabatan', e.target.value)}
                            placeholder="Kepala Sub Bagian Data dan Informasi"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Nama Lengkap</label>
                          <input
                            type="text"
                            value={ttd.nama}
                            onChange={(e) => handleTTDChange(idx, 'nama', e.target.value)}
                            placeholder="Ahmad Fauzi, S.Kom"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B0F1A]"
                          />
                        </div>
                      </div>
                    ))}

                  </div>

                  {/* Footer Modal */}
                  <div className="flex gap-3 p-5 border-t border-gray-200">
                    <button
                      onClick={() => setModalPDF(false)}
                      className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-all"
                    >
                      Batal
                    </button>
                    <button
                      onClick={generatePDF}
                      disabled={loadingPDF}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-[#6B0F1A] text-white text-sm font-bold hover:bg-[#8B1A2A] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingPDF
                        ? '⏳ Generating...'
                        : `📄 Unduh ${jenisPDF === 'daftar-hadir' ? 'Daftar Peserta' : 'Rekap Kehadiran'}`}
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

function PengaturanForm({ password, idAcara, onSuccess, onError }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!idAcara) return;
    setLoading(true);
    fetch(`/api/admin/pengaturan?id_acara=${idAcara}`, { headers: getAuthHeader(password) })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => {
        const data = d.data || {};
        if (data.deadline_registrasi) {
          const parts = data.deadline_registrasi.split('T');
          data.deadline_tanggal = parts[0] || '';
          data.deadline_waktu = parts[1] || '';
        }
        setForm(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [password, idAcara]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const bodyToSave = { ...form, id_acara: idAcara };
      bodyToSave.deadline_registrasi = `${form.deadline_tanggal}T${form.deadline_waktu}`;
      delete bodyToSave.deadline_tanggal;
      delete bodyToSave.deadline_waktu;

      const resp = await fetch('/api/admin/pengaturan', {
        method: 'PUT',
        headers: getAuthHeader(password),
        body: JSON.stringify(bodyToSave),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.pesan || 'Gagal menyimpan pengaturan.');
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      if (onError) onError(err.message || 'Gagal menyimpan pengaturan.');
    }
    setSaving(false);
  };

  if (loading) return <div className="h-32 bg-gray-200 animate-pulse rounded-2xl w-full max-w-2xl"></div>;
  if (!form) return <p className="text-[#DC2626] font-medium p-4 bg-[#FEE2E2] rounded-lg">Gagal memuat data pengaturan.</p>;

  return (
    <div className="bg-white rounded-2xl shadow-card p-8 max-w-2xl border border-[#E2E8F0]">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Field label="Nama Acara" name="nama_acara" value={form.nama_acara || ''} onChange={handleChange} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Tanggal Acara" name="tanggal_acara" value={form.tanggal_acara || ''} onChange={handleChange} type="date" />
          <Field label="Waktu Acara" name="waktu_acara" value={form.waktu_acara || ''} onChange={handleChange} type="time" />
        </div>
        <Field label="Lokasi Acara" name="lokasi_acara" value={form.lokasi_acara || ''} onChange={handleChange} />
        <Field label="Kuota Maksimal" name="kuota_maksimal" value={form.kuota_maksimal ?? ''} onChange={handleChange} type="number" required={true} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Tanggal Deadline" name="deadline_tanggal" value={form.deadline_tanggal || ''} onChange={handleChange} type="date" required={true} />
          <Field label="Jam Deadline" name="deadline_waktu" value={form.deadline_waktu || ''} onChange={handleChange} type="time" required={true} />
        </div>
        <Field label="Password Petugas Lapangan" name="password_petugas" value={form.password_petugas || ''} onChange={handleChange} />
        
        <div className="pt-4 border-t border-[#E2E8F0]">
          <label className="block text-sm font-display font-semibold text-[#3A0708] mb-3">Status Registrasi Sistem</label>
          <div className="flex items-center gap-4 bg-[#EEF2F7] p-4 rounded-xl border border-[#E2E8F0]">
            <label className={`flex items-center gap-2 cursor-pointer ${form.status_registrasi === 'buka' ? 'text-[#16A34A] font-bold' : 'text-gray-500'}`}>
              <input type="radio" name="status_registrasi" value="buka" checked={form.status_registrasi === 'buka'} onChange={handleChange} className="w-5 h-5 text-[#16A34A] focus:ring-[#16A34A]" />
              BUKA
            </label>
            <label className={`flex items-center gap-2 cursor-pointer ${form.status_registrasi === 'tutup' ? 'text-[#DC2626] font-bold' : 'text-gray-500'}`}>
              <input type="radio" name="status_registrasi" value="tutup" checked={form.status_registrasi === 'tutup'} onChange={handleChange} className="w-5 h-5 text-[#DC2626] focus:ring-[#DC2626]" />
              TUTUP
            </label>
          </div>
        </div>
        
        <div className="pt-6">
          <TombolPrimer type="submit" varian="primer" ukuran="lg" disabled={saving}>
            {saving ? 'Menyimpan...' : 'SIMPAN PENGATURAN'}
          </TombolPrimer>
        </div>
      </form>
    </div>
  );
}

function KelolaAcaraPanel({ password, apiFetch, onRefresh, currentActiveId, setFeedback }) {
  const [listAcara, setListAcara] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [kodeAcara, setKodeAcara] = useState('');
  const [namaAcara, setNamaAcara] = useState('');
  const [tanggalAcara, setTanggalAcara] = useState('');
  const [waktuAcara, setWaktuAcara] = useState('08:00');
  const [lokasiAcara, setLokasiAcara] = useState('');
  const [kuotaMaksimal, setKuotaMaksimal] = useState(500);
  const [deadlineTanggal, setDeadlineTanggal] = useState('');
  const [deadlineWaktu, setDeadlineWaktu] = useState('');
  const [passwordPetugas, setPasswordPetugas] = useState('');
  const [saving, setSaving] = useState(false);

  const muatAcara = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/admin/acara');
      setListAcara(data.data || []);
    } catch {
      setFeedback('❌ Gagal memuat daftar acara.');
    }
    setLoading(false);
  };

  useEffect(() => {
    muatAcara();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const resp = await fetch('/api/admin/acara', {
        method: 'POST',
        headers: getAuthHeader(password),
        body: JSON.stringify({
          kode_acara: kodeAcara,
          nama_acara: namaAcara,
          tanggal_acara: tanggalAcara,
          waktu_acara: waktuAcara,
          lokasi_acara: lokasiAcara,
          kuota_maksimal: kuotaMaksimal,
          deadline_registrasi: `${deadlineTanggal}T${deadlineWaktu}`,
          password_petugas: passwordPetugas
        })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setFeedback(`❌ ${data.pesan || 'Gagal membuat acara.'}`);
      } else {
        setFeedback('✅ Acara baru berhasil dibuat!');
        setKodeAcara('');
        setNamaAcara('');
        setTanggalAcara('');
        setWaktuAcara('08:00');
        setLokasiAcara('');
        setKuotaMaksimal(500);
        setDeadlineTanggal('');
        setDeadlineWaktu('');
        setPasswordPetugas('');
        muatAcara();
        if (onRefresh) onRefresh();
      }
    } catch {
      setFeedback('❌ Tidak dapat menghubungi server.');
    }
    setSaving(false);
  };

  const handleSetActive = async (id) => {
    try {
      const resp = await fetch('/api/admin/acara/aktif', {
        method: 'PUT',
        headers: getAuthHeader(password),
        body: JSON.stringify({ id_acara: id })
      });
      if (resp.ok) {
        setFeedback('✅ Acara aktif berhasil diubah!');
        muatAcara();
        if (onRefresh) onRefresh();
      } else {
        setFeedback('❌ Gagal mengaktifkan acara.');
      }
    } catch {
      setFeedback('❌ Gagal mengaktifkan acara.');
    }
  };

  const handleDelete = async (id, nama) => {
    if (!window.confirm(`PERINGATAN KRITIS:\nApakah Anda yakin ingin menghapus acara "${nama}"?\nSemua data peserta dan audit log yang terhubung ke acara ini akan DIHAPUS PERMANEN.`)) {
      return;
    }

    try {
      const resp = await fetch(`/api/admin/acara/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(password)
      });
      const data = await resp.json();
      if (resp.ok) {
        setFeedback(`✅ ${data.pesan || 'Acara berhasil dihapus.'}`);
        muatAcara();
        if (onRefresh) onRefresh();
      } else {
        setFeedback(`❌ ${data.pesan || 'Gagal menghapus acara.'}`);
      }
    } catch {
      setFeedback('❌ Gagal menghubungi server.');
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let pass = 'KPU';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPasswordPetugas(pass);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl shadow-card border border-[#E2E8F0] p-6">
          <h3 className="font-display font-semibold text-lg text-[#3A0708] mb-4">Semua Acara</h3>
          {loading ? (
            <p className="text-gray-500 animate-pulse">Memuat daftar acara...</p>
          ) : listAcara.length === 0 ? (
            <p className="text-gray-500">Belum ada acara terdaftar.</p>
          ) : (
            <div className="space-y-4">
              {listAcara.map((ac) => (
                <div key={ac.id} className={`p-5 rounded-xl border transition-all ${ac.adalah_aktif ? 'border-[#D8241C] bg-[#FCEDED]' : 'border-[#E2E8F0] bg-white'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 bg-[#1F1A17] text-white rounded font-bold">{ac.kode_acara}</span>
                        {ac.adalah_aktif && (
                          <span className="text-xs px-2 py-0.5 bg-[#D8241C] text-white rounded font-bold">AKTIF REGISTRASI</span>
                        )}
                      </div>
                      <h4 className="font-display font-bold text-lg text-[#1F1A17] mt-2">{ac.nama_acara}</h4>
                      <p className="text-sm text-[#6B5A5A] font-body mt-1">📅 {ac.tanggal_acara} | 📍 {ac.lokasi_acara}</p>
                      <p className="text-xs text-[#9CA3AF] mt-2">Password Petugas: <code className="font-mono font-bold text-[#1F1A17]">{ac.password_petugas}</code></p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {!ac.adalah_aktif && (
                        <>
                          <button 
                            onClick={() => handleSetActive(ac.id)}
                            className="px-3 py-1.5 bg-[#D2B704] text-[#1F1A17] hover:bg-[#E8CC20] font-display font-bold text-xs rounded-lg transition-all shadow-sm whitespace-nowrap"
                          >
                            SET AKTIF
                          </button>
                          <button 
                            onClick={() => handleDelete(ac.id, ac.nama_acara)}
                            className="px-3 py-1.5 bg-[#DC2626] text-white hover:bg-[#B91C1C] font-display font-bold text-xs rounded-lg transition-all shadow-sm whitespace-nowrap"
                          >
                            HAPUS
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-[#E2E8F0] p-6 h-fit">
        <h3 className="font-display font-semibold text-lg text-[#3A0708] mb-4">Buat Acara Baru</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1F1A17] mb-1">Kode Acara (Prefix ID)</label>
            <input 
              type="text" value={kodeAcara} onChange={(e) => setKodeAcara(e.target.value)}
              placeholder="Contoh: PILKADA26" required
              className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#D8241C]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1F1A17] mb-1">Nama Acara</label>
            <input 
              type="text" value={namaAcara} onChange={(e) => setNamaAcara(e.target.value)}
              placeholder="Nama acara lengkap" required
              className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#D8241C]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1F1A17] mb-1">Tanggal</label>
              <input 
                type="date" value={tanggalAcara} onChange={(e) => setTanggalAcara(e.target.value)} required
                className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#D8241C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1F1A17] mb-1">Waktu</label>
              <input 
                type="time" value={waktuAcara} onChange={(e) => setWaktuAcara(e.target.value)} required
                className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#D8241C]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1F1A17] mb-1">Lokasi</label>
            <input 
              type="text" value={lokasiAcara} onChange={(e) => setLokasiAcara(e.target.value)}
              placeholder="Lokasi pelaksanaan" required
              className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#D8241C]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1F1A17] mb-1">Kuota Max</label>
            <input 
              type="number" value={kuotaMaksimal} onChange={(e) => setKuotaMaksimal(e.target.value === '' ? '' : parseInt(e.target.value))} required
              className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#D8241C]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1F1A17] mb-1">Tgl Deadline</label>
              <input 
                type="date" value={deadlineTanggal} onChange={(e) => setDeadlineTanggal(e.target.value)} required
                className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#D8241C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1F1A17] mb-1">Jam Deadline</label>
              <input 
                type="time" value={deadlineWaktu} onChange={(e) => setDeadlineWaktu(e.target.value)} required
                className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#D8241C]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1F1A17] mb-1">Password Petugas</label>
            <div className="flex gap-2">
              <input 
                type="text" value={passwordPetugas} onChange={(e) => setPasswordPetugas(e.target.value)}
                placeholder="Password check-in petugas" required
                className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#D8241C]"
              />
              <button 
                type="button" onClick={generateRandomPassword}
                className="px-3 bg-gray-100 border border-[#E2E8F0] hover:bg-gray-200 text-xs font-bold rounded-lg"
              >
                Acak
              </button>
            </div>
          </div>
          <div className="pt-2">
            <TombolPrimer type="submit" varian="primer" disabled={saving} fullWidth={true}>
              {saving ? 'MEMPROSES...' : 'BUAT ACARA'}
            </TombolPrimer>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label className="block text-sm font-display font-semibold text-[#3A0708] mb-2">{label}</label>
      <input 
        type={type} name={name} value={value} onChange={onChange} required={required}
        className="w-full min-w-[200px] h-12 border-[1.5px] border-[#E2E8F0] rounded-xl px-4 focus:outline-none focus:border-[#6B0F1A] focus:ring-[3px] focus:ring-[#6B0F1A]/12 transition-all font-body text-[#3A0708]" 
      />
    </div>
  );
}

export default function Admin() {
  const { token, level, login, logout, isAuthenticated } = useAuth();
  const [localToken, setLocalToken] = useState(token);

  if (!isAuthenticated && !localToken) {
    return <LoginForm onLogin={(pwd, lvl) => { login(pwd, lvl); setLocalToken(pwd); }} />;
  }

  return <Dashboard password={localToken || token} onLogout={() => { logout(); setLocalToken(''); }} />;
}
