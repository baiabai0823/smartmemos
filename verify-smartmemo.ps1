$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not (Test-Path .git)) {
  throw "Run this script from the SmartMemo repository root."
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required for JavaScript syntax validation."
}

$javascriptFiles = @(
  ".\iphone-memo-app\app.js",
  ".\iphone-memo-app-swipe-test\app.js"
)

foreach ($file in $javascriptFiles) {
  if (-not (Test-Path $file)) { throw "Missing required file: $file" }
  node --check $file
  if ($LASTEXITCODE -ne 0) { throw "JavaScript validation failed: $file" }
}

$cssFiles = @(
  ".\iphone-memo-app\styles.css",
  ".\iphone-memo-app-swipe-test\styles.css"
)

foreach ($file in $cssFiles) {
  if (-not (Test-Path $file)) { throw "Missing required file: $file" }
  $content = Get-Content -Raw -LiteralPath $file
  $openCount = ([regex]::Matches($content, "\{")).Count
  $closeCount = ([regex]::Matches($content, "\}")).Count
  if ($openCount -ne $closeCount) {
    throw "Unbalanced CSS braces in ${file}: $openCount open / $closeCount close"
  }
  Write-Host "CSS braces OK: $file ($openCount/$closeCount)"
}

git diff --check
if ($LASTEXITCODE -ne 0) { throw "git diff --check failed." }

$branch = git branch --show-current
$commit = git rev-parse --short HEAD
Write-Host "Branch: $branch"
Write-Host "Commit: $commit"
git status -sb
Write-Host "SmartMemo source verification passed." -ForegroundColor Green
