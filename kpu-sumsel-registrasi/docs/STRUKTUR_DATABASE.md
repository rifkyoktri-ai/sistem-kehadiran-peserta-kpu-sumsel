# Struktur Database — Sistem Registrasi KPU Sumsel

## Tabel: peserta

| Kolom           | Tipe    | Deskripsi                                            |
|-----------------|---------|------------------------------------------------------|
| id              | TEXT PK | Format: KPU-SUMSEL-2026-XXXX                        |
| nomor_urut      | INTEGER | Urutan registrasi, unik, tidak didaur ulang          |
| nama_lengkap    | TEXT    | Nama peserta                                         |
| instansi        | TEXT    | Instansi/lembaga peserta                             |
| jabatan         | TEXT    | Jabatan peserta                                      |
| email           | TEXT    | Unik — kunci identitas utama                         |
| no_hp           | TEXT    | Nomor HP peserta                                     |
| catatan         | TEXT    | Catatan tambahan                                     |
| status          | TEXT    | terdaftar \| hadir \| membatalkan \| digantikan      |
| id_pengganti    | TEXT    | ID peserta yang menggantikan (jika status=digantikan)|
| id_digantikan   | TEXT    | ID peserta yang digantikan (jika ini adalah pengganti)|
| waktu_daftar    | TEXT    | ISO timestamp saat registrasi                        |
| waktu_checkin   | TEXT    | ISO timestamp saat check-in (null jika belum)        |
| petugas_checkin | TEXT    | Identitas petugas yang melakukan check-in            |
| adalah_walkin   | INTEGER | 0 = registrasi online, 1 = walk-in hari-H           |

## Tabel: audit_log

| Kolom     | Tipe         | Deskripsi                                        |
|-----------|--------------|--------------------------------------------------|
| id        | INTEGER PK   | Auto-increment                                   |
| waktu     | TEXT         | ISO timestamp aksi terjadi                       |
| aktor     | TEXT         | 'admin' \| 'petugas' \| 'sistem'                |
| aksi      | TEXT         | Lihat daftar AKSI_LOG di constants/index.js      |
| id_peserta| TEXT         | ID peserta yang terdampak                        |
| detail    | TEXT         | JSON string — perubahan data, keterangan, dll    |

### Nilai aksi yang valid:
- `REGISTRASI` — peserta baru mendaftar
- `CHECKIN` — peserta check-in di lokasi
- `EDIT_DATA` — admin mengubah data peserta
- `BATALKAN` — admin membatalkan pendaftaran
- `GANTI_PESERTA` — proses penggantian peserta
- `CETAK_ULANG` — petugas mencetak ulang ID Card
- `WALKIN` — pendaftaran walk-in hari-H

## Tabel: pengaturan_acara

| Kunci                | Default          | Deskripsi                        |
|----------------------|------------------|----------------------------------|
| nama_acara           | [NAMA ACARA]     | Nama acara resmi                 |
| tanggal_acara        | [TANGGAL ACARA]  | Format: DD Bulan YYYY            |
| waktu_acara          | [WAKTU ACARA]    | Format: HH:MM WIB                |
| lokasi_acara         | [LOKASI ACARA]   | Alamat/nama gedung               |
| kuota_maksimal       | 500              | Batas total peserta aktif        |
| deadline_registrasi  | (kosong)         | ISO timestamp, kosong = tidak ada|
| status_registrasi    | buka             | buka \| tutup                   |
