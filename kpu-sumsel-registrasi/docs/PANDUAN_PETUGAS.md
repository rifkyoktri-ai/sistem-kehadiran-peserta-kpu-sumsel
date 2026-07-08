# Panduan Petugas — Sistem Registrasi KPU Sumsel

## Akses Petugas

- **URL Check-in**: `http://localhost:5173/checkin`
- **Password**: Sesuai yang diberikan koordinator
- **Header API**: `x-password: <password_petugas>`

---

## Prosedur Check-in Peserta

### Langkah 1: Validasi Peserta
Scan QR Code dari ID Card peserta atau masukkan ID/email manual.

```
POST /api/checkin/validasi
Body: { "identifier": "KPU-SUMSEL-2026-0001" }
      atau
Body: { "identifier": "email@peserta.com" }
```

### Langkah 2: Tandai Hadir
Setelah validasi berhasil, tandai peserta sebagai hadir.

```
POST /api/checkin/tandai-hadir
Body: { "identifier": "KPU-SUMSEL-2026-0001" }
```

---

## Peserta Walk-in Hari-H

Untuk peserta yang belum terdaftar online:

```
POST /api/checkin/walkin
Body: {
  "nama_lengkap": "Nama Peserta",
  "instansi": "Nama Instansi",
  "jabatan": "Jabatan",
  "email": "email@instansi.go.id",
  "no_hp": "081234567890"
}
```

Peserta walk-in langsung terdaftar dan tercatat hadir.

---

## Cetak Ulang ID Card

Jika peserta meminta cetak ulang ID Card:

```
POST /api/checkin/cetak-ulang
Body: {
  "id_peserta": "KPU-SUMSEL-2026-0001",
  "alasan": "ID Card rusak"
}
```

Aksi ini dicatat di audit log untuk keamanan.

---

## Kode Status Peserta

| Status       | Arti                                      | Dapat Check-in? |
|--------------|-------------------------------------------|-----------------|
| terdaftar    | Sudah daftar, belum hadir                 | ✅ Ya           |
| hadir        | Sudah check-in                            | ❌ Sudah hadir  |
| membatalkan  | Membatalkan kehadiran                     | ❌ Tidak        |
| digantikan   | Digantikan peserta lain                   | ❌ Cari pengganti|

---

## Kontak Jika Ada Masalah

Hubungi admin sistem jika menemukan kendala teknis yang tidak dapat diselesaikan di lapangan.
