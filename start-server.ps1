# Pistol Duel - start the local game server and expose it to the internet.
# Run this from the project root: powershell -ExecutionPolicy Bypass -File .\start-server.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$server = Join-Path $root "server"

Write-Host "Building server..." -ForegroundColor Cyan
Push-Location $server
npm run build
Pop-Location

Write-Host "Starting server on port 3001..." -ForegroundColor Cyan
$serverProc = Start-Process -FilePath "node" -ArgumentList "dist/index.js" -WorkingDirectory $server -PassThru -WindowStyle Hidden -RedirectStandardOutput "$server\server.log" -RedirectStandardError "$server\server.err.log"

Start-Sleep -Seconds 2

$cloudflared = Join-Path $env:USERPROFILE "bin\cloudflared.exe"
if (-not (Test-Path $cloudflared)) {
    Write-Host "cloudflared not found at $cloudflared - downloading..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path (Join-Path $env:USERPROFILE "bin") | Out-Null
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cloudflared
}

Write-Host "Starting Cloudflare quick tunnel -> http://localhost:3001 ..." -ForegroundColor Cyan
Write-Host "(This URL changes every time you restart the tunnel. When it does, update" -ForegroundColor DarkYellow
Write-Host " VITE_SERVER_URL in client/netlify.toml's [build.environment] to the new URL, then run" -ForegroundColor DarkYellow
Write-Host " 'netlify deploy --prod --dir=dist' from client/ again - or switch to a persistent host" -ForegroundColor DarkYellow
Write-Host " like Railway/Fly.io for a stable URL. See README.md.)" -ForegroundColor DarkYellow
Write-Host ""

& $cloudflared tunnel --url http://localhost:3001
