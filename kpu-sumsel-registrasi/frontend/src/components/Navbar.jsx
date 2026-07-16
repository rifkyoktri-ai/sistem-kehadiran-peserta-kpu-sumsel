import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = ({ menuItems = [], handleLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  
  const [hoverLogout, setHoverLogout] = useState(false);

  return (
    <nav style={{
      background: 'linear-gradient(90deg, #2A0508 0%, #4A0A10 50%, #3A0708 100%)',
      borderBottom: '2px solid #C8930A',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Shimmer line atas navbar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg,transparent,rgba(255,215,0,0.4),transparent)'
      }} />

      {/* Pola titik dekoratif */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        backgroundImage: 'radial-gradient(circle, rgba(200,147,10,0.06) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 24px',
        position: 'relative',
        zIndex: 1,
        maxWidth: '1280px',
        margin: '0 auto'
      }}>
        {/* Logo */}
        <img src="/logo-kpu.png" alt="KPU"
          style={{ width: '40px', height: '40px', objectFit: 'contain', flexShrink: 0 }}
          onError={(e) => e.target.style.display = 'none'}
        />

        {/* Nama instansi */}
        <div>
          <div style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#FFD700',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            lineHeight: 1.3
          }}>
            KPU Provinsi Sumatera Selatan
          </div>
          <div style={{ fontSize: '10px', color: '#C8930A', letterSpacing: '0.3px', fontWeight: 'bold' }}>
            Sistem Registrasi Acara
          </div>
        </div>

        {/* Menu */}
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          {menuItems.map(item => (
            <button key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                fontSize: '13px',
                fontWeight: '500',
                padding: '6px 14px',
                color: isActive(item.path)
                  ? '#FFD700' : 'rgba(255,215,0,0.55)',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive(item.path)
                  ? '2px solid #FFD700' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Tombol logout */}
        <button 
          onMouseEnter={() => setHoverLogout(true)}
          onMouseLeave={() => setHoverLogout(false)}
          style={{
            fontSize: '12px',
            padding: '6px 16px',
            background: hoverLogout ? 'rgba(200,147,10,0.15)' : 'transparent',
            border: '1.5px solid rgba(200,147,10,0.5)',
            color: '#F5D060',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            fontWeight: 'bold'
          }}
          onClick={handleLogout}
        >
          Keluar
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
