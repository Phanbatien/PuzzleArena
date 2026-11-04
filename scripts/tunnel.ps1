<#
.SYNOPSIS
  Mở PuzzleArena ra Internet qua Cloudflare Quick Tunnel (trycloudflare.com) để demo.

.DESCRIPTION
  Mọi thứ vẫn chạy trên máy này (backend, frontend, database). Database mặc định là SQL Server trên máy
  (ConnectionStrings:Default); thêm -Sqlite để dùng file SQLite. Cổng SQL Server KHÔNG bị mở ra ngoài. Script:
    1. mở 2 đường hầm: backend (cổng 5000) và frontend (cổng 3000), lấy 2 địa chỉ *.trycloudflare.com;
    2. chạy backend với CORS chỉ cho phép địa chỉ frontend đó (Cors__Origins__0);
    3. build frontend trỏ tới địa chỉ backend (NEXT_PUBLIC_API_URL) rồi chạy bản build (npm start);
    4. in link để gửi cho người khác. Nhấn Ctrl+C để tắt tất cả.

  Mỗi lần chạy, địa chỉ trycloudflare.com đổi. Log nằm trong .tunnel-logs/.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\tunnel.ps1
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\tunnel.ps1 -Sqlite
#>
param([switch]$Sqlite)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$api = Join-Path $root "backend\PuzzleArena.Api"
$frontend = Join-Path $root "frontend"
$logs = Join-Path $root ".tunnel-logs"
New-Item -ItemType Directory -Force $logs | Out-Null
$started = New-Object System.Collections.ArrayList

function Find-Cloudflared {
    $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $default = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
    if (Test-Path $default) { return $default }
    throw "Chưa cài cloudflared. Cài bằng: winget install --id Cloudflare.cloudflared"
}

function Assert-PortFree([int]$port) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Cổng $port đang có chương trình khác dùng. Tắt backend/frontend đang chạy rồi thử lại."
    }
}

# cloudflared in địa chỉ ra stderr, dạng "|  https://abc-def.trycloudflare.com  |".
function Read-TunnelUrl([string]$logFile) {
    if (-not (Test-Path $logFile)) { return $null }
    $match = Select-String -Path $logFile -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" | Select-Object -First 1
    if ($match) { return $match.Matches[0].Value }
    return $null
}

function Start-Tunnel([string]$cloudflared, [int]$port, [string]$name) {
    $log = Join-Path $logs "$name-tunnel.log"
    Remove-Item $log, "$log.out" -ErrorAction SilentlyContinue
    $p = Start-Process $cloudflared -ArgumentList @("tunnel", "--url", "http://localhost:$port") `
        -RedirectStandardError $log -RedirectStandardOutput "$log.out" -WindowStyle Hidden -PassThru
    [void]$started.Add($p)
    $deadline = (Get-Date).AddSeconds(45)
    while ((Get-Date) -lt $deadline) {
        $url = Read-TunnelUrl $log
        if ($url) { return $url }
        if ($p.HasExited) { break }
        Start-Sleep -Milliseconds 500
    }
    throw "Không mở được đường hầm cho cổng $port. Xem log: $log"
}

function Wait-Http([string]$url, [int]$seconds) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 3 | Out-Null
            return
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    throw "Không thấy $url phản hồi sau $seconds giây. Xem log trong $logs"
}

# dotnet run / npm start sinh tiến trình con: tắt cả cây tiến trình.
function Stop-All {
    foreach ($p in $started) {
        if ($p -and -not $p.HasExited) { & taskkill /T /F /PID $p.Id 2>$null | Out-Null }
    }
}

try {
    $cloudflared = Find-Cloudflared
    Assert-PortFree 5000
    Assert-PortFree 3000

    Write-Host "1/4 Mở đường hầm..." -ForegroundColor Cyan
    $backendUrl = Start-Tunnel $cloudflared 5000 "backend"
    $frontendUrl = Start-Tunnel $cloudflared 3000 "frontend"
    Write-Host "    backend : $backendUrl"
    Write-Host "    frontend: $frontendUrl"

    $launchProfile = "http"
    $database = "SQL Server (ConnectionStrings:Default)"
    if ($Sqlite) { $launchProfile = "sqlite"; $database = "SQLite ($api\puzzlearena.db)" }
    Write-Host "2/4 Chạy backend ($database, CORS cho phép $frontendUrl)..." -ForegroundColor Cyan
    $env:Cors__Origins__0 = $frontendUrl
    $env:Cors__Origins__1 = "http://localhost:3000"
    $p = Start-Process dotnet -ArgumentList @("run", "--launch-profile", $launchProfile) -WorkingDirectory $api `
        -RedirectStandardOutput (Join-Path $logs "backend.log") -RedirectStandardError (Join-Path $logs "backend.err.log") `
        -WindowStyle Hidden -PassThru
    [void]$started.Add($p)
    Wait-Http "http://localhost:5000/api/health" 120

    Write-Host "3/4 Build frontend (NEXT_PUBLIC_API_URL=$backendUrl)..." -ForegroundColor Cyan
    $env:NEXT_PUBLIC_API_URL = $backendUrl # biến môi trường được ưu tiên hơn frontend/.env.local
    & npm.cmd --prefix $frontend run build
    if ($LASTEXITCODE -ne 0) { throw "Build frontend thất bại." }

    Write-Host "4/4 Chạy frontend..." -ForegroundColor Cyan
    # Start-Process (PowerShell 5.1) không tự bọc ngoặc kép cho tham số có dấu cách ("KÌ 7"):
    # truyền thư mục qua -WorkingDirectory, không qua --prefix.
    $p = Start-Process npm.cmd -ArgumentList @("start") -WorkingDirectory $frontend `
        -RedirectStandardOutput (Join-Path $logs "frontend.log") -RedirectStandardError (Join-Path $logs "frontend.err.log") `
        -WindowStyle Hidden -PassThru
    [void]$started.Add($p)
    Wait-Http "http://localhost:3000" 90

    Write-Host ""
    Write-Host "Gửi link này cho người khác: $frontendUrl" -ForegroundColor Green
    Write-Host "(API: $backendUrl  ·  database: $database)"
    Write-Host ""
    Write-Host "CẢNH BÁO: đang chạy chế độ Development. Ai có link cũng đăng nhập được bằng tài khoản dùng thử," -ForegroundColor Yellow
    Write-Host "kể cả admin (mật khẩu 123456). Chỉ mở trong lúc demo." -ForegroundColor Yellow
    Write-Host "Nhấn Ctrl+C để tắt tất cả."

    while ($true) {
        Start-Sleep -Seconds 2
        foreach ($proc in $started) {
            if ($proc.HasExited) { throw "Một tiến trình đã dừng (PID $($proc.Id)). Xem log trong $logs" }
        }
    }
} finally {
    Write-Host "Đang tắt đường hầm, backend và frontend..."
    Stop-All
}
