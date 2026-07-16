import { useEffect, useRef, useState } from 'react';
import { LOGOKPU_URL } from '../constants/logo';

export default function IDCard({ peserta, acaraInfo }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    if (peserta?.id) {
      import('qrcode').then((QRCode) => {
        QRCode.default.toDataURL(peserta.id, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 150,
          color: { dark: '#ffffff', light: '#3d1f0a' },
        }).then((url) => {
          setQrDataUrl(url);
        }).catch((err) => {
          console.error('Gagal membuat QR Code:', err);
        });
      });
    }
  }, [peserta]);

  if (!peserta) return null;

  const fotoUrl = peserta.foto_path ? `/${peserta.foto_path}` : null;

  return (
    <div
      id="id-card-print"
      data-id={peserta.id}
      style={{
        width: '105mm',
        height: '80mm',
        background: 'linear-gradient(180deg, #3d1f0a 0%, #2a1505 100%)',
        borderRadius: '8px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Aksen emas kiri */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: '5px',
        background: 'linear-gradient(180deg, #c9a227, #f0d060, #c9a227)',
      }} />
      {/* Aksen emas kanan */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: '5px',
        background: 'linear-gradient(180deg, #c9a227, #f0d060, #c9a227)',
      }} />

      {/* Logo + Nama Lembaga */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', marginTop: '2px' }}>
        <img src={LOGOKPU_URL} alt="KPU" style={{ width: '22px', height: '22px' }} />
        <div style={{ fontSize: '7px', textAlign: 'left', lineHeight: 1.3, color: '#f0d060' }}>
          <div style={{ fontWeight: 'bold' }}>KOMISI PEMILIHAN UMUM</div>
          <div>PROVINSI SUMATERA SELATAN</div>
        </div>
      </div>

      {/* Garis emas */}
      <div style={{ width: '100%', height: '1.5px', background: '#c9a227', marginBottom: '4px' }} />

      {/* Label PESERTA */}
      <div style={{
        fontSize: '7px', fontWeight: 'bold', textAlign: 'center',
        color: '#f0d060', letterSpacing: '1px', marginBottom: '2px'
      }}>
        PESERTA
      </div>

      {/* Nama Acara */}
      <div style={{
        fontSize: '8px', fontWeight: 'bold', textAlign: 'center',
        color: '#ffffff', lineHeight: 1.2, marginBottom: '3px', padding: '0 8px'
      }}>
        {acaraInfo?.nama_acara || (peserta.nama_acara || 'ACARA')}
      </div>

      {/* Lokasi & Tanggal */}
      <div style={{ fontSize: '6px', color: '#f0d060', marginBottom: '5px', textAlign: 'center' }}>
        {(acaraInfo?.lokasi_acara || peserta.lokasi_acara || '')} {acaraInfo?.tanggal_acara || peserta.tanggal_acara || ''}
      </div>

      {/* Konten utama: Foto + Info + QR horizontal */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', flex: 1 }}>
        {/* Foto */}
        <div style={{
          width: '25mm', height: '30mm',
          background: '#ffffff', borderRadius: '3px',
          overflow: 'hidden', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid #c9a227',
        }}>
          {fotoUrl ? (
            <img src={fotoUrl} alt="Foto"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div style={{ color: '#999', fontSize: '8px', textAlign: 'center' }}>
              NO<br/>PHOTO
            </div>
          )}
        </div>

        {/* Info + QR */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          {/* Nama */}
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: '3px' }}>
            {peserta.nama_lengkap}
          </div>

          {/* ID */}
          <div style={{ fontSize: '7px', color: '#f0d060', fontFamily: 'monospace', marginBottom: '3px' }}>
            {peserta.id}
          </div>

          {/* Jabatan & Instansi */}
          <div style={{ fontSize: '6px', color: '#cccccc', textAlign: 'center', lineHeight: 1.3, marginBottom: '5px' }}>
            {peserta.jabatan}<br/>{peserta.instansi}
          </div>

          {/* QR Code */}
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="QR Code"
              style={{ width: '18mm', height: '18mm' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
