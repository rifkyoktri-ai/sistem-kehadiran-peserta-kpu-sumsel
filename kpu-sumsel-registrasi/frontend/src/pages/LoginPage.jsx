import React from 'react';

const LoginPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--kpu-grad-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Elemen dekoratif */}
      <div className="kpu-dots" />
      <div className="kpu-glow" />
      <div className="kpu-circle-deco" />
      <div className="kpu-corner kpu-corner-tl" />
      <div className="kpu-corner kpu-corner-tr" />
      <div className="kpu-corner kpu-corner-bl" />
      <div className="kpu-corner kpu-corner-br" />

      {/* Card Login */}
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '36px 32px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        borderTop: '3px solid var(--kpu-gold)',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Logo + Judul */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src="/logo-kpu.png" alt="KPU"
            style={{ width: '56px', height: '56px', objectFit: 'contain', margin: '0 auto 12px', display: 'block' }}
            onError={(e) => e.target.style.display = 'none'}
          />
          <div style={{
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--kpu-maroon)',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            Sistem Registrasi KPU
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>
            Provinsi Sumatera Selatan
          </div>
        </div>

        {/* Divider gold */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg,transparent,var(--kpu-gold),transparent)',
          marginBottom: '20px'
        }} />

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label className="kpu-form-label">Username</label>
            <input className="input-kpu" type="text" placeholder="Masukkan username" />
          </div>
          <div>
            <label className="kpu-form-label">Password</label>
            <input className="input-kpu" type="password" placeholder="Masukkan password" />
          </div>
          <button className="btn-kpu" style={{ width: '100%', marginTop: '4px' }}>
            Masuk
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
