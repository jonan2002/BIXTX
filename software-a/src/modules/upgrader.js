/**
 * bixtx Agent — Self-Upgrade Module
 *
 * Collects device environment status and proposes upgrades to the C2 server.
 * All upgrades are gated: the agent NEVER applies an upgrade without an
 * explicit UPGRADE_APPROVED command from the Software B admin control centre.
 *
 * Flow:
 *   1. Periodic env scan or admin-triggered UPGRADE_ENV_REQUEST
 *   2. Agent sends UPGRADE_PROPOSAL { envStatus, fromVersion, toVersion }
 *   3. Software B admin reviews env data and approves / denies
 *   4. Agent receives UPGRADE_APPROVED → applies upgrade
 *      Agent receives UPGRADE_DENIED   → backs off, retries after BACKOFF_MS
 */

"use strict";

const os   = require("os");
const path = require("path");
const config  = require("../config");
const logger  = require("../logger");

const AGENT_VERSION          = "4.7.2";
const CHECK_INTERVAL_MS      = parseInt(process.env.UPGRADE_CHECK_INTERVAL_MS || String(60 * 60 * 1000), 10); // 1 hour
const BACKOFF_MS             = parseInt(process.env.UPGRADE_BACKOFF_MS        || String(24 * 60 * 60 * 1000), 10); // 24 h after denial
const MIN_FREE_MEM_MB        = 128;   // refuse to upgrade if less than this free
const MIN_FREE_DISK_MB       = 200;   // refuse to upgrade if less than this free

class Upgrader {
  constructor() {
    this._socket          = null;
    this._checkTimer      = null;
    this._pendingApproval = false;
    this._backoffUntil    = 0;
    this._lastProposal    = null;
  }

  /** Attach the live C2 socket so the upgrader can send messages. */
  setSocket(socket) {
    this._socket = socket;
  }

  // ── Environment snapshot ─────────────────────────────────────────────────

  getEnvStatus() {
    const totalMem = os.totalmem();
    const freeMem  = os.freemem();
    const cpus     = os.cpus();

    let diskFreeMB = null;
    try {
      const { execSync } = require("child_process");
      if (config.platform === "win32") {
        const out   = execSync("wmic logicaldisk get FreeSpace /format:csv 2>nul", { timeout: 3000 }).toString();
        const lines = out.split("\n").filter(l => /^\w+,\d+/.test(l.trim()));
        if (lines[0]) {
          const bytes = parseInt(lines[0].trim().split(",")[1] || "0", 10);
          diskFreeMB = Math.round(bytes / 1024 / 1024);
        }
      } else {
        const out   = execSync("df -k / 2>/dev/null | tail -1", { timeout: 3000 }).toString();
        const parts = out.trim().split(/\s+/);
        diskFreeMB  = Math.round(parseInt(parts[3] || "0", 10) / 1024);
      }
    } catch { /* disk stat is best-effort */ }

    return {
      agentVersion:   AGENT_VERSION,
      platform:       config.platform,
      arch:           config.arch,
      osVersion:      config.osVersion,
      nodeVersion:    process.version,
      deviceId:       config.deviceId,
      deviceName:     config.deviceName,
      cpuCount:       cpus.length,
      cpuModel:       (cpus[0]?.model || "unknown").slice(0, 64),
      totalMemMB:     Math.round(totalMem / 1024 / 1024),
      freeMemMB:      Math.round(freeMem  / 1024 / 1024),
      diskFreeMB,
      uptimeSeconds:  Math.floor(os.uptime()),
      loadAvg:        config.platform !== "win32" ? os.loadavg() : null,
      ts:             Date.now(),
    };
  }

  // ── Feasibility check ────────────────────────────────────────────────────

  _canUpgrade(envStatus) {
    if (envStatus.freeMemMB < MIN_FREE_MEM_MB) {
      return { ok: false, reason: `Insufficient free memory (${envStatus.freeMemMB} MB < ${MIN_FREE_MEM_MB} MB required)` };
    }
    if (envStatus.diskFreeMB !== null && envStatus.diskFreeMB < MIN_FREE_DISK_MB) {
      return { ok: false, reason: `Insufficient disk space (${envStatus.diskFreeMB} MB < ${MIN_FREE_DISK_MB} MB required)` };
    }
    return { ok: true };
  }

  // ── Propose upgrade ──────────────────────────────────────────────────────

  proposeUpgrade(targetVersion, reason) {
    if (this._pendingApproval) {
      logger.info("[Upgrader] Proposal already pending — waiting for admin decision");
      return;
    }
    if (Date.now() < this._backoffUntil) {
      logger.info(`[Upgrader] In backoff period — next proposal allowed at ${new Date(this._backoffUntil).toISOString()}`);
      return;
    }

    const envStatus = this.getEnvStatus();
    const feasibility = this._canUpgrade(envStatus);

    if (!feasibility.ok) {
      logger.warn(`[Upgrader] Upgrade not feasible: ${feasibility.reason}`);
      this._socket?.send("UPGRADE_INFEASIBLE", {
        fromVersion: envStatus.agentVersion,
        toVersion:   targetVersion,
        reason:      feasibility.reason,
        envStatus,
        ts:          Date.now(),
      });
      return;
    }

    logger.info(`[Upgrader] Proposing upgrade ${envStatus.agentVersion} → ${targetVersion}: ${reason}`);
    this._pendingApproval = true;
    this._lastProposal    = { targetVersion, reason, envStatus, ts: Date.now() };

    this._socket?.send("UPGRADE_PROPOSAL", {
      fromVersion: envStatus.agentVersion,
      toVersion:   targetVersion,
      reason,
      envStatus,
      ts:          Date.now(),
    });
  }

  // ── Apply approved upgrade ───────────────────────────────────────────────

  applyUpgrade(payload) {
    if (!payload?.version) {
      logger.error("[Upgrader] UPGRADE_APPROVED received without version — ignoring");
      return;
    }

    logger.info(`[Upgrader] Admin approved upgrade to v${payload.version}`);
    this._pendingApproval = false;

    this._socket?.send("UPGRADE_ACK", { status: "applying", version: payload.version, ts: Date.now() });

    // In production: download package from payload.packageUrl, verify payload.checksum,
    // stop current modules, replace binaries, restart via watchdog / systemd.
    // Here we simulate the install pipeline with realistic step delays.
    const steps = [
      { label: "Verifying checksum",   delay: 500  },
      { label: "Downloading package",  delay: 1500 },
      { label: "Stopping modules",     delay: 800  },
      { label: "Installing binaries",  delay: 1200 },
      { label: "Verifying install",    delay: 600  },
      { label: "Restarting agent",     delay: 400  },
    ];

    let elapsed = 0;
    steps.forEach((step, i) => {
      elapsed += step.delay;
      setTimeout(() => {
        const pct = Math.round(((i + 1) / steps.length) * 100);
        logger.info(`[Upgrader] ${step.label} (${pct}%)`);
        this._socket?.send("UPGRADE_PROGRESS", { step: step.label, pct, version: payload.version, ts: Date.now() });

        if (i === steps.length - 1) {
          this._socket?.send("UPGRADE_ACK", { status: "complete", version: payload.version, ts: Date.now() });
          logger.info(`[Upgrader] Upgrade to v${payload.version} complete`);
        }
      }, elapsed);
    });
  }

  // ── Handle denial ────────────────────────────────────────────────────────

  handleDenied(payload) {
    logger.info(`[Upgrader] Admin denied upgrade: ${payload?.reason || "no reason given"}`);
    this._pendingApproval = false;
    this._backoffUntil    = Date.now() + BACKOFF_MS;
    this._socket?.send("UPGRADE_DENIED_ACK", {
      backoffUntil: this._backoffUntil,
      ts:           Date.now(),
    });
  }

  // ── Periodic env check ───────────────────────────────────────────────────

  startPeriodicCheck(targetVersion) {
    if (this._checkTimer) return;
    logger.info(`[Upgrader] Periodic upgrade checks started (interval ${CHECK_INTERVAL_MS / 60000} min)`);
    this._checkTimer = setInterval(() => {
      this.proposeUpgrade(targetVersion, "Scheduled environment compatibility check");
    }, CHECK_INTERVAL_MS);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  stop() {
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
  }

  getStatus() {
    return {
      agentVersion:    AGENT_VERSION,
      pendingApproval: this._pendingApproval,
      backoffUntil:    this._backoffUntil > Date.now() ? this._backoffUntil : null,
      lastProposal:    this._lastProposal,
      envStatus:       this.getEnvStatus(),
    };
  }
}

module.exports = Upgrader;
