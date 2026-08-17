param(
  [string]$Branch = "codex/ios-interaction-test"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not (Test-Path .git)) {
  throw "Run this script from the SmartMemo repository root."
}

$changes = git status --porcelain
if ($changes) {
  Write-Host $changes
  throw "The repository has uncommitted changes. Commit or preserve them before pulling."
}

git fetch origin
git switch $Branch
git pull --ff-only origin $Branch

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\verify-smartmemo.ps1

Write-Host "SmartMemo is synchronized with origin/$Branch." -ForegroundColor Green
