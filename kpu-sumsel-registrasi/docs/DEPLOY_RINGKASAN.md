# Ringkasan Deploy — Sistem Registrasi KPU Sumsel

Dokumen ini mencatat hasil pengerjaan deploy **Sistem Registrasi Acara KPU Provinsi Sumatera Selatan** pada server Windows lokal, beserta cara pengoperasiannya.

---

## Arsitektur (single-port)

```
Browser ── http://<IP-ANDA>:8080 ──▶ Express (server.js) [proses PM2: kpu-sumsel]
                                       ├─ /api/*      → routes backend (SQLite sql.js)
                                       ├─ /uploads/*  → foto peserta
                                       └─ /*          → static frontend (frontend/dist)
                                         non-/api → SPA fallback ke index.html
```

- **Satu proses, satu port (default 8080).** Tidak ada `serve`, tidak ada konflik port.
- Frontend React (build produksi) disajikan langsung oleh Express; semua request API same-origin.
- Daemon PM2 berjalan **non-elevated** → perintah `pm2` responsif dari PowerShell biasa (tanpa `EPERM \\.\pipe\rpc.sock`).

## Perubahan yang dilakukan

| File | Perubahan |
|------|-----------|
| `backend/server.js` | 1) Static serving `frontend/dist` + SPA fallback (regExp non-`/api`/`/uploads` → `index.html`). 2) Perbaikan CORS: origin yang sama dengan Host request otomatis diizinkan (fix "tidak ada tampilan"). |
| `frontend/.env.production` | Didefinisikan variabel yang benar sesuai kode: `VITE_API_URL=/api`, `VITE_API_BASE_URL=/`, `VITE_UPLOAD_BASE_URL=/` (jalur relatif → tanpa hardcode IP). |
| `setup_kpu_fixed.ps1` | Ditulis ulang: build frontend → install backend → sinkron `PORT` di `backend/.env` (UTF-8 tanpa BOM, hapus apa yang cocok) → fase admin terpisah (firewall non-duplikat, pembersihan daemon & `~\.pm2`, `pm2-startup install`) → `pm2 start` via `ecosystem.config.js` → `pm2 save`. Bisa dipakai berulang, port configurable. |

## Hasil verifikasi
- `pm2 list` → `kpu-sumsel` **online**, responsif dari PowerShell biasa.
- `curl http://127.0.0.1:8080/api/ping` → `{"sukses":true,...}` (200).
- `curl http://127.0.0.1:8080` → HTML `index.html` (200).
- `/api/acara/info` same-origin → 200 (data acara lengkap).
- Firewall inbound TCP 8080 aktif; auto-start boot terpasang.
- `pm2 list` → juga ada `ngrok-kpu` **online** (terverifikasi dari luar: HTTP 200 dari node Cyprus/Jerman/Iran/Moldova).

## Akses publik (ngrok tunnel)

Area LAN (Wi-Fi) hanya terlihat dari dalam jaringan; untuk akses internet dipakai **ngrok** (tunnel), karena IP ISP memakai NAT/CGNAT sehingga port-forwarding router tidak praktis.

- **URL publik saat ini:** `https://cheese-matador-context.ngrok-free.dev`
  (disimpan di `docs/tunnel_url.txt`).
- Verifikasi: `curl https://<url>/api/ping` dan browser `https://<url>/` → 200.
- Proses: `pm2` app `ngrok-kpu` (konfigurasi `ecosystem.ngrok.config.cjs`, port 8080), ikut auto-start.
- Log tunnel: `pm2 logs ngrok-kpu`; akses tunnel: `ngrok http 8080`.
- **Catatan paket gratis:** URL berubah tiap restart tunnel. Untuk URL tetap, gunakan domain reserved (berbayar) dengan `ngrok http --domain=<nama> 8080`.
- Memperbarui token/URL: jalankan `powershell -NoProfile -ExecutionPolicy Bypass -File "setup_ngrok.ps1" -Token <AUTHTOKEN>` (menghasilkan URL baru dan menyimpannya ke `docs/tunnel_url.txt`).

## Pengoperasian

```powershell
# Deploy / update (ubah port via -Port)
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Lenovo\Desktop\Folder RIFKY\Rifky\Sistem Registrasi KPU\kpu-sumsel-registrasi\setup_kpu_fixed.ps1" -Port 8080

# Stop / restart / log
pm2 stop kpu-sumsel
pm2 restart kpu-sumsel
pm2 logs kpu-sumsel

# Backend .env (jangan commit!)
backend/.env
```

Email notifikasi (GMAIL) diaktifkan lewat `backend/.env` (`GMAIL_USER`, `GMAIL_APP_PASSWORD`).

## Catatan keamanan
- `backend/.env` berisi kredensial asli (GMAIL app password) — sudah di-`gitignore`, **jangan pernah commit**.
- Endpoint API dilindungi rate limiter & header `x-password`; gunakan password yang kuat untuk produksi.

## Troubleshooting singkat
- **Halaman kosong / API 500 "Diblokir oleh kebijakan CORS."** → pastikan request same-origin (host == origin). Server sudah mengizinkan origin yang sama dengan Host. Uji: `curl -H "Origin: http://<IP>:8080" http://<IP>:8080/api/ping`.
- **PM2 EPERM rpc.sock** → jangan campur daemon PM2 elevated & non-elevated; jalankan deploy lewat `setup_kpu_fixed.ps1` (daemon non-elevated).
- **Port dipakai** → ganti `-Port <angka>` lalu jalankan ulang skrip.