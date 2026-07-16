import { useState, useEffect } from 'react';
import { LOGOKPU_URL } from '../constants/logo';
import TabelPeserta from '../components/TabelPeserta';
import HeaderUtama from '../components/HeaderUtama';
import TombolPrimer from '../components/TombolPrimer';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

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
    <div className="min-h-screen flex items-center justify-center bg-[#001f5b] px-4" style={{ background: 'linear-gradient(135deg, #001f5b 0%, #003580 100%)' }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-card p-8 md:p-10 relative overflow-hidden">
        {/* Garis emas atas */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #C8972A 0%, #E8B84B 50%, #C8972A 100%)' }}></div>
        
        <div className="text-center mb-8">
          <img src={LOGOKPU_URL} alt="KPU Sumsel" className="h-16 mx-auto mb-4" />
          <h1 className="text-xl font-bold font-display text-[#0D1B3E] uppercase tracking-wide">KPU Provinsi Sumatera Selatan</h1>
          
          <div className="flex items-center justify-center my-4">
            <div className="h-px w-12 bg-[#E2E8F0]"></div>
            <span className="px-3 text-[#C8972A] text-xs">◆</span>
            <div className="h-px w-12 bg-[#E2E8F0]"></div>
          </div>

          <h2 className="text-xl font-bold font-display text-[#003580]">Dashboard Administrator</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-display font-semibold text-[#0D1B3E] mb-2">Username</label>
            <input
              type="text" value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-12 border-[1.5px] border-[#E2E8F0] rounded-xl px-4 focus:outline-none focus:border-[#003580] focus:ring-[3px] focus:ring-[#003580]/12 transition-all font-body text-[#0D1B3E]"
              placeholder="Masukkan username" required
            />
          </div>
          <div>
            <label className="block text-sm font-display font-semibold text-[#0D1B3E] mb-2">Password</label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 border-[1.5px] border-[#E2E8F0] rounded-xl px-4 focus:outline-none focus:border-[#003580] focus:ring-[3px] focus:ring-[#003580]/12 transition-all font-body text-[#0D1B3E] font-mono tracking-widest"
              placeholder="••••••••" required
            />
          </div>
          {error && <p className="text-sm text-[#B91C1C] text-center font-medium bg-[#FEE2E2] p-2 rounded-lg">{error}</p>}
          
          <div className="pt-2">
            <TombolPrimer type="submit" varian="primer" ukuran="lg" fullWidth={true} disabled={loading}>
              {loading ? 'MEMPROSES...' : 'MASUK'}
            </TombolPrimer>
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
  const [feedback, setFeedback] = useState('');
  const [tanggalHariIni, setTanggalHariIni] = useState('');

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

  const authHeaders = () => password.startsWith('eyJ')
    ? { 'Authorization': 'Bearer ' + password }
    : { 'x-password': password };

  const muatRekap = () => {
    if (!idAcaraSelected) return;
    fetch(`/api/admin/rekap?id_acara=${idAcaraSelected}`, { headers: authHeaders() })
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
      const resp = await fetch(`/api/admin/export-csv?id_acara=${idAcaraSelected}`, { headers: authHeaders() });
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
      setFeedback('✅ CSV berhasil di-download.');
    } catch {
      setFeedback('❌ Gagal export CSV.');
    }
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleBackup = async () => {
    try {
      const data = await apiFetch('/api/admin/backup');
      setFeedback('✅ Backup berhasil: ' + data.data.file);
    } catch (err) {
      setFeedback('❌ Gagal backup: ' + (err.message || ''));
    }
    setTimeout(() => setFeedback(''), 4000);
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
        <aside className="w-[260px] bg-[#001f5b] min-h-full flex flex-col shrink-0 overflow-y-auto">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-white font-display font-bold text-lg">Menu Admin</h2>
            <p className="text-white/60 text-xs mt-1">Sistem Registrasi KPU</p>
          </div>

          {/* Pemilih Acara */}
          <div className="px-6 py-4 border-b border-white/10">
            <label className="block text-white/50 text-[10px] font-bold uppercase tracking-wider mb-2">Pilih Acara</label>
            <select 
              value={idAcaraSelected}
              onChange={(e) => setIdAcaraSelected(e.target.value)}
              className="w-full h-10 bg-white/10 text-white border border-white/20 rounded-lg px-2 text-xs focus:outline-none focus:border-[#C8972A]"
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
                  className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all ${
                    active 
                    ? 'bg-white/15 border-l-4 border-[#C8972A] text-white font-semibold' 
                    : 'text-white/60 hover:bg-white/10 hover:text-white border-l-4 border-transparent'
                  }`}
                >
                  <span className="text-lg">{t.label.split(' ')[0]}</span>
                  <span className="font-display">{t.label.split(' ').slice(1).join(' ')}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-6 border-t border-white/10">
            <p className="text-white/40 text-[10px] mb-4">Sistem Versi 2.0</p>
            <button 
              onClick={onLogout} 
              className="w-full flex items-center gap-2 text-white/80 hover:text-[#FF6B6B] transition-colors font-semibold text-sm"
            >
              <span>🚪</span> Keluar Sistem
            </button>
          </div>
        </aside>

        {/* KONTEN UTAMA */}
        <main className="flex-1 overflow-y-auto">
          {feedback && (
            <div className="fixed top-24 right-8 z-50 animate-[slideUp_250ms_ease-out]">
              <div className="bg-[#003580] text-white px-6 py-3 rounded-lg shadow-lg font-medium text-sm border-l-4 border-[#C8972A]">
                {feedback}
              </div>
            </div>
          )}

          <div className="p-8">
            {/* Tampilan Rekap */}
            {tab === 'rekap' && (
              <div className="animate-[slideUp_250ms_ease-out]">
                <div className="mb-8">
                  <h2 className="text-3xl font-display font-bold text-[#0D1B3E]">Selamat datang, Admin</h2>
                  <p className="text-[#5A6A8A] mt-1 font-body">KPU Provinsi Sumatera Selatan · {tanggalHariIni}</p>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-2xl"></div>)}
                  </div>
                ) : rekap ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-[#003580] rounded-2xl p-6 text-white shadow-card relative overflow-hidden">
                      <div className="text-3xl mb-3">👥</div>
                      <div className="text-5xl font-bold font-display">{rekap.total_seluruh || 0}</div>
                      <div className="text-sm text-white/70 mt-1">Total Terdaftar</div>
                      <div className="w-full h-1 bg-white/20 mt-4 rounded-full overflow-hidden">
                        <div className="h-full bg-white/40 w-1/2"></div>
                      </div>
                    </div>
                    
                    <div className="bg-[#16A34A] rounded-2xl p-6 text-white shadow-card relative overflow-hidden">
                      <div className="text-3xl mb-3">✅</div>
                      <div className="text-5xl font-bold font-display">{rekap.total_hadir || 0}</div>
                      <div className="text-sm text-white/70 mt-1">Hadir (Check-in)</div>
                      <div className="w-full h-1 bg-white/20 mt-4 rounded-full overflow-hidden">
                        <div className="h-full bg-white" style={{ width: `${rekap.total_seluruh ? (rekap.total_hadir / rekap.total_seluruh) * 100 : 0}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-[#B91C1C] rounded-2xl p-6 text-white shadow-card relative overflow-hidden">
                      <div className="text-3xl mb-3">✕</div>
                      <div className="text-5xl font-bold font-display">{(rekap.total_membatalkan || 0) + (rekap.total_digantikan || 0)}</div>
                      <div className="text-sm text-white/70 mt-1">Dibatalkan / Diganti</div>
                    </div>

                    <div className="bg-[#C8972A] rounded-2xl p-6 text-white shadow-card relative overflow-hidden">
                      <div className="text-3xl mb-3">%</div>
                      <div className="text-5xl font-bold font-display">
                        {rekap.total_seluruh && rekap.total_seluruh > 0 
                          ? Math.round((rekap.total_hadir / (rekap.total_seluruh - (rekap.total_membatalkan || 0))) * 100) 
                          : 0}%
                      </div>
                      <div className="text-sm text-white/70 mt-1">Tingkat Kehadiran Aktif</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#DC2626]">Gagal memuat rekap data.</p>
                )}

                <div className="bg-white rounded-2xl shadow-card border border-[#E2E8F0] p-6">
                  <div className="flex items-center gap-3 mb-6 relative">
                    <div className="absolute left-[-24px] top-0 bottom-0 w-1 bg-[#C8972A]"></div>
                    <h3 className="font-display font-semibold text-xl text-[#0D1B3E]">Aksi Cepat</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <TombolPrimer onClick={handleExportCSV} varian="outline-emas" icon="📥">
                      Export CSV Peserta
                    </TombolPrimer>
                    <TombolPrimer onClick={handleBackup} varian="primer" icon="💾">
                      Backup Database
                    </TombolPrimer>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Data Peserta */}
            {tab === 'peserta' && (
              <div className="animate-[slideUp_250ms_ease-out]">
                <div className="flex items-center gap-3 mb-6 relative">
                  <div className="absolute left-[-16px] top-0 bottom-0 w-1 bg-[#C8972A]"></div>
                  <h3 className="font-display font-bold text-2xl text-[#0D1B3E]">Data Peserta</h3>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                  <div className="flex-1 w-full flex gap-3">
                    <input 
                      type="text" 
                      placeholder="Cari nama, instansi, atau ID..." 
                      value={pesertaSearch}
                      onChange={(e) => setPesertaSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && muatPeserta(1, pesertaSearch)}
                      className="w-full md:max-w-md h-12 px-4 rounded-lg border-[1.5px] border-[#E2E8F0] focus:outline-none focus:border-[#003580] focus:ring-[3px] focus:ring-[#003580]/12"
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
                  onRefresh={() => muatPeserta(pesertaPage, pesertaSearch)}
                />
              </div>
            )}

            {/* Tab Kelola Acara */}
            {tab === 'kelola-acara' && (
              <div className="animate-[slideUp_250ms_ease-out]">
                <div className="flex items-center gap-3 mb-6 relative">
                  <div className="absolute left-[-16px] top-0 bottom-0 w-1 bg-[#C8972A]"></div>
                  <h3 className="font-display font-bold text-2xl text-[#0D1B3E]">Manajemen Multi-Acara</h3>
                </div>
                <KelolaAcaraPanel 
                  password={password} 
                  apiFetch={apiFetch} 
                  onRefresh={muatDaftarAcara} 
                  currentActiveId={idAcaraSelected} 
                  setFeedback={setFeedback} 
                />
              </div>
            )}

            {/* Tab Pengaturan Acara */}
            {tab === 'pengaturan' && (
              <div className="animate-[slideUp_250ms_ease-out]">
                <div className="flex items-center gap-3 mb-6 relative">
                  <div className="absolute left-[-16px] top-0 bottom-0 w-1 bg-[#C8972A]"></div>
                  <h3 className="font-display font-bold text-2xl text-[#0D1B3E]">Pengaturan Acara</h3>
                </div>
                <PengaturanForm 
                  password={password} 
                  idAcara={idAcaraSelected}
                  onSuccess={() => setFeedback('✅ Pengaturan berhasil disimpan!')} 
                  onError={() => setFeedback('❌ Gagal menyimpan pengaturan.')} 
                />
              </div>
            )}

            {/* Tab Audit Log */}
            {tab === 'audit' && (
              <div className="animate-[slideUp_250ms_ease-out]">
                <div className="flex items-center gap-3 mb-6 relative">
                  <div className="absolute left-[-16px] top-0 bottom-0 w-1 bg-[#C8972A]"></div>
                  <h3 className="font-display font-bold text-2xl text-[#0D1B3E]">Riwayat Aktivitas Sistem</h3>
                </div>

                <div className="bg-white rounded-2xl shadow-card border border-[#E2E8F0] overflow-hidden">
                  {loadingAudit ? (
                    <p className="text-center text-gray-500 py-10 animate-pulse">Memuat log...</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#003580] text-white text-left font-display">
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
                            if (log.aksi === 'REGISTRASI' || log.aksi === 'WALKIN') chipClass = "bg-blue-100 text-blue-700";
                            if (log.aksi === 'CHECKIN') chipClass = "bg-green-100 text-green-700";
                            if (log.aksi === 'BATALKAN') chipClass = "bg-red-100 text-red-700";
                            if (log.aksi === 'EDIT_DATA') chipClass = "bg-yellow-100 text-yellow-700";
                            if (log.aksi === 'GANTI_PESERTA') chipClass = "bg-purple-100 text-purple-700";

                            return (
                              <tr key={log.id} className={`border-b border-[#E2E8F0] hover:bg-[#EEF2F7] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                <td className="px-6 py-3 whitespace-nowrap text-[#5A6A8A]">{log.waktu?.slice(0, 19).replace('T', ' ')}</td>
                                <td className="px-6 py-3 font-medium text-[#0D1B3E]">{log.aktor}</td>
                                <td className="px-6 py-3">
                                  <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${chipClass}`}>
                                    {log.aksi}
                                  </span>
                                </td>
                                <td className="px-6 py-3 font-mono text-xs text-[#003580]">{log.id_peserta || '-'}</td>
                                <td className="px-6 py-3 text-[#5A6A8A] text-xs max-w-xs truncate" title={log.detail}>{log.detail}</td>
                              </tr>
                            );
                          }) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-16 text-center text-[#5A6A8A]">
                                <div className="text-4xl mb-3">📋</div>
                                <p className="font-medium text-[#0D1B3E] text-base">Belum ada riwayat aktivitas.</p>
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

  const authHeaders = () => password.startsWith('eyJ')
    ? { 'Authorization': 'Bearer ' + password }
    : { 'x-password': password };

  useEffect(() => {
    if (!idAcara) return;
    setLoading(true);
    fetch(`/api/admin/pengaturan?id_acara=${idAcara}`, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => setForm(d.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [password, idAcara]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const resp = await fetch('/api/admin/pengaturan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ...form, id_acara: idAcara }),
      });
      if (!resp.ok) throw new Error();
      if (onSuccess) onSuccess();
    } catch {
      if (onError) onError();
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Kuota Maksimal" name="kuota_maksimal" value={form.kuota_maksimal || '500'} onChange={handleChange} type="number" />
          <Field label="Deadline Registrasi" name="deadline_registrasi" value={form.deadline_registrasi || ''} onChange={handleChange} type="date" />
        </div>
        <Field label="Password Petugas Lapangan" name="password_petugas" value={form.password_petugas || ''} onChange={handleChange} />
        
        <div className="pt-4 border-t border-[#E2E8F0]">
          <label className="block text-sm font-display font-semibold text-[#0D1B3E] mb-3">Status Registrasi Sistem</label>
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
  const [deadlineRegistrasi, setDeadlineRegistrasi] = useState('');
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
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          kode_acara: kodeAcara,
          nama_acara: namaAcara,
          tanggal_acara: tanggalAcara,
          waktu_acara: waktuAcara,
          lokasi_acara: lokasiAcara,
          kuota_maksimal: kuotaMaksimal,
          deadline_registrasi: deadlineRegistrasi,
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
        setDeadlineRegistrasi('');
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
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
          <h3 className="font-display font-semibold text-lg text-[#0D1B3E] mb-4">Semua Acara</h3>
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
                    <div>
                      {!ac.adalah_aktif && (
                        <button 
                          onClick={() => handleSetActive(ac.id)}
                          className="px-3 py-1.5 bg-[#D2B704] text-[#1F1A17] hover:bg-[#E8CC20] font-display font-bold text-xs rounded-lg transition-all shadow-sm"
                        >
                          SET AKTIF
                        </button>
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
        <h3 className="font-display font-semibold text-lg text-[#0D1B3E] mb-4">Buat Acara Baru</h3>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1F1A17] mb-1">Kuota Max</label>
              <input 
                type="number" value={kuotaMaksimal} onChange={(e) => setKuotaMaksimal(parseInt(e.target.value))} required
                className="w-full h-10 border border-[#E2E8F0] rounded-lg px-3 text-sm focus:outline-none focus:border-[#D8241C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1F1A17] mb-1">Deadline Reg (Optional)</label>
              <input 
                type="date" value={deadlineRegistrasi} onChange={(e) => setDeadlineRegistrasi(e.target.value)}
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

function Field({ label, name, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm font-display font-semibold text-[#0D1B3E] mb-2">{label}</label>
      <input 
        type={type} name={name} value={value} onChange={onChange} 
        className="w-full h-12 border-[1.5px] border-[#E2E8F0] rounded-xl px-4 focus:outline-none focus:border-[#003580] focus:ring-[3px] focus:ring-[#003580]/12 transition-all font-body text-[#0D1B3E]" 
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
