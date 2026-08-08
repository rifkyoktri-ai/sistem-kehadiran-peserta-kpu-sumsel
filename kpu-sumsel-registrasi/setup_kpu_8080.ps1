# ==========================================================
# setup_kpu_8080.ps1 – Persiapan firewall, build, dan PM2 pada port 8080
# ==========================================================
# Jalankan **sebagai Administrator**!

# -----------------------------------------------------------------
# 1️⃣  Aturan firewall untuk port 8080 (frontend + backend)
# -----------------------------------------------------------------
Write-Host "Menambahkan aturan firewall untuk port 8080 (frontend & backend) ..."
New-NetFirewallRule -DisplayName "Allow HTTP 8080 - KPU Frontend" `
    -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow `
    -Profile Any -Enabled True | Out-Null

New-NetFirewallRule -DisplayName "Allow TCP 8080 - KPU Backend" `
    -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow `
    -Profile Any -Enabled True | Out-Null

Write-Host "✅ Firewall OK"

# --------------------------------------------------------------
# 2️⃣  Build frontend (jika folder ./dist belum ada)
# --------------------------------------------------------------
$frontendPath = "C:\Users\Lenovo\Desktop\Folder RIFKY\Rifky\Sistem Registrasi KPU\kpu-sumsel-registrasi\frontend"
Set-Location $frontendPath
Write-Host "Membangun (build) frontend ..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Build frontend gagal. Hentikan skrip."
    exit 1
}
Write-Host "✅ Frontend berhasil dibangun (folder ./dist ada)."

# --------------------------------------------------------------
# 3️⃣  Bersihkan proses PM2 lama & jalankan ulang pada port 8080
# --------------------------------------------------------------
Write-Host "Membersihkan proses PM2 lama ..."
pm install -g pm2 2>$null | Out-Null
pm2 delete all 2>$null

# ---- Backend --------------------------------------------------
$backendPath = "C:\Users\Lenovo\Desktop\Folder RIFKY\Rifky\Sistem Registrasi KPU\kpu-sumsel-registrasi\backend"
Set-Location $backendPath
Write-Host "Menjalankan backend (server.js) pada port 8080 ..."
pm install 2>$null | Out-Null
pm2 start server.js --name "kpu-sumsel-backend" --cwd "$backendPath" --env production

# ---- Frontend (static) ---------------------------------------
Set-Location $frontendPath
$serveCmd = "C:\Users\Lenovo\AppData\Roaming\npm\serve.cmd"
Write-Host "Menjalankan frontend static server pada port 8080 ..."
pm install -g serve 2>$null | Out-Null
pm2 start $serveCmd --name "kpu-sumsel-frontend" -- -s "$frontendPath\dist" -l 8080

# --------------------------------------------------------------
# 4️⃣  Simpan konfigurasi PM2 (auto‑start setelah reboot)
# --------------------------------------------------------------
pm save
pm2 save
Write-Host "✅ PM2 konfigurasi disimpan."

# --------------------------------------------------------------
# 5️⃣  Verifikasi akhir
# --------------------------------------------------------------
Write-Host "\n===== VERIFIKASI ====="
pm list -g pm2
pm2 list
Write-Host "\nCoba akses lokal:"
Write-Host "Backend  : curl http://127.0.0.1:8080/api/ping -UseBasicParsing"
Write-Host "Frontend : curl http://127.0.0.1:8080 -UseBasicParsing"
Write-Host "\nJika kedua perintah mengembalikan 200 OK, semua sudah siap."
