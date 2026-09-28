param([switch]$SkipEmbeddings)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22.13 or newer and reopen PowerShell.' }
$nodeText = (& node --version).Trim().TrimStart('v')
if ($LASTEXITCODE -ne 0 -or [version]$nodeText -lt [version]'22.13.0') { throw 'Node.js 22.13 or newer is required.' }
# Avoid inline node -p / python -c expressions: Windows PowerShell can strip their quotes.
if (-not (Test-Path '.venv\Scripts\python.exe')) {
    if (Get-Command py -ErrorAction SilentlyContinue) { & py -3.12 -m venv .venv }
    elseif (Get-Command python -ErrorAction SilentlyContinue) { & python -m venv .venv }
    else { throw 'Install regular 64-bit Python 3.12.' }
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the Python environment.' }
}
$python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
& $python scripts\check_env.py
if ($LASTEXITCODE -ne 0) { throw 'Python environment check failed.' }
$env:PIP_CACHE_DIR = Join-Path $PSScriptRoot '.cache\pip'
$env:HF_HOME = Join-Path $PSScriptRoot '.cache\huggingface'
& $python -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'pip update failed.' }
& $python -m pip install --only-binary=:all: torch==2.7.1 --index-url https://download.pytorch.org/whl/cpu
if ($LASTEXITCODE -ne 0) { throw 'CPU PyTorch installation failed. Check Python compatibility and internet access.' }
& $python -m pip install --only-binary=:all: -r backend\requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Backend installation failed.' }
Push-Location backend
try {
    & $python -m ml.train --synthetic --output models/demo
    if ($LASTEXITCODE -ne 0) { throw 'Model training failed.' }
} finally { Pop-Location }
& $python scripts\init_env.py
if ($LASTEXITCODE -ne 0) { throw 'Configuration creation failed.' }
Push-Location frontend
try {
    & npm.cmd ci --cache (Join-Path $PSScriptRoot '.cache\npm') --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Frontend installation failed.' }
} finally { Pop-Location }
if (-not $SkipEmbeddings) {
    & $python scripts\download_models.py
    if ($LASTEXITCODE -ne 0) { Write-Warning 'Semantic model download failed. Lexical retrieval still works. Retry: .\.venv\Scripts\python.exe scripts\download_models.py' }
}
Write-Host 'Ready. Run .\start.ps1 and open http://localhost:3000'
