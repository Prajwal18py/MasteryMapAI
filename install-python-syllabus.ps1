param([string]$Email = '', [string]$Database = '')
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path $python)) { throw 'Copy this patch into your working project root, alongside start.ps1 and .venv.' }
$arguments = @('scripts\install_python_syllabus.py')
if ($Email) { $arguments += @('--email', $Email) }
if ($Database) { $arguments += @('--database', $Database) }
& $python @arguments
if ($LASTEXITCODE -ne 0) { throw 'Syllabus installation failed. See the message above.' }
