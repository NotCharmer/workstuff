# Setup local Postgres (Docker) for safe testing — does not touch Neon production.
# Prerequisites: Docker Desktop installed and running.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-local-db.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  $fallback = "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe"
  if (Test-Path $fallback) {
    $env:Path = "$(Split-Path $fallback);$env:Path"
  } else {
    Write-Host @"

Docker Desktop is not installed (or not in PATH).

1) Install: https://www.docker.com/products/docker-desktop/
2) Open Docker Desktop and wait until it says "Engine running"
3) Re-run this script:  npm run db:setup-local

"@
    exit 1
  }
}

$desktop = "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
if (Test-Path $desktop) {
  $engineUp = $false
  try {
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $engineUp = $true }
  } catch {}
  if (-not $engineUp) {
    Write-Host "Starting Docker Desktop (first launch can take a few minutes)..."
    Start-Process $desktop | Out-Null
  }
}

Write-Host "Waiting for Docker engine..."
$engineReady = $false
for ($i = 0; $i -lt 90; $i++) {
  try {
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $engineReady = $true; break }
  } catch {}
  Start-Sleep -Seconds 2
}
if (-not $engineReady) {
  Write-Host @"

Docker engine is not running yet.

1) Open Docker Desktop from the Start menu
2) Wait until it says "Engine running" (green)
3) If it asks to install WSL / reboot — do that, then re-run: npm run db:setup-local

"@
  exit 1
}

Write-Host "Starting local Postgres (docker compose)..."
docker compose up -d

Write-Host "Waiting for Postgres..."
$ready = $false
for ($i = 0; $i -lt 45; $i++) {
  try {
    docker exec lebronator-db pg_isready -U postgres | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  } catch {}
  Start-Sleep -Seconds 2
}
if (-not $ready) {
  Write-Host "Postgres did not become ready. Is Docker Desktop running?"
  exit 1
}

Write-Host "Pushing Prisma schema..."
npx prisma db push

Write-Host "Seeding schools + admin..."
npm run db:setup-schools
npm run db:ensure-admin
npm run db:migrate-school-year
npm run db:migrate-daily-task-assignee
npm run db:migrate-user-branches

Write-Host @"

Local DB ready.
Make sure .env has:
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lebronator"
  NEXTAUTH_URL="http://localhost:3000"

Then run:  npm run dev
Login: mercazhadash@gmail.com / ChangeMe123!
Open: http://localhost:3000/login

"@
