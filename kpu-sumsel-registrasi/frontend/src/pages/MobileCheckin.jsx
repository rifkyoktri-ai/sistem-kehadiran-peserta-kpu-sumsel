import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { LOGOKPU_URL } from '../constants/logo';
import { INSTANSI_OPTIONS, JABATAN_OPTIONS } from '../constants/masterData';

const MobileCheckin = () => {
  const [mode, setMode] = useState('scanner');
  const [scanning, setScanning] = useState(false);
  const [peserta, setPeserta] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [manualInput, setManualInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastScan, setLastScan] = useState('');
  const [walkinPin, setWalkinPin] = useState('');
  const [walkinAcaraId, setWalkinAcaraId] = useState('');
  const [walkinAcaraList, setWalkinAcaraList] = useState([]);
  const [walkinAuthed, setWalkinAuthed] = useState(false);
  const [walkinForm, setWalkinForm] = useState({ nama_lengkap: '', instansi: '', jabatan: '', email: '', no_hp: '' });
  const [walkinFotoBase64, setWalkinFotoBase64] = useState(null);
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);
  const [walkinMsg, setWalkinMsg] = useState('');
  const [walkinHasil, setWalkinHasil] = useState(null);
  const [cameraError, setCameraError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const qrFileRef = useRef(null);

  const walkinInputStyle = {
    background:'rgba(200,147,10,0.08)',
    border:'1.5px solid rgba(200,147,10,0.4)',
    borderRadius:'10px',padding:'12px 14px',
    fontSize:'14px',color:'#FFD700',
    outline:'none',width:'100%',boxSizing:'border-box',
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setScanning(false);
  };

  const fetchPeserta = async (nomorUrut) => {
    setIsLoading(true);
    setMode('confirm');
    try {
      const res = await fetch(
        `/api/peserta/by-nomor/${encodeURIComponent(nomorUrut)}`
      );
      const data = await res.json();
      if (data.error) {
        setErrorMsg(data.error);
        setMode('error');
      } else {
        setPeserta(data.peserta || data);
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server.');
      setMode('error');
    } finally {
      setIsLoading(false);
    }
  };

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data && code.data !== lastScan) {
      setLastScan(code.data);
      stopCamera();
      fetchPeserta(code.data);
      if (navigator.vibrate) navigator.vibrate(100);
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [lastScan]);

  const startCamera = async () => {
    try {
      setCameraError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
      scanFrame();
    } catch (err) {
      setCameraError('Kamera tidak dapat diakses. Gunakan tombol "Scan dari Foto" sebagai alternatif.');
    }
  };

  const processQRImage = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code && code.data) {
          fetchPeserta(code.data);
          if (navigator.vibrate) navigator.vibrate(100);
        } else {
          setCameraError('QR Code tidak terbaca. Coba foto ulang.');
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const konfirmasiHadir = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/peserta/${peserta.id}/hadir`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' } }
      );
      const data = await res.json();
      if (data.success || data.sukses) {
        setMode('success');
        setScanCount(prev => prev + 1);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setTimeout(() => {
          setPeserta(null);
          setLastScan('');
          setMode('scanner');
          startCamera();
        }, 2500);
      } else {
        setErrorMsg(data.error || 'Gagal update kehadiran.');
        setMode('error');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server.');
      setMode('error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetScanner = () => {
    setPeserta(null);
    setErrorMsg('');
    setCameraError('');
    setLastScan('');
    setMode('scanner');
    startCamera();
  };

  const walkinSubmit = async () => {
    const { nama_lengkap, instansi, jabatan, email, no_hp } = walkinForm;
    if (!nama_lengkap || !instansi || !jabatan || !email || !no_hp) {
      setWalkinMsg('Semua field wajib diisi.');
      return;
    }
    if (!walkinFotoBase64) {
      setWalkinMsg('Foto wajib diambil.');
      return;
    }
    setWalkinSubmitting(true);
    setWalkinMsg('');
    setWalkinHasil(null);
    try {
      const resp = await fetch('/api/checkin/walkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-password': walkinPin,
          'x-acara-id': walkinAcaraId,
        },
        body: JSON.stringify({ ...walkinForm, foto_base64: walkinFotoBase64, tipe_peserta: 'internal' }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setWalkinMsg(data.pesan || data.error || 'Gagal daftar.');
        return;
      }
      setWalkinHasil(data.data);
      setWalkinMsg(data.pesan || 'Walk-in berhasil!');
    } catch {
      setWalkinMsg('Gagal terhubung ke server.');
    } finally {
      setWalkinSubmitting(false);
    }
  };

  const fetchAcaraList = async () => {
    try {
      const r = await fetch('/api/checkin/acara-aktif');
      const d = await r.json();
      const list = d.data || [];
      setWalkinAcaraList(list);
      if (list.length > 0 && !walkinAcaraId) setWalkinAcaraId(list[0].id);
    } catch {
      setWalkinAcaraList([]);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a0304',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif',
      userSelect: 'none',
    }}>
      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(90deg,#2A0508,#4A0A10,#3A0708)',
        borderBottom: '2px solid #C8930A',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0,
        position: 'relative',
      }}>
        <div style={{
          position:'absolute',inset:0,pointerEvents:'none',
          backgroundImage:'radial-gradient(circle,rgba(200,147,10,0.07) 1px,transparent 1px)',
          backgroundSize:'18px 18px',
        }}/>
        <img src={LOGOKPU_URL} alt="KPU Sumsel"
          style={{height:'32px',objectFit:'contain',position:'relative',zIndex:1}}
        />
        <div style={{position:'relative',zIndex:1,flex:1}}>
          <div style={{fontSize:'11px',fontWeight:'700',color:'#FFD700',letterSpacing:'0.5px'}}>
            KPU SUMATERA SELATAN
          </div>
          <div style={{fontSize:'9px',color:'#C8930A'}}>
            Panel Check-in Mobile
          </div>
        </div>
        <div style={{
          background:'rgba(200,147,10,0.15)',
          border:'1px solid rgba(200,147,10,0.4)',
          borderRadius:'999px',padding:'4px 10px',
          position:'relative',zIndex:1,
        }}>
          <div style={{fontSize:'8px',color:'rgba(245,208,96,0.6)',textAlign:'center'}}>
            SCAN
          </div>
          <div style={{fontSize:'14px',fontWeight:'700',color:'#FFD700',textAlign:'center',lineHeight:1}}>
            {scanCount}
          </div>
        </div>
      </div>

      {/* TAB MODE */}
      <div style={{
        display:'flex',
        background:'rgba(0,0,0,0.3)',
        borderBottom:'1px solid rgba(200,147,10,0.2)',
        flexShrink:0,
      }}>
        {[
          {id:'scanner', label:'📷 Scan QR'},
          {id:'manual', label:'⌨️ Manual'},
          {id:'walkin', label:'➕ Walk-in'},
        ].map(tab => (
          <button key={tab.id}
            onClick={() => {
              if (tab.id === 'scanner') {
                setMode('scanner');
                setTimeout(startCamera, 100);
              } else if (tab.id === 'walkin') {
                stopCamera();
                setMode('walkin');
                fetchAcaraList();
              } else {
                stopCamera();
                setMode('manual');
              }
            }}
            style={{
              flex:1, padding:'10px',
              background: mode === tab.id
                ? 'linear-gradient(135deg,#6B0F1A,#4A0A10)'
                : 'transparent',
              color: mode === tab.id ? '#FFD700' : 'rgba(200,147,10,0.5)',
              border:'none',
              borderBottom: mode === tab.id
                ? '2px solid #FFD700' : '2px solid transparent',
              fontSize:'13px', fontWeight:'600',
              cursor:'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KONTEN UTAMA */}
      <div style={{flex:1,display:'flex',flexDirection:'column',position:'relative'}}>

        {/* MODE: SCANNER */}
        {(mode === 'scanner') && (cameraError ? (
          <div style={{
            flex:1,display:'flex',flexDirection:'column',
            alignItems:'center',justifyContent:'center',
            padding:'24px',gap:'16px',
          }}>
            <div style={{
              width:'80px',height:'80px',borderRadius:'50%',
              background:'rgba(200,147,10,0.1)',
              border:'2px solid rgba(200,147,10,0.3)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:'36px',
            }}>📷</div>
            <div style={{textAlign:'center',padding:'0 16px'}}>
              <div style={{fontSize:'15px',fontWeight:'700',color:'#F5D060',marginBottom:'8px'}}>
                Kamera Tidak Tersedia
              </div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.5)',lineHeight:1.4}}>
                {cameraError}
              </div>
            </div>
            <label style={{
              background:'linear-gradient(135deg,#6B0F1A,#4A0A10)',
              border:'1.5px solid #C8930A',color:'#FFD700',
              fontSize:'14px',fontWeight:'700',padding:'14px 24px',
              borderRadius:'10px',cursor:'pointer',textAlign:'center',
            }}>
              📸 Scan dari Foto
              <input type="file" accept="image/*" capture="environment"
                ref={qrFileRef}
                style={{display:'none'}}
                onChange={e => processQRImage(e.target.files?.[0])}
              />
            </label>
            <button onClick={() => { setCameraError(''); startCamera(); }} style={{
              background:'transparent',border:'1px solid rgba(200,147,10,0.3)',
              color:'#C8930A',fontSize:'13px',fontWeight:'600',
              padding:'10px 20px',borderRadius:'8px',cursor:'pointer',
            }}>
              Coba Buka Kamera Lagi
            </button>
          </div>
        ) : (
          <div style={{flex:1,display:'flex',flexDirection:'column'}}>
            <div style={{
              position:'relative',flex:1,
              background:'#000',
              display:'flex',alignItems:'center',justifyContent:'center',
              minHeight:'60vh',
            }}>
              <video ref={videoRef}
                style={{
                  width:'100%',height:'100%',
                  objectFit:'cover',
                  position:'absolute',inset:0,
                }}
                playsInline muted
              />
              <div style={{
                position:'absolute',
                width:'220px',height:'220px',
                border:'2px solid rgba(200,147,10,0.3)',
                borderRadius:'12px',
              }}>
                {[
                  {top:'-3px',left:'-3px',borderTop:'3px solid #FFD700',borderLeft:'3px solid #FFD700',borderRadius:'4px 0 0 0'},
                  {top:'-3px',right:'-3px',borderTop:'3px solid #FFD700',borderRight:'3px solid #FFD700',borderRadius:'0 4px 0 0'},
                  {bottom:'-3px',left:'-3px',borderBottom:'3px solid #FFD700',borderLeft:'3px solid #FFD700',borderRadius:'0 0 0 4px'},
                  {bottom:'-3px',right:'-3px',borderBottom:'3px solid #FFD700',borderRight:'3px solid #FFD700',borderRadius:'0 0 4px 0'},
                ].map((s,i) => (
                  <div key={i} style={{position:'absolute',width:'20px',height:'20px',...s}}/>
                ))}
                <div style={{
                  position:'absolute',left:'4px',right:'4px',
                  height:'2px',
                  background:'linear-gradient(90deg,transparent,#FFD700,transparent)',
                  animation:'scanline 2s linear infinite',
                  top:'50%',
                }}/>
              </div>
              <div style={{
                position:'absolute',bottom:'20px',
                background:'rgba(0,0,0,0.7)',
                padding:'8px 16px',borderRadius:'999px',
                fontSize:'13px',color:'rgba(255,255,255,0.8)',
              }}>
                Arahkan QR Code ke dalam kotak
              </div>
            </div>
            <canvas ref={canvasRef} style={{display:'none'}}/>
          </div>
        ))}

        {/* MODE: CONFIRM */}
        {mode === 'confirm' && (
          <div style={{
            flex:1,padding:'20px 16px',
            display:'flex',flexDirection:'column',gap:'16px',
          }}>
            {isLoading ? (
              <div style={{
                flex:1,display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',gap:'12px',
              }}>
                <div style={{
                  width:'40px',height:'40px',borderRadius:'50%',
                  border:'3px solid rgba(200,147,10,0.2)',
                  borderTop:'3px solid #C8930A',
                  animation:'spin 0.8s linear infinite',
                }}/>
                <div style={{color:'rgba(245,208,96,0.6)',fontSize:'13px'}}>
                  Mencari data peserta...
                </div>
              </div>
            ) : peserta && (
              <>
                <div style={{
                  background:'linear-gradient(135deg,#2A0508,#3A0708)',
                  border:'1px solid rgba(200,147,10,0.3)',
                  borderRadius:'12px',padding:'16px',
                  display:'flex',gap:'14px',alignItems:'flex-start',
                }}>
                  <div style={{
                    width:'80px',height:'95px',
                    border:'2px solid #C8930A',borderRadius:'6px',
                    overflow:'hidden',background:'#1a0304',
                    flexShrink:0,display:'flex',
                    alignItems:'center',justifyContent:'center',
                  }}>
                    {peserta.foto_path ? (
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/${peserta.foto_path}`}
                        alt="Foto"
                        style={{width:'100%',height:'100%',objectFit:'cover'}}
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <span style={{fontSize:'28px',opacity:0.3}}>👤</span>
                    )}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{
                      fontSize:'8px',color:'rgba(200,147,10,0.6)',
                      letterSpacing:'1px',textTransform:'uppercase',marginBottom:'4px',
                    }}>
                      Data Peserta
                    </div>
                    <div style={{
                      fontSize:'17px',fontWeight:'700',
                      color:'#fff',lineHeight:1.2,marginBottom:'6px',
                    }}>
                      {peserta.nama}
                    </div>
                    <div style={{
                      display:'inline-block',
                      background:'rgba(200,147,10,0.15)',
                      border:'1px solid rgba(200,147,10,0.4)',
                      color:'#FFD700',fontSize:'11px',fontWeight:'700',
                      padding:'2px 8px',borderRadius:'4px',
                      fontFamily:'monospace',marginBottom:'8px',
                    }}>
                      {peserta.nomor_urut}
                    </div>
                    <div style={{fontSize:'12px',color:'#E8C97A',marginBottom:'3px'}}>
                      {peserta.jabatan}
                    </div>
                    <div style={{fontSize:'11px',color:'rgba(255,255,255,0.6)'}}>
                      {peserta.instansi}
                    </div>
                    <div style={{marginTop:'8px'}}>
                      {peserta.status === 'hadir' ? (
                        <span style={{
                          background:'rgba(21,128,61,0.15)',
                          border:'1px solid rgba(21,128,61,0.4)',
                          color:'#4ade80',fontSize:'11px',fontWeight:'600',
                          padding:'3px 10px',borderRadius:'999px',
                        }}>
                          ✓ Sudah Hadir
                        </span>
                      ) : (
                        <span style={{
                          background:'rgba(200,147,10,0.12)',
                          border:'1px solid rgba(200,147,10,0.3)',
                          color:'#F5D060',fontSize:'11px',fontWeight:'600',
                          padding:'3px 10px',borderRadius:'999px',
                        }}>
                          Belum Hadir
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {peserta.status === 'hadir' ? (
                  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    <div style={{
                      background:'rgba(21,128,61,0.1)',border:'1px solid rgba(21,128,61,0.3)',
                      borderRadius:'10px',padding:'14px',textAlign:'center',
                      color:'#4ade80',fontSize:'14px',fontWeight:'600',
                    }}>
                      ✓ Peserta ini sudah tercatat hadir
                    </div>
                    <button onClick={resetScanner} style={{
                      background:'linear-gradient(135deg,#6B0F1A,#4A0A10)',
                      border:'1.5px solid #C8930A',
                      color:'#FFD700',fontSize:'15px',fontWeight:'700',
                      padding:'14px',borderRadius:'10px',cursor:'pointer',
                    }}>
                      Scan Berikutnya
                    </button>
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    <button
                      onClick={konfirmasiHadir}
                      disabled={isLoading}
                      style={{
                        background:'linear-gradient(135deg,#14532d,#166534)',
                        border:'1.5px solid rgba(74,222,128,0.4)',
                        color:'#4ade80',fontSize:'16px',fontWeight:'700',
                        padding:'16px',borderRadius:'10px',cursor:'pointer',
                        opacity: isLoading ? 0.7 : 1,
                      }}
                    >
                      {isLoading ? 'Memproses...' : '✓ Konfirmasi Hadir'}
                    </button>
                    <button onClick={resetScanner} style={{
                      background:'transparent',
                      border:'1.5px solid rgba(200,147,10,0.4)',
                      color:'#C8930A',fontSize:'14px',fontWeight:'600',
                      padding:'12px',borderRadius:'10px',cursor:'pointer',
                    }}>
                      Batalkan
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* MODE: SUCCESS */}
        {mode === 'success' && (
          <div style={{
            flex:1,display:'flex',flexDirection:'column',
            alignItems:'center',justifyContent:'center',
            padding:'24px',gap:'16px',
          }}>
            <div style={{
              width:'80px',height:'80px',borderRadius:'50%',
              background:'rgba(21,128,61,0.15)',
              border:'2px solid rgba(74,222,128,0.4)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:'36px',
            }}>✓</div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'20px',fontWeight:'700',color:'#4ade80',marginBottom:'8px'}}>
                Kehadiran Tercatat!
              </div>
              <div style={{fontSize:'15px',color:'#fff',marginBottom:'4px'}}>
                {peserta?.nama}
              </div>
              <div style={{fontSize:'13px',color:'rgba(255,255,255,0.5)'}}>
                {peserta?.nomor_urut}
              </div>
            </div>
            <div style={{fontSize:'12px',color:'rgba(200,147,10,0.6)'}}>
              Kembali ke scanner otomatis...
            </div>
          </div>
        )}

        {/* MODE: ERROR */}
        {mode === 'error' && (
          <div style={{
            flex:1,display:'flex',flexDirection:'column',
            alignItems:'center',justifyContent:'center',
            padding:'24px',gap:'16px',
          }}>
            <div style={{
              width:'80px',height:'80px',borderRadius:'50%',
              background:'rgba(220,38,38,0.1)',
              border:'2px solid rgba(220,38,38,0.3)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:'36px',
            }}>✗</div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'18px',fontWeight:'700',color:'#f87171',marginBottom:'8px'}}>
                Peserta Tidak Ditemukan
              </div>
              <div style={{fontSize:'13px',color:'rgba(255,255,255,0.5)'}}>
                {errorMsg}
              </div>
            </div>
            <button onClick={resetScanner} style={{
              background:'linear-gradient(135deg,#6B0F1A,#4A0A10)',
              border:'1.5px solid #C8930A',
              color:'#FFD700',fontSize:'15px',fontWeight:'700',
              padding:'14px 32px',borderRadius:'10px',cursor:'pointer',
            }}>
              Coba Lagi
            </button>
          </div>
        )}

        {/* MODE: MANUAL INPUT */}
        {mode === 'manual' && (
          <div style={{flex:1,padding:'20px 16px',display:'flex',flexDirection:'column',gap:'16px'}}>
            <div style={{fontSize:'13px',color:'rgba(245,208,96,0.7)'}}>
              Masukkan nomor urut peserta secara manual
            </div>
            <input
              value={manualInput}
              onChange={e => setManualInput(e.target.value.toUpperCase())}
              placeholder="Contoh: KPU-0001 atau EKS-0001"
              style={{
                background:'rgba(200,147,10,0.08)',
                border:'1.5px solid rgba(200,147,10,0.4)',
                borderRadius:'10px',padding:'14px 16px',
                fontSize:'16px',color:'#FFD700',
                fontFamily:'monospace',letterSpacing:'1px',
                outline:'none',width:'100%',boxSizing:'border-box',
              }}
            />
            <button
              onClick={() => {
                if (manualInput.trim()) {
                  fetchPeserta(manualInput.trim());
                }
              }}
              style={{
                background:'linear-gradient(135deg,#6B0F1A,#4A0A10)',
                border:'1.5px solid #C8930A',
                color:'#FFD700',fontSize:'15px',fontWeight:'700',
                padding:'14px',borderRadius:'10px',cursor:'pointer',
              }}
            >
              Cari Peserta
            </button>
          </div>
        )}

        {/* MODE: WALKIN */}
        {mode === 'walkin' && (
          <div style={{flex:1,padding:'16px',display:'flex',flexDirection:'column',gap:'12px',overflowY:'auto'}}>

            {!walkinAuthed ? (
              <>
                <div style={{fontSize:'15px',fontWeight:'700',color:'#FFD700',textAlign:'center',marginBottom:'8px'}}>
                  🔐 Masuk Walk-in
                </div>
                <div style={{fontSize:'12px',color:'rgba(245,208,96,0.6)',textAlign:'center',marginBottom:'12px'}}>
                  Masukkan password petugas untuk mengaktifkan walk-in
                </div>

                {walkinAcaraList.length > 0 && (
                  <div>
                    <div style={{fontSize:'11px',color:'rgba(245,208,96,0.7)',marginBottom:'6px'}}>Pilih Acara</div>
                    <select value={walkinAcaraId} onChange={e => setWalkinAcaraId(e.target.value)}
                      style={{
                        width:'100%',padding:'12px 14px',borderRadius:'10px',
                        background:'rgba(200,147,10,0.08)',border:'1.5px solid rgba(200,147,10,0.4)',
                        color:'#FFD700',fontSize:'14px',outline:'none',
                      }}>
                      {walkinAcaraList.map(a => (
                        <option key={a.id} value={a.id} style={{background:'#1a0304',color:'#FFD700'}}>
                          {a.nama_acara} ({a.kode_acara})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <input type="password" value={walkinPin} onChange={e => setWalkinPin(e.target.value)}
                  placeholder="Password petugas"
                  style={{
                    background:'rgba(200,147,10,0.08)',border:'1.5px solid rgba(200,147,10,0.4)',
                    borderRadius:'10px',padding:'14px 16px',fontSize:'16px',color:'#FFD700',
                    outline:'none',width:'100%',boxSizing:'border-box',textAlign:'center',
                    letterSpacing:'3px',fontFamily:'monospace',
                  }}
                />
                <button onClick={() => {
                  if (!walkinPin || (walkinAcaraList.length > 0 && !walkinAcaraId)) {
                    setWalkinMsg('Isi password dan pilih acara.');
                    return;
                  }
                  setWalkinAuthed(true);
                  setWalkinMsg('');
                }} style={{
                  background:'linear-gradient(135deg,#6B0F1A,#4A0A10)',
                  border:'1.5px solid #C8930A',color:'#FFD700',fontSize:'15px',fontWeight:'700',
                  padding:'14px',borderRadius:'10px',cursor:'pointer',
                }}>
                  Masuk
                </button>
              </>
            ) : (
              <>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{fontSize:'15px',fontWeight:'700',color:'#FFD700'}}>➕ Walk-in Baru</div>
                  <button onClick={() => { setWalkinAuthed(false); setWalkinPin(''); setWalkinMsg(''); setWalkinHasil(null); }}
                    style={{background:'transparent',border:'1px solid rgba(200,147,10,0.3)',color:'#C8930A',fontSize:'12px',padding:'6px 12px',borderRadius:'6px',cursor:'pointer'}}>
                    Logout
                  </button>
                </div>

                {walkinHasil && (
                  <div style={{
                    background:'rgba(21,128,61,0.1)',border:'1px solid rgba(74,222,128,0.3)',
                    borderRadius:'10px',padding:'14px',textAlign:'center',
                  }}>
                    <div style={{fontSize:'36px',marginBottom:'6px'}}>✅</div>
                    <div style={{fontSize:'15px',fontWeight:'700',color:'#4ade80',marginBottom:'4px'}}>
                      {walkinMsg}
                    </div>
                    <div style={{fontSize:'13px',color:'#fff',fontWeight:'600'}}>{walkinHasil?.nama_lengkap}</div>
                    <div style={{fontSize:'11px',color:'rgba(255,255,255,0.5)',fontFamily:'monospace',marginTop:'2px'}}>
                      {walkinHasil?.nomor_urut} — {walkinHasil?.id}
                    </div>
                    <button onClick={() => { setWalkinHasil(null); setWalkinMsg(''); setWalkinForm({nama_lengkap:'',instansi:'',jabatan:'',email:'',no_hp:''}); setWalkinFotoBase64(null); }}
                      style={{
                        background:'linear-gradient(135deg,#6B0F1A,#4A0A10)',border:'1.5px solid #C8930A',
                        color:'#FFD700',fontSize:'13px',fontWeight:'700',padding:'10px 20px',borderRadius:'8px',cursor:'pointer',marginTop:'10px',
                      }}>
                      Daftar Lagi
                    </button>
                  </div>
                )}

                {!walkinHasil && (
                  <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                    {walkinMsg && (
                      <div style={{
                        background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.3)',
                        borderRadius:'8px',padding:'10px',fontSize:'12px',color:'#f87171',textAlign:'center',
                      }}>{walkinMsg}</div>
                    )}
                    <input placeholder="Nama Lengkap *" value={walkinForm.nama_lengkap}
                      onChange={e => setWalkinForm(p => ({...p, nama_lengkap: e.target.value}))}
                      style={walkinInputStyle} />
                    <select value={walkinForm.instansi} onChange={e => setWalkinForm(p => ({...p, instansi: e.target.value}))}
                      style={{...walkinInputStyle, color: walkinForm.instansi ? '#FFD700' : 'rgba(200,147,10,0.4)'}}>
                      <option value="" style={{background:'#1a0304',color:'rgba(200,147,10,0.4)'}}>-- Pilih Instansi * --</option>
                      {INSTANSI_OPTIONS.map(i => (
                        <option key={i} value={i} style={{background:'#1a0304',color:'#FFD700'}}>{i}</option>
                      ))}
                    </select>
                    <select value={walkinForm.jabatan} onChange={e => setWalkinForm(p => ({...p, jabatan: e.target.value}))}
                      style={{...walkinInputStyle, color: walkinForm.jabatan ? '#FFD700' : 'rgba(200,147,10,0.4)'}}>
                      <option value="" style={{background:'#1a0304',color:'rgba(200,147,10,0.4)'}}>-- Pilih Jabatan * --</option>
                      {JABATAN_OPTIONS.map(j => (
                        <option key={j} value={j} style={{background:'#1a0304',color:'#FFD700'}}>{j}</option>
                      ))}
                    </select>
                    <input placeholder="Email *" type="email" value={walkinForm.email}
                      onChange={e => setWalkinForm(p => ({...p, email: e.target.value}))}
                      style={walkinInputStyle} />
                    <input placeholder="No. HP *" type="tel" value={walkinForm.no_hp}
                      onChange={e => setWalkinForm(p => ({...p, no_hp: e.target.value}))}
                      style={walkinInputStyle} />
                    <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                      <div style={{fontSize:'11px',color:'rgba(245,208,96,0.7)'}}>Foto Wajah *</div>
                      {walkinFotoBase64 ? (
                        <div style={{position:'relative'}}>
                          <img src={walkinFotoBase64} alt="foto" style={{width:'100%',borderRadius:'10px',maxHeight:'200px',objectFit:'cover'}} />
                          <button onClick={() => setWalkinFotoBase64(null)}
                            style={{position:'absolute',top:'8px',right:'8px',background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',fontSize:'16px',borderRadius:'50%',width:'30px',height:'30px',cursor:'pointer'}}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label style={{
                          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                          border:'1.5px dashed rgba(200,147,10,0.4)',borderRadius:'10px',padding:'20px',
                          cursor:'pointer',background:'rgba(200,147,10,0.05)',
                        }}>
                          <span style={{fontSize:'28px',marginBottom:'6px'}}>📷</span>
                          <span style={{fontSize:'13px',color:'rgba(245,208,96,0.7)'}}>Ambil Foto</span>
                          <input type="file" accept="image/*" capture="environment"
                            style={{display:'none'}}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = ev => setWalkinFotoBase64(ev.target.result);
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <button onClick={walkinSubmit} disabled={walkinSubmitting} style={{
                      background:'linear-gradient(135deg,#14532d,#166534)',
                      border:'1.5px solid rgba(74,222,128,0.4)',color:'#4ade80',
                      fontSize:'16px',fontWeight:'700',padding:'16px',borderRadius:'10px',cursor:'pointer',
                      opacity: walkinSubmitting ? 0.7 : 1,marginTop:'4px',
                    }}>
                      {walkinSubmitting ? 'Memproses...' : '✓ Daftarkan & Check-in'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes scanline {
          0% { top: 10%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MobileCheckin;
