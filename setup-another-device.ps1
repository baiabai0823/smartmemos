param(
  [string]$TargetDirectory = (Join-Path $HOME "Documents\SmartMemo"),
  [string]$Branch = "codex/ios-interaction-test"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repository = "https://github.com/baiabai0823/smartmemos.git"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is not installed or is not available in PATH."
}

if (Test-Path (Join-Path $TargetDirectory ".git")) {
  Write-Host "Existing SmartMemo repository found: $TargetDirectory"
  Set-Location $TargetDirectory
  if (git status --porcelain) {
    throw "The existing repository has uncommitted changes. Commit or preserve them before updating."
  }
  git fetch origin
  git switch $Branch
  git pull --ff-only origin $Branch
} elseif (Test-Path $TargetDirectory) {
  throw "Target directory exists but is not a Git repository: $TargetDirectory"
} else {
  $parent = Split-Path -Parent $TargetDirectory
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  git clone --branch $Branch --single-branch $repository $TargetDirectory
  Set-Location $TargetDirectory
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\verify-smartmemo.ps1

Write-Host ""
Write-Host "SmartMemo is ready at: $TargetDirectory" -ForegroundColor Green
Write-Host "Run the formal web app with:"
Write-Host "  py -m http.server 8080 --directory `"$TargetDirectory\iphone-memo-app`""
Write-Host "Then open http://127.0.0.1:8080/"
Write-Host "Import an encrypted .smemo backup separately if app data must match the old device."
