# Rencana Perbaikan: "Tidak dapat terhubung ke server" — Sistem Registrasi KPU Sumsel

## Diagnosa

- Backend berjalan sehat di **port 8080** (`backend/.env` PORT=8080, `backend/ecosystem.config.js`, verified via `GET /api/ping` → 200, DB terhubung).
- Frontend dev server (Vite, port 5173) masih dikonfigurasi menuju port lama **3001** yang tidak lagi dipakai → fetch `/api/admin/login` gagal → pesan "Tidak dapat terhubung ke server."
- Sumber masalah (semua rujukan `3001` yang sudah usang):
  1. `frontend/vite.config.js` — proxy `/api` & `/uploads` → `http://localhost:3001`
  2. `frontend/.env.development` — `VITE_API_URL=http://localhost:3001/api`
  3. `frontend/src/pages/MobileCheckin.jsx` baris 679 — fallback `'http://localhost:3001'`
  4. `frontend/src/utils/printIDCard.js` baris 10 — fallback `'http://localhost:3001/api'`
  5. `ecosystem.config.js` (root) — `PORT: 3001`
  6. `backend/.env.production` — `PORT=3001`

## Perubahan (6 file)

| # | File | Baris | Lama | Baru |
|---|------|-------|------|------|
| 1 | `kpu-sumsel-registrasi/frontend/vite.config.js` | 42, 47 | `target: 'http://localhost:3001'` (2×) | `target: 'http://localhost:8080'` |
| 2 | `kpu-sumsel-registrasi/frontend/.env.development` | 1 | `VITE_API_URL=http://localhost:3001/api` | `VITE_API_URL=/api` |
| 3 | `kpu-sumsel-registrasi/frontend/src/pages/MobileCheckin.jsx` | 679 | `\|\| 'http://localhost:3001'` | `\|\| ''` |
| 4 | `kpu-sumsel-registrasi/frontend/src/utils/printIDCard.js` | 10 | `\|\| 'http://localhost:3001/api'` | `\|\| '/api'` |
| 5 | `ecosystem.config.js` (root) | 9, 13 | `PORT: 3001` (2×) | `PORT: 8080` |
| 6 | `kpu-sumsel-registrasi/backend/.env.production` | 1 | `PORT=3001` | `PORT=8080` |

## Restart & Verifikasi

1. Kill proses Vite lama (PID 7148, port 5173): `Stop-Process -Id 7148 -Force`
2. Jalankan ulang: `npm run dev` di `kpu-sumsel-registrasi/frontend` (latar belakang/`Start-Process`)
3. Verifikasi:
   - `http://localhost:8080/api/ping` → 200 (backend tidak berubah)
   - Login `admin` di `http://localhost:5173` → sukses (periksa respons `POST /api/admin/login` melalui proxy Vite)
   - Tidak boleh ada rujukan `3001` tersisa di `frontend/` (grep)
4. Backend (8080) TIDAK perlu restart — konfigurasi frontend saja yang berubah.

## Catatan

- `frontend/dist` build (03 Agu 14.41) lebih baru dari semua `src` (maks 03 Agu 09.03) → deploy single-port 8080 sudah valid.
- CORS sudah aman: origin `localhost:5173` termasuk daftar default di `backend/server.js`.
- Opsional (tidak blokir): `backend/.env.production` berisi kredensial placeholder — hanya dipakai jika deploy produksi; usahakan diisi/regenerasi sebelum rilis.
