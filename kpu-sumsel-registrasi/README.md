# Sistem Registrasi Acara — KPU Provinsi Sumatera Selatan

Sistem registrasi peserta acara institusional berbasis web untuk KPU Provinsi Sumatera Selatan.
Mendukung 100–500 peserta dengan fitur registrasi online, check-in hari-H via QR Code, dan dashboard admin.

---

## Cara Instalasi

### Prasyarat
- Node.js versi 18 atau lebih baru
- npm

### 1. Clone repositori
```bash
git clone <url-repository>
cd kpu-sumsel-registrasi
```

### 2. Setup Backend
```bash
cd backend
npm install
```

### 3. Buat file .env
```bash
cp .env.example .env
```
Edit `.env` sesuai kebutuhan (opsional untuk development).

### 4. Setup Frontend
```bash
cd frontend
npm install
```

---

## Cara Menjalankan

### Jalankan Backend (Terminal 1)
```bash
cd backend
npm run dev
```
Server berjalan di: `http://localhost:3001`

### Jalankan Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Aplikasi berjalan di: `http://localhost:5173`

---

## Password Default

> ⚠️ **WAJIB diganti sebelum deploy ke produksi!**

| Level   | Password Default      | Lokasi File                        |
|---------|-----------------------|------------------------------------|
| Petugas | `KPU2026checkin`      | `backend/constants/index.js`       |
| Admin   | `KPUAdmin@Sumsel26`   | `backend/constants/index.js`       |

Password dikirim via HTTP header: `x-password`

---

## Struktur Folder

```
kpu-sumsel-registrasi/
├── backend/
│   ├── constants/    ← semua konstanta (password, status, aksi)
│   ├── database/     ← koneksi & migrasi SQLite
│   ├── middleware/   ← autentikasi petugas & admin
│   ├── routes/       ← endpoint API (peserta, checkin, admin)
│   └── server.js     ← entry point
├── frontend/
│   └── src/
│       ├── pages/      ← halaman utama
│       ├── components/ ← komponen reusable
│       ├── utils/      ← logika bisnis & helper
│       ├── context/    ← state management global
│       └── constants/  ← URL API & konfigurasi UI
└── docs/             ← panduan admin, petugas, & dokumentasi DB
```

---

## Daftar Endpoint API

### Publik (tanpa autentikasi)
| Method | Endpoint                | Deskripsi              |
|--------|-------------------------|------------------------|
| GET    | /api/acara/info         | Info acara & kuota     |
| POST   | /api/peserta/daftar     | Registrasi peserta baru |
| GET    | /api/peserta/cek/:email | Cek status by email    |
| GET    | /api/peserta/info/:id   | Detail peserta by ID   |

### Petugas (header: x-password)
| Method | Endpoint                 | Deskripsi              |
|--------|--------------------------|------------------------|
| POST   | /api/checkin/validasi    | Validasi peserta       |
| POST   | /api/checkin/tandai-hadir| Check-in peserta       |
| POST   | /api/checkin/walkin      | Daftar & check-in      |
| POST   | /api/checkin/cetak-ulang | Log cetak ulang        |

### Admin (header: x-password)
| Method | Endpoint                | Deskripsi                   |
|--------|-------------------------|-----------------------------|
| GET    | /api/admin/peserta      | Daftar semua peserta        |
| GET    | /api/admin/rekap        | Statistik dashboard         |
| PUT    | /api/admin/peserta/:id  | Edit data peserta           |
| POST   | /api/admin/batalkan/:id | Batalkan peserta            |
| POST   | /api/admin/ganti-peserta| Proses penggantian peserta  |
| GET    | /api/admin/export-csv   | Export CSV                  |
| GET    | /api/admin/audit-log    | Riwayat semua aksi          |
| PUT    | /api/admin/pengaturan   | Update pengaturan acara     |
