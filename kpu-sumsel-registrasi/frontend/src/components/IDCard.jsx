import { useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { LOGOKPU_URL } from '../constants/logo';

function formatNomorUrut(nomor, tipe) {
  if (!nomor) return '-';
  if (String(nomor).includes('-')) return String(nomor);
  const prefix = tipe === 'internal' ? 'KPU' : 'EKS';
  return `${prefix}-${String(nomor).padStart(4, '0')}`;
}

export default function IDCard({ peserta, acaraInfo }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [fotoError, setFotoError] = useState(false);

  useEffect(() => {
    if (peserta?.nomor_urut) {
      QRCode.toDataURL(String(peserta.nomor_urut), {
        width: 64,
        margin: 1,
        color: { dark: '#3D0C0C', light: '#FFFFFF' },
      }).then(url => setQrDataUrl(url));
    }
  }, [peserta?.nomor_urut]);

  const handleFotoError = useCallback(() => setFotoError(true), []);

  if (!peserta) return null;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  const fotoUrl = peserta.foto_path && !fotoError
    ? `${apiBase}/${peserta.foto_path}`
    : null;

  const isInternal = peserta.tipe_peserta === 'internal';

  const nomorDisplay = formatNomorUrut(
    peserta.nomor_urut,
    peserta.tipe_peserta
  );

  return (
    <div
      id="id-card-print"
      style={{
        width: '378px',
        height: '535px',
        background: '#3D0C0C',
        borderRadius: '10px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif',
        position: 'relative',
      }}
    >
      {/* ── STRIPE EMAS ATAS ── */}
      <div style={{
        height: '6px',
        background: 'linear-gradient(90deg,#4A2800,#C8930A,#FFD700,#FFFACD,#FFD700,#C8930A,#4A2800)',
        flexShrink: 0,
      }} />

      {/* ── HEADER: Logo + Nama Lembaga ── */}
      <div style={{
        padding: '12px 16px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'linear-gradient(180deg,#2A0606 0%,#3D0C0C 100%)',
        borderBottom: '1px solid rgba(200,147,10,0.35)',
        flexShrink: 0,
      }}>
        <img
          src={LOGOKPU_URL}
          alt="Logo KPU"
          style={{ width: '42px', height: '42px', objectFit: 'contain', flexShrink: 0 }}
        />
        <div>
          <div style={{
            fontSize: '10.5px', fontWeight: 'bold', color: '#FFD700',
            letterSpacing: '0.8px', textTransform: 'uppercase', lineHeight: 1.3,
          }}>
            Komisi Pemilihan Umum
          </div>
          <div style={{
            fontSize: '8.5px', color: '#C8930A',
            letterSpacing: '0.4px', textTransform: 'uppercase',
            lineHeight: 1.3, marginTop: '1px',
          }}>
            Provinsi Sumatera Selatan
          </div>
        </div>
      </div>

      {/* ── SECTION ACARA ── */}
      <div style={{
        background: 'rgba(0,0,0,0.5)',
        padding: '9px 16px 8px',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: '7.5px', color: '#C8930A',
          letterSpacing: '4px', textTransform: 'uppercase',
          fontWeight: 'bold', marginBottom: '5px',
        }}>
          — PESERTA —
        </div>
        <div style={{
          fontSize: '12.5px', fontWeight: 'bold', color: '#fff',
          textTransform: 'uppercase', letterSpacing: '0.3px', lineHeight: 1.45,
        }}>
          {acaraInfo?.nama_acara || 'NAMA ACARA'}
        </div>
        <div style={{
          marginTop: '4px', fontSize: '9px',
          color: '#FFD700', letterSpacing: '0.5px', fontWeight: 'bold',
        }}>
          Palembang, {acaraInfo?.tanggal || acaraInfo?.tanggal_acara || ''}
        </div>
      </div>

      {/* ── FOTO PESERTA ── */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        padding: '13px 16px 0',
        flexShrink: 0,
      }}>
        <div style={{ position: 'relative', width: '140px', height: '165px' }}>
          <div style={{
            width: '140px', height: '165px',
            border: '3px solid #C8930A',
            borderRadius: '6px',
            background: '#2A0606',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt="Foto Peserta"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                crossOrigin="anonymous"
                onError={handleFotoError}
              />
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '8px',
                color: 'rgba(200,147,10,0.35)',
                fontSize: '12px',
              }}>
                📷
                <span style={{ fontSize: '9px', letterSpacing: '2px' }}>FOTO</span>
              </div>
            )}
          </div>
          {/* Ornamen sudut emas */}
          {[
            { top: '-4px', left: '-4px', borderTop: '3px solid #FFD700', borderLeft: '3px solid #FFD700', borderRadius: '2px 0 0 0' },
            { top: '-4px', right: '-4px', borderTop: '3px solid #FFD700', borderRight: '3px solid #FFD700', borderRadius: '0 2px 0 0' },
            { bottom: '-4px', left: '-4px', borderBottom: '3px solid #FFD700', borderLeft: '3px solid #FFD700', borderRadius: '0 0 0 2px' },
            { bottom: '-4px', right: '-4px', borderBottom: '3px solid #FFD700', borderRight: '3px solid #FFD700', borderRadius: '0 0 2px 0' },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: '16px', height: '16px', ...s }} />
          ))}
        </div>
      </div>

      {/* ── INFO PESERTA ── */}
      <div style={{
        padding: '11px 20px 9px',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: '16px', fontWeight: 'bold',
          color: '#fff', letterSpacing: '0.5px',
          lineHeight: 1.3, marginBottom: '3px',
        }}>
          {peserta.nama}
        </div>
        <div style={{
          fontSize: '9px', color: '#C8930A',
          fontWeight: 'bold', letterSpacing: '1.5px',
          textTransform: 'uppercase', marginBottom: '8px',
        }}>
          {peserta.jabatan}
        </div>
        <div style={{ height: '1px', background: 'rgba(200,147,10,0.3)', marginBottom: '8px' }} />

        {/* Panel Unit Kerja + Tipe */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            background: 'rgba(200,147,10,0.12)',
            border: '1px solid rgba(200,147,10,0.35)',
            borderRadius: '4px 0 0 4px',
            padding: '5px 14px',
            borderRight: 'none',
          }}>
            <div style={{
              fontSize: '7px', color: 'rgba(200,147,10,0.6)',
              textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px',
            }}>
              {isInternal ? 'Unit Kerja' : 'Instansi'}
            </div>
            <div style={{ fontSize: '9px', color: '#fff', fontWeight: 'bold' }}>
              {peserta.instansi}
            </div>
          </div>
          <div style={{
            background: 'rgba(200,147,10,0.12)',
            border: '1px solid rgba(200,147,10,0.35)',
            borderRadius: '0 4px 4px 0',
            padding: '5px 14px',
          }}>
            <div style={{
              fontSize: '7px', color: 'rgba(200,147,10,0.6)',
              textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px',
            }}>
              Tipe
            </div>
            <div style={{ fontSize: '9px', color: '#FFD700', fontWeight: 'bold' }}>
              {isInternal ? 'Internal KPU' : 'Eksternal'}
            </div>
          </div>
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div style={{
        margin: '0 16px', height: '1px',
        background: 'linear-gradient(90deg,transparent,rgba(200,147,10,0.5),rgba(255,215,0,0.7),rgba(200,147,10,0.5),transparent)',
        flexShrink: 0,
      }} />

      {/* ── QR CODE + NOMOR ── */}
      <div style={{
        background: 'rgba(0,0,0,0.45)',
        padding: '11px 16px 13px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '5px',
          padding: '5px',
          border: '2px solid #C8930A',
          flexShrink: 0,
        }}>
          {/* FIX 1 — QR sebagai <img> data URL */}
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="QR Code"
              width={64}
              height={64}
              style={{ display: 'block' }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '7px', color: 'rgba(200,147,10,0.55)',
            textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '3px',
          }}>
            Nomor Peserta
          </div>
          <div style={{
            fontSize: '17px', fontWeight: 'bold',
            color: '#FFD700',
            fontFamily: "'Courier New', monospace",
            letterSpacing: '3px', lineHeight: 1,
          }}>
            {nomorDisplay}
          </div>
          <div style={{
            marginTop: '5px', display: 'flex',
            alignItems: 'center', gap: '5px',
          }}>
            <div style={{
              width: '6px', height: '6px',
              borderRadius: '50%', background: '#4CAF50', flexShrink: 0,
            }} />
            <span style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.5px' }}>
              Terverifikasi · Scan untuk hadir
            </span>
          </div>
        </div>
      </div>

      {/* ── STRIPE EMAS BAWAH ── */}
      <div style={{
        height: '6px',
        background: 'linear-gradient(90deg,#4A2800,#C8930A,#FFD700,#FFFACD,#FFD700,#C8930A,#4A2800)',
        flexShrink: 0,
      }} />

      {/* ── AKSEN GARIS VERTIKAL KIRI & KANAN ── */}
      {['left', 'right'].map((side) => (
        <div key={side} style={{
          position: 'absolute',
          [side]: '5px',
          top: '68px',
          bottom: '6px',
          width: '2px',
          background: 'linear-gradient(180deg,transparent,rgba(200,147,10,0.25),rgba(255,215,0,0.4),rgba(200,147,10,0.25),transparent)',
          pointerEvents: 'none',
        }} />
      ))}
    </div>
  );
}
