# ============================================================
# setup_ngrok.ps1 – Ekspos layanan KPU (port 8080) ke internet via ngrok
# Contoh:
#   powershell -NoProfile -ExecutionPolicy Bypass -File setup_ngrok.ps1 -Token <AUTHTOKEN>
# ============================================================
param([Parameter(Mandatory=$true)][string]$Token)

$NGR = "$env:LOCALAPPDATA\ngrok\ngrok.exe"
$PORT = 8080
$URL_FILE = Join-Path $PSScriptRoot 'docs\tunnel_url.txt'
$ENDPOINT_PING = "http://127.0.0.1:$PORT/api/ping"

Write-Host "=== ngrok setup untuk kpu-sumsel (port $PORT) ==="

# 1. Pastikan ngrok terpasang
if (-not (Test-Path $NGR)) {
    Write-Host "Mengunduh ngrok ..."
    $zip = "$env:TEMP\ngrok-v3.zip"
    Invoke-WebRequest "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" -OutFile $zip
    New-Item -ItemType Directory -Path "$env:LOCALAPPDATA\ngrok" -Force | Out-Null
    Expand-Archive $zip -DestinationPath "$env:LOCALAPPDATA\ngrok" -Force
}
& $NGR version

# 2. Simpan authtoken
Write-Host "Menyimpan authtoken ..."
& $NGR config add-authtoken $Token

# 3. Hentikan tunnel lama (jika ada) lalu jalankan ulang via PM2
Write-Host "Menjalankan tunnel via PM2 (nama: ngrok-kpu) ..."
pm2 delete ngrok-kpu 2>$null | Out-Null

$ngrokEco = @"
module.exports = {
  apps: [{
    name: 'ngrok-kpu',
    script: '$($NGR.Replace('\','\\'))',
    interpreter: 'none',
    cwd: '$($PSScriptRoot.Replace('\','\\'))',
    args: 'http $PORT'
  }]
};
"@
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'ecosystem.ngrok.config.cjs'), $ngrokEco, (New-Object System.Text.UTF8Encoding($false)))

& pm2 start (Join-Path $PSScriptRoot 'ecosystem.ngrok.config.cjs')
if ($LASTEXITCODE -ne 0) { Write-Error "pm2 start ngrok gagal."; exit 1 }
pm2 save
Start-Sleep -Seconds 8

# 4. Ambil URL publik dari API lokal ngrok (http://127.0.0.1:4040)
$url = $null
for ($i=0; $i -lt 5 -and -not $url; $i++) {
    try {
        $t = Invoke-RestMethod "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5
        $url = ($t.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1).public_url
        if (-not $url) { $url = $t.tunnels[0].public_url }
    } catch { Start-Sleep -Seconds 3 }
}

if (-not $url) {
    Write-Error "Gagal mendapatkan URL publik. Lihat log: pm2 logs ngrok-kpu"
    exit 1
}

New-Item -ItemType Directory -Path (Split-Path $URL_FILE) -Force | Out-Null
Set-Content -Path $URL_FILE -Value $url -Encoding Ascii
Write-Host ""
Write-Host "=== URL PUBLIK ==="
Write-Host $url
Write-Host "(disimpan di $URL_FILE)"
Write-Host ""

# 5. Verifikasi dari luar (check-host.net)
Write-Host "Menguji $url/api/ping dari jaringan eksternal ..."
Start-Sleep -Seconds 3
try {
    $j = Invoke-RestMethod "https://check-host.net/check-http?host=$url/api/ping&max_nodes=3" -Headers @{accept='application/json'} -TimeoutSec 20
    Start-Sleep -Seconds 10
    if ($j.request_id) {
        $res = Invoke-RestMethod "https://check-host.net/check-result/$($j.request_id)" -Headers @{accept='application/json'} -TimeoutSec 20
        $res.PSObject.Properties | ForEach-Object {
            $str = ($_.Value | Out-String).Trim()
            if ($str -match 'OK|200|connected|took') { "  [$($_.Name)] REACHABLE -> $str" } else { "  [$($_.Name)] ? -> $str" }
        }
    }
} catch { Write-Host "  (cek eksternal dilewati: $($_.Exception.Message))" }

Write-Host ""
Write-Host "Selesai. Browser: $url"
Write-Host "Log tunnel : pm2 logs ngrok-kpu"