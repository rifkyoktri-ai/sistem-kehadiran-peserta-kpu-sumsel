// =============================================================================
// UTILITAS EMAIL — Pengiriman email otomatis via Gmail SMTP (Nodemailer)
// =============================================================================
// Membutuhkan GMAIL_USER dan GMAIL_APP_PASSWORD di file .env.
// GMAIL_APP_PASSWORD BUKAN password akun Gmail biasa — harus App Password
// yang dibuat khusus di: https://myaccount.google.com/apppasswords
// (Akun Google harus mengaktifkan 2-Step Verification terlebih dahulu.)
// =============================================================================

const nodemailer = require('nodemailer');
const { ambilKoneksiDB } = require('../database/db');

let transporter = null;
let emailAktif = false;

/**
 * Inisialisasi transporter Gmail SMTP.
 * Jika kredensial belum diisi di .env, fitur email dinonaktifkan otomatis
 * (server tetap berjalan normal, hanya email tidak terkirim).
 */
function inisialisasiEmail() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn('[EMAIL] GMAIL_USER / GMAIL_APP_PASSWORD belum diatur di .env — notifikasi email dinonaktifkan.');
    emailAktif = false;
    return;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  emailAktif = true;
  console.log('[EMAIL] Notifikasi email via Gmail SMTP aktif (' + GMAIL_USER + ').');
}

/**
 * Membuat template HTML email konfirmasi registrasi.
 */
function buatTemplateKonfirmasi(peserta) {
  const {
    nama_lengkap, id, instansi, jabatan,
    nama_acara, tanggal_acara, waktu_acara, lokasi_acara,
  } = peserta;

  const tanggalFormatted = tanggal_acara
    ? new Date(tanggal_acara).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-';

  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
    <div style="background:#0f4c81; padding: 20px 24px; border-radius: 8px 8px 0 0;">
      <h2 style="color:#ffffff; margin:0; font-size: 18px;">KPU Provinsi Sumatera Selatan</h2>
    </div>
    <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
      <p>Yth. <strong>${nama_lengkap}</strong>,</p>
      <p>Pendaftaran Anda pada acara berikut telah <strong style="color:#0f4c81;">berhasil terverifikasi</strong>:</p>

      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding:6px 0; color:#6b7280; width:150px;">ID Registrasi</td><td style="padding:6px 0;"><strong>${id}</strong></td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Nama Acara</td><td style="padding:6px 0;">${nama_acara || '-'}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Tanggal</td><td style="padding:6px 0;">${tanggalFormatted}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Waktu</td><td style="padding:6px 0;">${waktu_acara || '-'}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Lokasi</td><td style="padding:6px 0;">${lokasi_acara || '-'}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Instansi</td><td style="padding:6px 0;">${instansi || '-'}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Jabatan</td><td style="padding:6px 0;">${jabatan || '-'}</td></tr>
      </table>

      <p style="background:#f3f4f6; padding:12px 16px; border-radius:6px; font-size: 14px;">
        Mohon simpan email ini dan tunjukkan <strong>ID Registrasi</strong> di atas saat melakukan check-in pada hari-H.
      </p>

      <p style="font-size: 13px; color:#6b7280; margin-top: 24px;">
        Email ini dikirim otomatis oleh sistem. Mohon tidak membalas email ini.
      </p>
    </div>
  </div>`;
}

function updateStatusEmail(id, status, waktu) {
  try {
    const db = ambilKoneksiDB();
    db.prepare(
      'UPDATE peserta SET email_status = ?, email_terakhir_dicoba = ? WHERE id = ?'
    ).run(status, waktu, id);
  } catch (err) {
    console.error('[EMAIL] Gagal update status email di DB:', err.message);
  }
}

/**
 * Mengirim email konfirmasi/verifikasi registrasi ke peserta.
 * Fungsi ini TIDAK melempar error ke pemanggil — kegagalan hanya dicatat di log,
 * agar proses registrasi tetap berhasil meskipun email gagal terkirim.
 * @param {object} peserta - Data peserta hasil registrasi (harus punya field: email, nama_lengkap, id, dll)
 */
async function kirimEmailKonfirmasi(peserta) {
  if (!peserta.id) {
    return { terkirim: false, alasan: 'peserta_tanpa_id' };
  }

  const waktuSekarang = new Date().toISOString();

  if (!peserta.email) {
    updateStatusEmail(peserta.id, 'tidak_ada_email', waktuSekarang);
    return { terkirim: false, alasan: 'peserta_tanpa_email' };
  }

  if (!emailAktif || !transporter) {
    updateStatusEmail(peserta.id, 'gagal', waktuSekarang);
    return { terkirim: false, alasan: 'fitur_email_nonaktif' };
  }

  updateStatusEmail(peserta.id, 'menunggu', waktuSekarang);

  try {
    await transporter.sendMail({
      from: `"KPU Provinsi Sumatera Selatan" <${process.env.GMAIL_USER}>`,
      to: peserta.email,
      subject: `Konfirmasi Registrasi Terverifikasi — ${peserta.nama_acara || 'Acara KPU Sumsel'}`,
      html: buatTemplateKonfirmasi(peserta),
    });
    updateStatusEmail(peserta.id, 'terkirim', waktuSekarang);
    console.log(`[EMAIL] Konfirmasi terkirim ke ${peserta.email} (ID: ${peserta.id})`);
    return { terkirim: true };
  } catch (err) {
    updateStatusEmail(peserta.id, 'gagal', waktuSekarang);
    console.error(`[EMAIL] Gagal mengirim ke ${peserta.email}:`, err.message);
    return { terkirim: false, alasan: err.message };
  }
}

module.exports = { inisialisasiEmail, kirimEmailKonfirmasi };
