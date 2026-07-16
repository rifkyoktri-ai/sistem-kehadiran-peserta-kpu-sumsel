import { useState, useEffect, useRef } from 'react';
import { LOGOKPU_URL } from '../constants/logo';
import QRScanner from '../components/QRScanner';
import FormRegistrasi from '../components/FormRegistrasi';
import HeaderUtama from '../components/HeaderUtama';
import TombolPrimer from '../components/TombolPrimer';
import StatusBadge from '../components/StatusBadge';
import ModalIDCard from '../components/ModalIDCard';
import { useAuth } from '../context/AuthContext';

function authHeaders(password, extra = {}) {
  const base = password && password.startsWith('eyJ')
    ? { 'Authorization': 'Bearer ' + password }
    : { 'x-password': password };
  return { ...base, 'Content-Type': 'application/json', ...extra };
}

function LoginForm({ onLogin }) {
  const [password, setPassword] = useState('');
  const [idAcara, setIdAcara] = useState('');
  const [daftarAcara, setDaftarAcara] = useState([]);
  const [loadingAcara, setLoadingAcara] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/checkin/acara-aktif')
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => {
        const list = d.data || [];
        setDaftarAcara(list);
        if (list.length > 0) {
          setIdAcara(list[0].id);
        }
      })
      .catch(() => setError('Gagal mengambil daftar acara aktif.'))
      .finally(() => setLoadingAcara(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idAcara) {
      setError('Pilih acara terlebih dahulu.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const resp = await fetch('/api/checkin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, id_acara: idAcara }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.pesan || 'Login gagal.');
        return;
      }
      if (data.data && data.data.token) {
        onLogin(data.data.token, 'petugas', data.data.id_acara);
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

          <h2 className="text-xl font-bold font-display text-[#003580]">Panel Petugas Check-in</h2>
          <p className="text-sm font-body text-[#5A6A8A] mt-2">Pilih acara & masukkan password petugas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0D1B3E] mb-2">Pilih Acara Sesi Hari-H</label>
            {loadingAcara ? (
              <p className="text-xs text-gray-500 animate-pulse">Memuat daftar acara...</p>
            ) : daftarAcara.length === 0 ? (
              <p className="text-xs text-[#B91C1C] font-semibold bg-[#FEE2E2] p-3 rounded-lg border border-[#DC2626]">Tidak ada acara aktif saat ini.</p>
            ) : (
              <select
                value={idAcara}
                onChange={(e) => setIdAcara(e.target.value)}
                className="w-full h-12 border border-[#E2E8F0] rounded-xl px-3 text-sm focus:outline-none focus:border-[#003580]"
              >
                {daftarAcara.map((ac) => (
                  <option key={ac.id} value={ac.id}>{ac.nama_acara} ({ac.kode_acara})</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0D1B3E] mb-2">Password Petugas</label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 border border-[#E2E8F0] rounded-xl px-4 text-center tracking-widest focus:outline-none focus:border-[#003580] focus:ring-[3px] focus:ring-[#003580]/12 transition-all font-mono"
              placeholder="••••••••" required
            />
          </div>
          {error && <p className="text-sm text-[#B91C1C] text-center font-medium bg-[#FEE2E2] p-2 rounded-lg">{error}</p>}
          <TombolPrimer type="submit" varian="primer" ukuran="lg" fullWidth={true} disabled={loading || loadingAcara || daftarAcara.length === 0}>
            {loading ? 'MEMPROSES...' : 'MASUK PANEL'}
          </TombolPrimer>
        </form>
      </div>
    </div>
  );
}

function CariTab({ password, acaraId }) {
  const [keyword, setKeyword] = useState('');
  const [peserta, setPeserta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [idCardTarget, setIdCardTarget] = useState(null);
  const fotoInputRef = useRef(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const cariPeserta = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setPeserta(null);
    setMsg('');
    try {
      const resp = await fetch('/api/checkin/validasi', {
        method: 'POST',
        headers: authHeaders(password, { 'x-acara-id': acaraId }),
        body: JSON.stringify({ identifier: keyword.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMsg(data.pesan || 'Peserta tidak ditemukan.');
        return;
      }
      setPeserta(data.data);
    } catch {
      setMsg('Gagal terhubung ke server.');
    }
    setLoading(false);
  };

  const tandaiHadir = async () => {
    if (!peserta) return;
    setMsg('');
    try {
      const resp = await fetch('/api/checkin/tandai-hadir', {
        method: 'POST',
        headers: authHeaders(password, { 'x-acara-id': acaraId }),
        body: JSON.stringify({ identifier: peserta.id }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMsg(data.pesan || 'Gagal check-in.');
        return;
      }
      setPeserta(data.data);
      setMsg(data.pesan || 'Check-in berhasil!');
    } catch {
      setMsg('Gagal terhubung ke server.');
    }
  };

  const handleFotoUpload = async (file) => {
    if (!file || !peserta) return;
    setUploadingFoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const foto_base64 = e.target.result;
        const auth = password?.startsWith('eyJ')
          ? { 'Authorization': 'Bearer ' + password }
          : { 'x-password': password, 'x-acara-id': acaraId || '' };
        const res = await fetch(`/api/peserta/${peserta.id}/foto`, {
          method: 'POST',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto_base64 }),
        });
        const data = await res.json();
        if (res.ok) setMsg('Foto berhasil diupload!');
        else setMsg(data.pesan || 'Gagal upload foto.');
        setUploadingFoto(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setMsg('Gagal terhubung ke server.');
      setUploadingFoto(false);
    }
  };

  const cetakUlang = async () => {
    if (!peserta) return;
    try {
      const resp = await fetch('/api/checkin/cetak-ulang', {
        method: 'POST',
        headers: authHeaders(password, { 'x-acara-id': acaraId }),
        body: JSON.stringify({ id_peserta: peserta.id }),
      });
      const data = await resp.json();
      setMsg(data.pesan || 'Cetak ulang dicatat.');
    } catch {
      setMsg('Gagal.');
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') cariPeserta(); };
  const sudahHadir = peserta?.status === 'hadir';

  return (
    <div className="mx-8 mt-4 animate-[slideUp_250ms_ease-out]">
      <ModalIDCard
        terbuka={idCardTarget !== null}
        peserta={idCardTarget}
        onTutup={() => setIdCardTarget(null)}
      />

      <input
        ref={fotoInputRef}
        type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFotoUpload(file);
          e.target.value = '';
        }}
      />

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-[#E2E8F0]">
        <div className="flex items-center gap-3 mb-6 relative">
          <div className="absolute left-[-24px] top-0 bottom-0 w-1 bg-[#C8972A]"></div>
          <h3 className="font-display font-semibold text-lg text-[#0D1B3E]">Cari Peserta</h3>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text" placeholder="Ketik nama, ID, atau email..."
            value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKey}
            className="flex-1 border-[1.5px] border-[#E2E8F0] rounded-xl px-4 h-14 focus:outline-none focus:border-[#003580] focus:ring-[3px] focus:ring-[#003580]/12 text-[#0D1B3E] font-body transition-all"
          />
          <TombolPrimer onClick={cariPeserta} disabled={loading} className="h-14 min-w-[120px]">
            {loading ? '...' : 'CARI'}
          </TombolPrimer>
        </div>
        
        {msg && !peserta && (
          <div className={`mt-6 p-4 rounded-lg text-sm font-medium ${msg.includes('berhasil') ? 'bg-[#DCFCE7] text-[#15803D] border border-[#16A34A]' : 'bg-[#FEE2E2] text-[#B91C1C] border border-[#DC2626]'}`}>
            {msg}
          </div>
        )}
      </div>

      {peserta && (
        <HasilValidasiCard 
          peserta={peserta} 
          msg={msg} 
          sudahHadir={sudahHadir}
          tandaiHadir={tandaiHadir}
          cetakUlang={cetakUlang}
          onFotoClick={() => fotoInputRef.current.click()}
          onPreviewIDCard={() => setIdCardTarget(peserta)}
          uploadingFoto={uploadingFoto}
        />
      )}
    </div>
  );
}

function HasilValidasiCard({ peserta, msg, sudahHadir, tandaiHadir, cetakUlang, onFotoClick, onPreviewIDCard, uploadingFoto }) {
  const isBatal = peserta.status === 'membatalkan' || peserta.status === 'digantikan';
  const isHadir = peserta.status === 'hadir';
  const isTerdaftar = peserta.status === 'terdaftar';

  let containerClass = "bg-white shadow-card rounded-2xl border-2 ";
  let headerTitle = "";
  let headerClass = "";
  let icon = "";

  if (isHadir) {
    containerClass += "border-[#D97706] bg-[#FEF3C7]";
    headerTitle = "⚠ SUDAH MELAKUKAN CHECK-IN";
    headerClass = "text-[#92400E]";
    icon = "⚠";
  } else if (isBatal) {
    containerClass += "border-[#DC2626] bg-[#FEE2E2]";
    headerTitle = "✕ PENDAFTARAN TIDAK AKTIF";
    headerClass = "text-[#B91C1C]";
    icon = "✕";
  } else if (isTerdaftar) {
    containerClass += "border-[#16A34A] bg-[#DCFCE7]";
    headerTitle = "✅ PESERTA TERVERIFIKASI";
    headerClass = "text-[#15803D]";
    icon = "✅";
  }

  return (
    <div className={`${containerClass} p-8 animate-[slideUp_250ms_ease-out]`}>
      <div className="flex items-center gap-3 mb-4">
        <h2 className={`font-display font-bold text-xl ${headerClass}`}>{headerTitle}</h2>
      </div>

      {isHadir && (
        <p className="text-[#92400E] font-medium mb-4 bg-white/50 p-2 rounded inline-block">
          Check-in tercatat pada: {peserta.waktu_checkin?.slice(0, 19).replace('T', ' ')}
        </p>
      )}

      {isBatal && (
        <p className="text-[#B91C1C] font-medium mb-4 bg-white/50 p-2 rounded inline-block">
          Status: {peserta.status === 'membatalkan' ? 'Dibatalkan' : 'Digantikan'}. Arahkan peserta ke meja Admin.
        </p>
      )}

      <div className="h-px w-full bg-black/10 my-4"></div>

      <div className="mb-8">
        <p className="font-body font-bold text-black/60 mb-2">
          No. {String(peserta.nomor_urut).padStart(3, '0')} <span className="font-normal mx-2">|</span> <span className="font-mono text-black/80">{peserta.id}</span>
        </p>
        <div className="grid grid-cols-[100px_1fr] gap-y-2 text-base">
          <div className="text-black/60 font-medium">Nama</div>
          <div className="font-bold text-black/90 uppercase text-xl">{peserta.nama_lengkap}</div>
          
          <div className="text-black/60 font-medium">Instansi</div>
          <div className="font-medium text-black/80">{peserta.instansi}</div>
          
          <div className="text-black/60 font-medium">Jabatan</div>
          <div className="font-medium text-black/80">{peserta.jabatan}</div>
        </div>
      </div>

      {(isTerdaftar || isHadir) && (
        <div className={isTerdaftar ? 'space-y-4' : 'mb-4'}>
          {isTerdaftar && (
            <TombolPrimer onClick={tandaiHadir} varian="sukses" ukuran="lg" fullWidth={true}>
              TANDAI HADIR
            </TombolPrimer>
          )}
          <div className="flex justify-center gap-3 mt-3">
            {onFotoClick && (
              <button onClick={onFotoClick} disabled={uploadingFoto} className="text-sm font-semibold text-[#C2410C] hover:underline underline-offset-4 disabled:opacity-50">
                {uploadingFoto ? '⏳ Mengupload...' : '📷 Upload Foto'}
              </button>
            )}
            {onPreviewIDCard && (
              <button onClick={onPreviewIDCard} className="text-sm font-semibold text-[#A16207] hover:underline underline-offset-4">
                🪪 Lihat ID Card
              </button>
            )}
            <button onClick={cetakUlang} className="text-sm font-semibold text-[#15803D] hover:underline underline-offset-4">
              Cetak Ulang ID Card
            </button>
          </div>
        </div>
      )}

      {msg && <p className="mt-4 font-bold text-center text-black/70">{msg}</p>}
    </div>
  );
}

function ScanTab({ password, acaraId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [idCardTarget, setIdCardTarget] = useState(null);
  const fotoInputRef = useRef(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const cariHasilScan = async (idTerbaca) => {
    setResult(null);
    setMsg('');
    setLoading(true);
    try {
      const resp = await fetch('/api/checkin/validasi', {
        method: 'POST',
        headers: authHeaders(password),
        body: JSON.stringify({ identifier: idTerbaca.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMsg(data.pesan || 'Peserta tidak ditemukan.');
        return;
      }
      setResult(data.data);
    } catch {
      setMsg('Gagal terhubung ke server.');
    }
    setLoading(false);
  };

  const tandaiHadir = async () => {
    if (!result) return;
    setMsg('');
    try {
      const resp = await fetch('/api/checkin/tandai-hadir', {
        method: 'POST',
        headers: authHeaders(password),
        body: JSON.stringify({ identifier: result.id }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMsg(data.pesan || 'Gagal check-in.');
        return;
      }
      setResult(data.data);
      setMsg(data.pesan || 'Check-in berhasil!');
    } catch {
      setMsg('Gagal terhubung ke server.');
    }
  };

  const handleFotoUpload = async (file) => {
    if (!file || !result) return;
    setUploadingFoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const foto_base64 = e.target.result;
        const auth = password?.startsWith('eyJ')
          ? { 'Authorization': 'Bearer ' + password }
          : { 'x-password': password, 'x-acara-id': acaraId || '' };
        const res = await fetch(`/api/peserta/${result.id}/foto`, {
          method: 'POST',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto_base64 }),
        });
        const data = await res.json();
        if (res.ok) setMsg('Foto berhasil diupload!');
        else setMsg(data.pesan || 'Gagal upload foto.');
        setUploadingFoto(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setMsg('Gagal terhubung ke server.');
      setUploadingFoto(false);
    }
  };

  const cetakUlang = async () => {
    if (!result) return;
    try {
      const resp = await fetch('/api/checkin/cetak-ulang', {
        method: 'POST',
        headers: authHeaders(password),
        body: JSON.stringify({ id_peserta: result.id }),
      });
      const data = await resp.json();
      setMsg(data.pesan || 'Cetak ulang dicatat.');
    } catch {
      setMsg('Gagal.');
    }
  };

  return (
    <div className="mx-8 mt-4 animate-[slideUp_250ms_ease-out]">
      <ModalIDCard
        terbuka={idCardTarget !== null}
        peserta={idCardTarget}
        onTutup={() => setIdCardTarget(null)}
      />

      <input
        ref={fotoInputRef}
        type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFotoUpload(file);
          e.target.value = '';
        }}
      />

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-[#E2E8F0]">
        <div className="flex items-center gap-3 mb-2 relative">
          <div className="absolute left-[-24px] top-0 bottom-0 w-1 bg-[#C8972A]"></div>
          <h3 className="font-display font-semibold text-lg text-[#0D1B3E]">Scan QR Code</h3>
        </div>
        
        <QRScanner onScan={cariHasilScan} />
        
        {loading && <p className="text-center text-[#5A6A8A] py-4 font-medium animate-pulse">Memuat data peserta...</p>}
        {msg && !result && (
          <div className={`mt-4 p-4 rounded-lg text-sm font-medium ${msg.includes('berhasil') ? 'bg-[#DCFCE7] text-[#15803D] border border-[#16A34A]' : 'bg-[#FEE2E2] text-[#B91C1C] border border-[#DC2626]'}`}>
            {msg}
          </div>
        )}
      </div>

      {result && !loading && (
        <HasilValidasiCard 
          peserta={result} 
          msg={msg} 
          sudahHadir={result.status === 'hadir'}
          tandaiHadir={tandaiHadir}
          cetakUlang={cetakUlang}
          onFotoClick={() => fotoInputRef.current.click()}
          onPreviewIDCard={() => setIdCardTarget(result)}
          uploadingFoto={uploadingFoto}
        />
      )}
    </div>
  );
}

function WalkinTab({ password, acaraId }) {
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [hasil, setHasil] = useState(null);
  const [fotoBase64, setFotoBase64] = useState(null);
  const [idCardTarget, setIdCardTarget] = useState(null);

  const [modalDuplikatOpen, setModalDuplikatOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState({ nama: '', nomor_urut: '', token: '' });

  const handleSubmit = async (data) => {
    if (!fotoBase64) {
      alert('Foto wajib diambil');
      return;
    }
    setSubmitting(true);
    setMsg('');
    setHasil(null);
    try {
      const resp = await fetch('/api/checkin/walkin', {
        method: 'POST',
        headers: authHeaders(password),
        body: JSON.stringify({ ...data, foto_base64: fotoBase64 }),
      });
      const res = await resp.json();
      if (resp.status === 409 && res.error === 'duplikat') {
        setDuplicateData({
          nama: res.data?.nama || '',
          nomor_urut: res.data?.nomor_urut || '',
          token: res.data?.id || res.data?.token || ''
        });
        setModalDuplikatOpen(true);
        return;
      }
      if (!resp.ok) {
        setMsg(res.pesan || 'Gagal daftar.');
        return;
      }
      setHasil(res.data);
      setMsg(res.pesan || 'Walk-in berhasil!');
    } catch {
      setMsg('Gagal terhubung ke server.');
    }
    setSubmitting(false);
  };

  return (
    <div className="mx-8 mt-4 max-w-3xl animate-[slideUp_250ms_ease-out] mb-12">
      <ModalIDCard
        terbuka={idCardTarget !== null}
        peserta={idCardTarget}
        onTutup={() => setIdCardTarget(null)}
      />

      {msg && (
        <p className={`text-sm mb-4 font-medium rounded-lg px-4 py-3 ${msg.includes('berhasil') ? 'text-[#15803D] bg-[#DCFCE7] border border-[#16A34A]' : 'text-[#B91C1C] bg-[#FEE2E2] border border-[#DC2626]'}`}>
          {msg}
        </p>
      )}
      
      {hasil && (
        <div className="bg-[#DCFCE7] border-2 border-[#16A34A] rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#15803D]">✅</span>
            <p className="font-display font-bold text-lg text-[#15803D]">Walk-in Berhasil (Otomatis Check-in)</p>
          </div>
          <p className="font-bold text-xl text-[#0D1B3E] uppercase">{hasil.nama_lengkap}</p>
          <p className="font-mono text-[#003580] mt-1 font-bold">ID: {hasil.id}</p>
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => setIdCardTarget(hasil)}
              className="text-sm font-semibold text-[#A16207] hover:underline underline-offset-4"
            >
              🪪 Lihat ID Card
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-2xl shadow-card p-8 border border-[#E2E8F0]">
        <div className="flex items-center gap-3 mb-2 relative">
          <div className="absolute left-[-32px] top-0 bottom-0 w-1 bg-[#C8972A]"></div>
          <h3 className="font-display font-semibold text-xl text-[#0D1B3E]">Registrasi Walk-in</h3>
        </div>
        <p className="text-sm text-[#5A6A8A] font-body mb-8">Peserta datang langsung tanpa registrasi online.</p>
        <FormRegistrasi
          onSubmit={handleSubmit}
          onFotoChange={(base64) => setFotoBase64(base64)}
          loading={submitting}
          errorMsg={msg}
          duplicateData={duplicateData}
          modalDuplikatOpen={modalDuplikatOpen}
          onCloseDuplicateModal={() => setModalDuplikatOpen(false)}
        />
      </div>
    </div>
  );
}

export default function CheckIn() {
  const { token: authToken, level, acaraId: authAcaraId, login, logout, isAuthenticated } = useAuth();
  const [token, setToken] = useState(authToken);
  const [tab, setTab] = useState('cari');

  if (!token && !isAuthenticated) {
    return <LoginForm onLogin={(pwd, lvl) => { login(pwd, lvl); setToken(pwd); }} />;
  }

  const effectiveToken = token || authToken;

  const TombolKeluar = (
    <TombolPrimer onClick={() => { logout(); setToken(''); }} varian="bahaya" ukuran="sm" className="bg-[#CC0000]">
      Keluar
    </TombolPrimer>
  );

  return (
    <div className="min-h-screen bg-[#EEF2F7] flex flex-col">
      <HeaderUtama judulPanel="Panel Petugas Check-in" slotKanan={TombolKeluar} />

      {/* Status bar */}
      <div className="bg-[#003580] py-2 px-8 shadow-sm flex items-center justify-between text-white/90 text-sm font-medium">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-[#16A34A] rounded-full animate-pulse"></div>
          <span>Sistem Aktif</span>
        </div>
        <div>
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto">
        {/* Navigasi Tab */}
        <div className="bg-white rounded-[10px] shadow-sm mx-8 mt-6 p-2 flex border border-[#E2E8F0]">
          {[
            { id: 'scan', label: '📷 Scan QR' },
            { id: 'cari', label: '🔍 Cari Manual' },
            { id: 'walkin', label: '➕ Walk-in' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-4 px-2 text-center rounded-lg font-display font-bold text-sm md:text-base transition-all ${
                tab === t.id 
                ? 'bg-[#003580] text-white shadow-md' 
                : 'text-[#5A6A8A] hover:bg-[#EEF2F7] hover:text-[#0D1B3E]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Konten Tab */}
        <div className="pb-12">
          {tab === 'scan' && <ScanTab password={token} acaraId={authAcaraId} />}
          {tab === 'cari' && <CariTab password={token} acaraId={authAcaraId} />}
          {tab === 'walkin' && <WalkinTab password={token} acaraId={authAcaraId} />}
        </div>
      </main>
    </div>
  );
}
