import { useState, useRef } from 'react';
import TombolPrimer from './TombolPrimer';

export default function QRScanner({ onScan }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [torch, setTorch] = useState(false);
  const readerRef = useRef(null);
  const scannerRef = useRef(null);

  const mulaiScan = async () => {
    setError('');
    setStatus('loading');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader-container');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 24,
          disableFlip: true,
          aspectRatio: 1.333,
        },
        (decodedText) => {
          scanner.stop().catch(() => {});
          setTorch(false);
          setStatus('idle');
          if (onScan) onScan(decodedText);
        },
        () => {}
      );
      setStatus('scanning');
    } catch (err) {
      let msg = 'Gagal mengakses kamera.';
      if (err.message?.includes('NotAllowedError') || err.name === 'NotAllowedError') {
        msg = 'Izin kamera ditolak. Izinkan akses kamera di pengaturan browser.';
      } else if (err.message?.includes('NotFoundError')) {
        msg = 'Tidak ada kamera yang terdeteksi.';
      }
      setError(msg);
      setStatus('idle');
    }
  };

  const hentikanScan = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    setTorch(false);
    setStatus('idle');
    setError('');
  };

  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      await scannerRef.current.toggleTorch();
      setTorch((prev) => !prev);
    } catch {
      // Torch tidak didukung perangkat
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card p-8 mx-auto max-w-lg mt-4 border border-[#E2E8F0]">
      {/* Container Kotak Kamera */}
      <div 
        className="relative mx-auto max-w-[320px] overflow-hidden flex items-center justify-center min-h-[250px] cursor-pointer"
        style={{
          background: status === 'idle' ? '#1a1a1a' : '#000',
          border: status === 'idle' ? '2px dashed rgba(200,147,10,0.3)' : '2px solid rgba(200,147,10,0.5)',
          borderRadius: '8px'
        }}
        onClick={() => { if(status === 'idle') mulaiScan() }}
      >
        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none p-4 text-center">
            <i className="ti ti-camera mb-3" style={{ fontSize: '48px', color: 'rgba(200,147,10,0.4)' }}></i>
            <p style={{ color: 'rgba(200,147,10,0.5)', fontSize: '14px', fontWeight: 'bold' }}>Klik untuk mengaktifkan kamera</p>
            <p className="mt-1" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Arahkan QR Code ke kamera</p>
          </div>
        )}

        {/* Sudut-sudut emas sebagai panduan scan */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#C8972A] -translate-x-[2px] -translate-y-[2px] z-10 rounded-tl"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#C8972A] translate-x-[2px] -translate-y-[2px] z-10 rounded-tr"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#C8972A] -translate-x-[2px] translate-y-[2px] z-10 rounded-bl"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#C8972A] translate-x-[2px] translate-y-[2px] z-10 rounded-br"></div>
        
        {/* Scanning indicator */}
        {status === 'scanning' && (
          <div className="absolute inset-x-6 h-0.5 bg-[#C8972A]/60 z-10 animate-[scanPulse_1.5s_ease-in-out_infinite] pointer-events-none"></div>
        )}
        
        <div id="qr-reader-container" ref={readerRef} className="w-full relative z-10" />
      </div>

      <div className="mt-6 flex justify-center gap-3">
        {status === 'idle' && !error && (
          <TombolPrimer onClick={mulaiScan} varian="outline" ukuran="md">
            Mulai Scan QR
          </TombolPrimer>
        )}

        {status === 'loading' && (
          <p className="text-[#5A6A8A] py-2 font-body font-medium animate-pulse">Mengakses kamera...</p>
        )}

        {status === 'scanning' && (
          <>
            <TombolPrimer onClick={toggleTorch} varian={torch ? 'primer' : 'outline-abu'} ukuran="md">
              {torch ? '🔦 Matikan Lampu' : '🔦 Lampu'}
            </TombolPrimer>
            <TombolPrimer onClick={hentikanScan} varian="bahaya" ukuran="md">
              Hentikan
            </TombolPrimer>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 text-center">
          <p className="text-sm text-[#B91C1C] bg-[#FEE2E2] rounded-lg px-4 py-3 mb-3">{error}</p>
          <TombolPrimer onClick={mulaiScan} varian="outline" ukuran="sm">
            Coba Lagi
          </TombolPrimer>
        </div>
      )}
    </div>
  );
}
