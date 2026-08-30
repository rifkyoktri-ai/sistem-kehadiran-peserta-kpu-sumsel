const { inisialisasiDB } = require('./database/db');

async function seedSimulasi() {
  console.log('Menghubungkan ke database...');
  const db = await inisialisasiDB();

  console.log('Membersihkan data peserta lama khusus untuk simulasi...');
  db.prepare("DELETE FROM peserta WHERE acara_id = 'ACR-DEFAULT'").run();

  const dataDummy = [
    // INTERNAL KPU
    {
      id: 'SIM-KPU-0001',
      nomor_urut: 'KPU-0001',
      tipe_peserta: 'internal',
      nama_lengkap: 'Andika Pranata Wijaya, S.Sos.,M.Si',
      instansi: 'KPU SUMATERA SELATAN',
      kategori_instansi: 'internal_kpu',
      jabatan: 'Ketua KPU Sumatera Selatan',
      status: 'hadir',
      waktu_checkin: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 jam lalu
      adalah_walkin: 0
    },
    {
      id: 'SIM-KPU-0002',
      nomor_urut: 'KPU-0002',
      tipe_peserta: 'internal',
      nama_lengkap: 'Sari Rahmawati, S.E.',
      instansi: 'KPU SUMATERA SELATAN',
      kategori_instansi: 'internal_kpu',
      jabatan: 'Anggota KPU Sumsel',
      status: 'terdaftar',
      waktu_checkin: null,
      adalah_walkin: 0
    },
    {
      id: 'SIM-KPU-0003',
      nomor_urut: 'KPU-0003',
      tipe_peserta: 'internal',
      nama_lengkap: 'Hendri Wijaya, M.Si',
      instansi: 'KPU BANYUASIN',
      kategori_instansi: 'internal_kpu',
      jabatan: 'Sekretaris KPU Banyuasin',
      status: 'membatalkan',
      waktu_checkin: null,
      adalah_walkin: 0
    },
    // EKSTERNAL RESMI
    {
      id: 'SIM-EKS-0001',
      nomor_urut: 'EKS-0001',
      tipe_peserta: 'eksternal',
      nama_lengkap: 'Mayor Inf. Bambang Yudhoyono',
      instansi: 'KODAM II SRIWIJAYA',
      kategori_instansi: 'eksternal',
      jabatan: 'Pasi Ops Kodam',
      status: 'hadir',
      waktu_checkin: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      adalah_walkin: 0
    },
    {
      id: 'SIM-EKS-0002',
      nomor_urut: 'EKS-0002',
      tipe_peserta: 'eksternal',
      nama_lengkap: 'AKBP Hartono, S.H.',
      instansi: 'KEPOLISIAN DAERAH SUMATERA SELATAN',
      kategori_instansi: 'eksternal',
      jabatan: 'Kanit Humas Polda',
      status: 'digantikan',
      waktu_checkin: null,
      adalah_walkin: 0
    },
    {
      id: 'SIM-EKS-0003',
      nomor_urut: 'EKS-0003',
      tipe_peserta: 'eksternal',
      nama_lengkap: 'Drs. H. M. Syarif, M.Si.',
      instansi: 'BAWASLU PROVINSI SUMATERA SELATAN',
      kategori_instansi: 'eksternal',
      jabatan: 'Ketua Bawaslu Sumsel',
      status: 'hadir',
      waktu_checkin: new Date(Date.now() - 3600000 * 1).toISOString(),
      adalah_walkin: 1 // Walk-In
    },
    // INSTANSI LAINNYA (BEBAS)
    {
      id: 'SIM-LNS-0001',
      nomor_urut: 'EKS-0004',
      tipe_peserta: 'eksternal',
      nama_lengkap: 'Prof. Dr. Ir. Anis Saggaff, MS.',
      instansi: 'Universitas Sriwijaya',
      kategori_instansi: 'lainnya',
      jabatan: 'Rektor Unsri',
      status: 'hadir',
      waktu_checkin: new Date(Date.now() - 1800000).toISOString(), // 30 menit lalu
      adalah_walkin: 0
    },
    {
      id: 'SIM-LNS-0002',
      nomor_urut: 'EKS-0005',
      tipe_peserta: 'eksternal',
      nama_lengkap: 'Dr. H. Joncik Muhammad',
      instansi: 'DPRD Provinsi Sumsel',
      kategori_instansi: 'lainnya',
      jabatan: 'Wakil Ketua DPRD',
      status: 'terdaftar',
      waktu_checkin: null,
      adalah_walkin: 0
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO peserta 
      (id, acara_id, nomor_urut, tipe_peserta, nama_lengkap, instansi, kategori_instansi, jabatan, no_hp, email, status, waktu_checkin, adalah_walkin, waktu_daftar)
    VALUES (?, 'ACR-DEFAULT', ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (let i = 0; i < dataDummy.length; i++) {
      const p = dataDummy[i];
      stmt.run(
        p.id,
        p.nomor_urut,
        p.tipe_peserta,
        p.nama_lengkap,
        p.instansi,
        p.kategori_instansi,
        p.jabatan,
        `6281234567${i}`,
        p.status,
        p.waktu_checkin,
        p.adalah_walkin,
        new Date().toISOString()
      );
    }
  })();

  console.log('Seeding selesai! Silakan refresh halaman admin KPU.');
  db.close();
  process.exit(0);
}

seedSimulasi().catch(err => {
  console.error('Gagal seed:', err);
  process.exit(1);
});
