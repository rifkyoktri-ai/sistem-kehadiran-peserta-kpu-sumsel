# Panduan Admin

## Akses Panel Admin
- **URL:** `http://localhost:5173/admin`
- **Password default:** `KPUAdmin@Sumsel26`
- Masukkan password pada form login yang muncul.

## Mengganti Password
1. Buka file `backend/constants/index.js`.
2. Temukan baris:
   ```js
   const PASSWORD_ADMIN = 'KPUAdmin@Sumsel26';
   ```
3. Ganti nilai string dengan password baru.
4. Simpan file dan restart backend (`node server.js`).

## Memantau Rekap Kehadiran Real‑time
- Pada tab **Dashboard Rekap** terlihat empat kartu statistik:
  - Total Terdaftar
  - Hadir
  - Membatalkan
  - Persentase Kehadiran
- Data otomatis ter‑refresh tiap 30 detik.

## Mengedit Data Peserta
1. Buka tab **Data Peserta**.
2. Klik ikon ⚙ pada baris peserta yang akan diedit → pilih **Edit Data**.
3. Form modal akan muncul dengan field:
   - Nama, Instansi, Jabatan, No HP, Catatan.
4. Ubah data, klik **Simpan**.
5. Sistem akan mengirim `PUT /api/admin/peserta/:id` dengan header `x-password`.
6. Jika berhasil, tabel akan ter‑update dan aksi tercatat di **Audit Log**.

## Membatalkan Pendaftaran Peserta
1. Pada tabel peserta, pilih **Batalkan Pendaftaran**.
2. Konfirmasi dialog muncul: *"Apakah Anda yakin membatalkan pendaftaran [Nama]? Tindakan ini tidak dapat dibatalkan."*
3. Klik **Ya**, sistem mengirimkan `DELETE /api/admin/peserta/:id`.
4. Status peserta berubah menjadi **Dibatalkan** dan tercatat di audit log.

## Mengganti (Replace) Peserta
1. Pilih **Ganti Peserta** pada dropdown aksi.
2. Isi data peserta baru pada modal yang muncul.
3. Klik **Ganti** → `POST /api/admin/peserta/ganti` dipanggil.
4. Peserta lama ditandai **Digantikan**, peserta baru dengan status **Hadir**/`Terdaftar` muncul.

## Mengubah Pengaturan Acara
- Buka tab **Pengaturan Acara**.
- Form berisi:
  - Nama Acara
  - Tanggal & Waktu
  - Lokasi
  - Kuota Maksimal
  - Deadline Registrasi
  - Status Registrasi (`Buka` / `Tutup`)
- Klik **Simpan** → `PUT /api/admin/acara`.
- Perubahan langsung berlaku pada halaman registrasi publik.

## Mengekspor Data ke CSV
1. Pada tab **Data Peserta**, klik tombol **Export CSV**.
2. File `peserta-kpu-sumsel-YYYYMMDD.csv` akan di‑download.
3. Buka di Microsoft Excel – semua kolom (`ID Registrasi, Nama, Instansi, Email, No HP, Status, ...`) tersedia.

## Membaca Audit Log
- Tab **Audit Log** menampilkan tabel dengan kolom:
  - Waktu
  - Aktor (admin/petugas)
  - Aksi
  - ID Peserta
  - Detail
- Log otomatis ter‑refresh tiap 30 detik.
- Untuk analisis lebih lanjut, dapat mengekspor ke CSV (fitur akan ditambahkan).

## Troubleshooting Umum
- **Server tidak jalan** – Pastikan backend dijalankan (`node server.js`).
- **Password tidak diterima** – Periksa kembali nilai `PASSWORD_ADMIN` di `backend/constants/index.js` dan restart server.
- **Data tidak muncul di tabel** – Pastikan endpoint `/api/admin/peserta` mengembalikan data, periksa log backend untuk error.
- **Tidak dapat meng‑export CSV** – Pastikan browser mengizinkan download, periksa console untuk error jaringan.
- **Audit log kosong** – Pastikan aksi dilakukan dengan header `x-password` yang valid.

---
*Dokumentasi ini disusun untuk memudahkan tim panitia dalam mengoperasikan panel admin.*
