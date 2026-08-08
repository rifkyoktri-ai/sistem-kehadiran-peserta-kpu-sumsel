# ============================================================
# setup_kpu_fixed.ps1 – Deploy single-port: Sistem Registrasi KPU
# Express menyajikan API + frontend (dist) pada SATU port.
#
# Strategi:
#  - Daemon PM2 dijalankan NON-elevated (agar `pm2` cepat dari
#    PowerShell biasa, tanpa EPERM/rpc.sock).
#  - Hanya bagian yang butuh admin (firewall, pembersihan daemon
#    admin lama, auto-start boot) dijalankan lewat subproses
#    Administrator singkat.
# ============================================================
param([int]$Port = 8080, [switch]$AdminOnly)

$TARGET_PORT   = $Port
$ROOT_DIR      = $PSScriptRoot
$FRONTEND_PATH = Join-Path $ROOT_DIR 'frontend'
$BACKEND_PATH  = Join-Path $ROOT_DIR 'backend'
$PM2_HOME      = Join-Path $HOME '.pm2'

function Test-Admin {
    return ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# ------------------------------------------------------------
# FASE ADMIN (dijalankan elevated): firewall + bersih daemon lama + auto-start
# ------------------------------------------------------------
if ($AdminOnly) {
    Write-Host "[ADMIN] Membersihkan daemon PM2 lama & port $TARGET_PORT ..."
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'pm2' } | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
    pm2 kill 2>$null | Out-Null
    Get-NetTCPConnection -LocalPort $TARGET_PORT -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 800
    if (Test-Path $PM2_HOME) { Remove-Item -Recurse -Force $PM2_HOME }

    Write-Host "[ADMIN] Menyiapkan firewall untuk port $TARGET_PORT ..."
    @("Allow HTTP $TARGET_PORT - KPU", "Allow TCP $TARGET_PORT - KPU Backend", "Allow HTTP $TARGET_PORT - KPU Frontend") | ForEach-Object {
        Remove-NetFirewallRule -DisplayName $_ -ErrorAction SilentlyContinue
    }
    New-NetFirewallRule -DisplayName "Allow HTTP $TARGET_PORT - KPU" -Direction Inbound -Protocol TCP -LocalPort $TARGET_PORT -Action Allow -Profile Any -Enabled True | Out-Null

    Write-Host "[ADMIN] Mengaktifkan auto-start setelah reboot ..."
    & pm2-startup install 2>$null | Out-Null
    # Turunkan level jalankan task startup agar daemon boot ikut non-elevated
    try {
        Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskName -match 'pm2' } | ForEach-Object {
            schtasks /Change /TN $_.TaskName /RL LIMITED 2>$null | Out-Null
        }
    } catch {}
    Write-Host "[ADMIN] Selesai."
    exit 0
}

# ------------------------------------------------------------
# BODY UTAMA (non-elevated daemon PM2)
# ------------------------------------------------------------
$isAdmin = Test-Admin
if ($isAdmin) { Write-Warning "Dijalankan sebagai Admin - daemon PM2 akan HIGHEST privileges. Disarankan shell biasa." }

Write-Host "==========================================================="
Write-Host "Deploy Sistem Registrasi KPU Sumsel - single port $TARGET_PORT"
Write-Host "==========================================================="

# 1. Build frontend
Write-Host "[1/6] Membangun (build) frontend ..."
Push-Location $FRONTEND_PATH
if (-not (Test-Path node_modules)) { npm install --no-audit --no-fund }
npm run build
$buildStatus = $LASTEXITCODE
Pop-Location
if ($buildStatus -ne 0) { Write-Error "Build frontend gagal."; exit 1 }
Write-Host "   Frontend berhasil dibangun (dist)."

# 2. Dependency backend + sinkronkan PORT di .env
Write-Host "[2/6] Menginstall dependency backend ..."
Push-Location $BACKEND_PATH
if (-not (Test-Path node_modules)) { npm install --no-audit --no-fund }
if ($LASTEXITCODE -ne 0) { Write-Error "Install backend gagal."; exit 1 }
Pop-Location

$envPath = Join-Path $BACKEND_PATH '.env'
if (-not (Test-Path $envPath)) { Copy-Item (Join-Path $BACKEND_PATH '.env.example') $envPath -Force }
$rawEnv = [System.IO.File]::ReadAllText($envPath)
$rawEnv = [regex]::Replace($rawEnv, '(?m)^PORT=.*$', "PORT=$TARGET_PORT")
[System.IO.File]::WriteAllText($envPath, $rawEnv, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "   backend\.env PORT sinkron -> $TARGET_PORT"

# 3. Jalankan fase admin (firewall + bersihkan daemon admin lama). Menunggu selesai.
Write-Host "[3/6] Menjalankan fase Admin (firewall & pembersihan daemon lama) ..."
if (-not $isAdmin) {
    $argLine = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Port $TARGET_PORT -AdminOnly"
    $run = Start-Process -FilePath "powershell.exe" -ArgumentList $argLine -Verb RunAs -PassThru -Wait
    if (-not $run -or $run.ExitCode -ne 0) { Write-Error "Fase admin dibatalkan atau gagal."; exit 1 }
} else {
    Write-Host "   (sudah admin - melewati pemanggilan ulang)"
}

# 4. Pastikan pm2 global terpasang
Write-Host "[4/6] Memastikan PM2 terpasang ..."
npm i -g pm2 --no-audit --no-fund | Out-Null

# 5. Jalankan 1 aplikasi (daemon non-elevated)
Write-Host "[5/6] Menjalankan aplikasi via PM2 ..."
$ecosystem = @"
module.exports = {
  apps: [{
    name: 'kpu-sumsel',
    script: 'server.js',
    cwd: '$($BACKEND_PATH.Replace('\','\\'))',
    env: { PORT: '$TARGET_PORT' }
  }]
};
"@
[System.IO.File]::WriteAllText((Join-Path $BACKEND_PATH 'ecosystem.config.js'), $ecosystem, (New-Object System.Text.UTF8Encoding($false)))

pm2 delete kpu-sumsel 2>$null | Out-Null
pm2 start (Join-Path $BACKEND_PATH "ecosystem.config.js")
if ($LASTEXITCODE -ne 0) { Write-Error "pm2 start gagal."; exit 1 }
pm2 save
Write-Host "   PM2 konfigurasi disimpan."

# 6. Verifikasi
Start-Sleep -Seconds 3
Write-Host ""
Write-Host "===== VERIFIKASI ====="
pm2 list
Write-Host ""
try {
    $ping = Invoke-RestMethod "http://127.0.0.1:$TARGET_PORT/api/ping" -TimeoutSec 15
    Write-Host "API       : OK -> $($ping.pesan)"
} catch { Write-Host "API       : GAGAL -> $($_.Exception.Message)" }
try {
    $web = Invoke-WebRequest "http://127.0.0.1:$TARGET_PORT/" -UseBasicParsing -TimeoutSec 15
    Write-Host "Frontend  : OK -> HTTP $($web.StatusCode)"
} catch { Write-Host "Frontend  : GAGAL -> $($_.Exception.Message)" }
Write-Host ""
Write-Host "Akses dari komputer lain: http://<IP-ANDA>:$TARGET_PORT"
Write-Host "Perintah PM2 kini dapat dipakai dari PowerShell biasa (tanpa admin)."
Write-Host "Selesai."