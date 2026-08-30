@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul

echo.
echo ================================================================
echo    DEPLOY OTOMATIS — Sistem Registrasi KPU Provinsi Sumsel
echo ================================================================
echo.

:: ── Cek hak Administrator ──────────────────────────────────────────────────
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Skrip ini harus dijalankan sebagai Administrator!
    echo.
    echo Klik kanan pada file DEPLOY-WINDOWS.bat
    echo lalu pilih "Run as administrator"
    echo.
    pause
    exit /b 1
)

:: ── Set working directory ke lokasi file .bat ini ─────────────────────────
cd /d "%~dp0"
echo [INFO] Direktori kerja: %CD%
echo.

:: ── Cek Node.js ──────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo.
    echo Unduh dan instal Node.js dari: https://nodejs.org
    echo Pastikan minimum versi 18.x
    echo.
    pause
    exit /b 1
)
for /f "tokens=1" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js terdeteksi: %NODE_VER%

:: ── Langkah 1: Install dependensi Backend ─────────────────────────────────
echo.
echo ================================================================
echo   LANGKAH 1/3 — Menginstal Dependensi Backend
echo ================================================================
cd /d "%~dp0backend"
echo [INFO] Folder: %CD%
echo [INFO] Menjalankan: npm install...
echo.
call npm install
if %errorLevel% neq 0 (
    echo.
    echo [ERROR] Gagal menginstal dependensi backend!
    echo         Periksa koneksi internet Anda.
    pause
    exit /b 1
)
echo.
echo [OK] Dependensi backend berhasil diinstal.

:: ── Langkah 2: Build Frontend ─────────────────────────────────────────────
echo.
echo ================================================================
echo   LANGKAH 2/3 — Build Frontend (React + Vite)
echo ================================================================
cd /d "%~dp0frontend"
echo [INFO] Folder: %CD%
echo.
echo [INFO] Menginstal dependensi frontend...
call npm install
if %errorLevel% neq 0 (
    echo.
    echo [ERROR] Gagal menginstal dependensi frontend!
    pause
    exit /b 1
)

echo.
echo [INFO] Memulai proses build frontend...
call npm run build
if %errorLevel% neq 0 (
    echo.
    echo [ERROR] Build frontend gagal!
    echo         Periksa file vite.config.js dan src/ untuk error.
    pause
    exit /b 1
)
echo.
echo [OK] Build frontend selesai. Hasil ada di folder frontend\dist\

:: ── Verifikasi dist tersedia ───────────────────────────────────────────────
if not exist "%~dp0frontend\dist\index.html" (
    echo.
    echo [ERROR] File dist\index.html tidak ditemukan setelah build!
    echo         Build mungkin tidak berhasil sempurna.
    pause
    exit /b 1
)
echo [OK] Verifikasi dist\index.html: OK

:: ── Langkah 3: Daftarkan sebagai Windows Service ──────────────────────────
echo.
echo ================================================================
echo   LANGKAH 3/3 — Mendaftarkan Windows Service
echo ================================================================
cd /d "%~dp0backend"
echo [INFO] Folder: %CD%
echo.

:: Cek apakah service sudah terdaftar sebelumnya
sc query KPUSumselRegistrasiApp >nul 2>&1
if %errorLevel% equ 0 (
    echo [INFO] Service KPUSumselRegistrasiApp sudah terdaftar.
    echo [INFO] Menghapus instalasi lama terlebih dahulu...
    call node uninstall-service.js
    :: Tunggu beberapa detik agar service benar-benar terhapus
    timeout /t 5 /nobreak > nul
    echo [INFO] Melanjutkan instalasi ulang...
    echo.
)

echo [INFO] Mendaftarkan service baru...
call node install-service.js
if %errorLevel% neq 0 (
    echo.
    echo [ERROR] Gagal mendaftarkan Windows Service!
    echo.
    echo Alternatif: Jalankan backend secara manual dengan perintah:
    echo   cd backend
    echo   node server.js
    echo.
    pause
    exit /b 1
)

:: ── Selesai ────────────────────────────────────────────────────────────────
echo.
echo ================================================================
echo   ✅  DEPLOY SELESAI!
echo ================================================================
echo.
echo   Aplikasi berjalan sebagai Windows Service:
echo     Nama    : KPUSumselRegistrasiApp
echo     Port    : 8080
echo     URL     : http://localhost:8080
echo.
echo   Perintah manajemen service:
echo     Start   : sc start KPUSumselRegistrasiApp
echo     Stop    : sc stop  KPUSumselRegistrasiApp
echo     Status  : sc query KPUSumselRegistrasiApp
echo     Hapus   : cd backend ^&^& node uninstall-service.js
echo.
echo   Service akan otomatis berjalan saat Windows dinyalakan.
echo ================================================================
echo.
pause
