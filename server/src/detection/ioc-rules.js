/**
 * bixtx.com Server — IOC Detection Rules (Defensive Security)
 *
 * Server-side indicator-of-compromise rules evaluated against alert payloads
 * arriving from agents.  Produces enriched threat assessments that the admin
 * dashboard can surface as structured findings.
 *
 * Two categories of rules:
 *
 *   1. Agent-reported alerts  — ANALYSIS_ALERT, DANGER_ALERT, EMERGENCY_ALERT
 *      events sent by agents when they detect reverse-engineering, hostile
 *      commands, or physical emergencies.
 *
 *   2. Behavioural IOCs       — patterns derived from DATA_BATCH records that
 *      indicate the *monitored device* is running forensic/analysis tools,
 *      which the server can independently correlate across agents.
 *
 * Usage:
 *   const { evaluateAlert, enrichAlert } = require("./detection/ioc-rules");
 *   const result = evaluateAlert("ANALYSIS_ALERT", payload);
 *   // result → { severity, category, indicators, recommendation, mitre }
 */

"use strict";

// ── MITRE ATT&CK reference IDs used in findings ──────────────────────────────
const MITRE = {
  T1055:  "T1055  — Process Injection",
  T1082:  "T1082  — System Information Discovery",
  T1083:  "T1083  — File and Directory Discovery",
  T1518:  "T1518  — Software Discovery",
  T1057:  "T1057  — Process Discovery",
  T1040:  "T1040  — Network Sniffing",
  T1557:  "T1557  — Man-in-the-Middle",
  T1036:  "T1036  — Masquerading",
  T1497:  "T1497  — Virtualization/Sandbox Evasion",
  T1622:  "T1622  — Debugger Evasion",
  T1112:  "T1112  — Modify Registry",
  T1059:  "T1059  — Command and Scripting Interpreter",
};

// ── Rule definitions ──────────────────────────────────────────────────────────

const ALERT_RULES = [

  // ── Debugger / tracer rules ─────────────────────────────────────────────────

  {
    id:        "AA-001",
    event:     "PTRACE_ATTACHED",
    severity:  "CRITICAL",
    category:  "Dynamic Analysis — Debugger Attached",
    summary:   "A debugger has attached to the agent process via ptrace(2). This indicates live debugging by an investigator.",
    indicators: ["TracerPid non-zero in /proc/self/status", "ptrace PTRACE_ATTACH syscall"],
    recommendation: "Rotate agent identity immediately. Audit device access logs for the user responsible. Revoke device credentials if compromised.",
    mitre:     [MITRE.T1622],
  },

  {
    id:        "AA-002",
    event:     "DEBUGGER_INSPECT_FLAG",
    severity:  "HIGH",
    category:  "Dynamic Analysis — V8 Inspector Active",
    summary:   "The Node.js V8 inspector is active on the agent process (--inspect or --debug flag). An analyst can step through code and inspect all variables.",
    indicators: ["--inspect / --inspect-brk in process.execArgv", "Inspector WebSocket port open"],
    recommendation: "Terminate agent and restart clean. Investigate who started the process with inspector flags. Check if a second actor has access to the system.",
    mitre:     [MITRE.T1622, MITRE.T1059],
  },

  {
    id:        "AA-003",
    event:     "TIMING_ANOMALY_DEBUGGER",
    severity:  "MEDIUM",
    category:  "Dynamic Analysis — Execution Timing Anomaly",
    summary:   "Tight-loop execution timing is anomalously slow, consistent with a debugger single-stepping through code or a heavily throttled sandbox.",
    indicators: ["Loop timing >80ms (expected <5ms on native hardware)"],
    recommendation: "Correlate with other sandbox indicators. If confirmed, trigger mutation to change C2 endpoint.",
    mitre:     [MITRE.T1497, MITRE.T1622],
  },

  // ── RE tool rules ───────────────────────────────────────────────────────────

  {
    id:        "AA-010",
    event:     "RE_TOOL_RUNNING",
    severity:  "HIGH",
    category:  "Reverse Engineering — Analysis Tool Active",
    summary:   "A known reverse-engineering tool is running on the device. An analyst is actively examining binary or runtime behaviour.",
    indicators: ["IDA Pro / Ghidra / Radare2 / x64dbg / Hopper / Binary Ninja / strace / ltrace detected in process list"],
    recommendation: "Immediately rotate agent identity and C2 endpoint. File is likely being analysed statically or dynamically. Consider switching to backup C2.",
    mitre:     [MITRE.T1057, MITRE.T1518, MITRE.T1622],
  },

  {
    id:        "AA-011",
    event:     "FRIDA_ENV_VAR",
    severity:  "CRITICAL",
    category:  "Dynamic Instrumentation — Frida Framework Detected",
    summary:   "Frida dynamic instrumentation framework environment variable detected. Frida can intercept any function call, modify return values, and exfiltrate all runtime data.",
    indicators: ["FRIDA_AGENT_PATH or FRIDA_SCRIPT env var set"],
    recommendation: "Emergency mutation required. Frida gives analyst full runtime control. Treat agent as fully compromised. Rotate all credentials.",
    mitre:     [MITRE.T1055, MITRE.T1622],
  },

  {
    id:        "AA-012",
    event:     "FRIDA_INJECTED_LIBRARY",
    severity:  "CRITICAL",
    category:  "Dynamic Instrumentation — Frida Gadget Injected",
    summary:   "Frida gadget or agent library found in the process memory map. The agent is being fully instrumented — all function calls and data are observable.",
    indicators: ["frida-agent*.so or frida-gadget found in /proc/self/maps"],
    recommendation: "Treat as full compromise. Emergency mutation, credential rotation, and device quarantine required.",
    mitre:     [MITRE.T1055],
  },

  {
    id:        "AA-013",
    event:     "LIBRARY_INJECTION_ENV",
    severity:  "HIGH",
    category:  "Library Injection — LD_PRELOAD / DYLD_INSERT_LIBRARIES",
    summary:   "Library injection environment variable detected. An external library is being loaded into the agent process, potentially intercepting all function calls.",
    indicators: ["LD_PRELOAD / DYLD_INSERT_LIBRARIES set to external path"],
    recommendation: "Identify the injected library. This is a common technique for hooking crypto functions to capture decrypted traffic.",
    mitre:     [MITRE.T1055],
  },

  {
    id:        "AA-014",
    event:     "REQUIRE_CACHE_INJECTION",
    severity:  "MEDIUM",
    category:  "Code Injection — Node.js require() Hijack",
    summary:   "Unknown modules found in Node.js require.cache. An external actor may have injected code via require() hooks or module loader manipulation.",
    indicators: ["Non-agent, non-node_modules paths in require.cache"],
    recommendation: "Inspect the injected module paths. This could indicate a supply-chain compromise or active instrumentation.",
    mitre:     [MITRE.T1055, MITRE.T1059],
  },

  // ── Network MITM rules ──────────────────────────────────────────────────────

  {
    id:        "AA-020",
    event:     "CERT_FINGERPRINT_MISMATCH",
    severity:  "CRITICAL",
    category:  "Network MITM — TLS Certificate Mismatch",
    summary:   "The TLS certificate presented by the C2 server does not match the pinned fingerprint. A man-in-the-middle proxy (Burp Suite, mitmproxy, Fiddler, Charles) is intercepting all C2 traffic.",
    indicators: ["TLS certificate fingerprint changed from expected value"],
    recommendation: "All C2 traffic is being observed in plaintext by the analyst. Cease all sensitive operations. Rotate C2 to backup endpoint immediately.",
    mitre:     [MITRE.T1557, MITRE.T1040],
  },

  {
    id:        "AA-021",
    event:     "PROXY_ENV_VAR",
    severity:  "MEDIUM",
    category:  "Network Interception — System Proxy Configured",
    summary:   "HTTP/S/SOCKS proxy environment variable detected. All outbound network traffic may be routed through an analyst-controlled proxy.",
    indicators: ["HTTP_PROXY / HTTPS_PROXY / ALL_PROXY / SOCKS_PROXY set"],
    recommendation: "Verify whether proxy is corporate (benign) or analyst-controlled. If analyst proxy, rotate C2 endpoint and avoid sending new data until cleared.",
    mitre:     [MITRE.T1557, MITRE.T1040],
  },

  // ── Container / VM / sandbox rules ─────────────────────────────────────────

  {
    id:        "AA-030",
    event:     "CONTAINER_ARTEFACT",
    severity:  "MEDIUM",
    category:  "Sandbox Detection — Container Environment",
    summary:   "Container filesystem artefacts detected (Docker, Podman, LXC). The agent may be running in an isolated analysis sandbox.",
    indicators: ["/.dockerenv or /.containerenv present"],
    recommendation: "Verify if container deployment is expected. If not, assume malware sandbox — enter silent mode, feed decoy traffic.",
    mitre:     [MITRE.T1497],
  },

  {
    id:        "AA-031",
    event:     "VM_CPU_MODEL",
    severity:  "MEDIUM",
    category:  "Sandbox Detection — Hypervisor CPU",
    summary:   "CPU model string matches a known hypervisor (QEMU, VMware, VirtualBox, Hyper-V). Device may be a malware analysis VM.",
    indicators: ["os.cpus()[0].model contains hypervisor vendor string"],
    recommendation: "Correlate with other sandbox signals. If high confidence, enter silent mode and delay mutation to avoid triggering sandbox timeout.",
    mitre:     [MITRE.T1497],
  },

  {
    id:        "AA-032",
    event:     "CI_ENVIRONMENT",
    severity:  "LOW",
    category:  "Automated Environment — CI/CD Runner",
    summary:   "CI/CD pipeline environment variable detected. Agent may have been deployed into an automated testing or analysis pipeline.",
    indicators: ["CI / GITHUB_ACTIONS / GITLAB_CI / TRAVIS etc. set"],
    recommendation: "Verify whether CI deployment is expected. If not, treat as automated analysis.",
    mitre:     [MITRE.T1497],
  },

  // ── Source integrity ────────────────────────────────────────────────────────

  {
    id:        "AA-040",
    event:     "SOURCE_FILE_TAMPERED",
    severity:  "CRITICAL",
    category:  "Source Tampering — Agent Code Modified",
    summary:   "A source file SHA-256 hash no longer matches the known-good value set at install time. An analyst has patched the agent binary or source to instrument it.",
    indicators: ["SHA-256 mismatch on .js source file vs install-time baseline"],
    recommendation: "Agent is compromised. All operations are potentially observable. Emergency mutation and full re-install required. Treat all data from this device as analyst-controlled.",
    mitre:     [MITRE.T1036, MITRE.T1055],
  },

  // ── Analyst environment ─────────────────────────────────────────────────────

  {
    id:        "AA-050",
    event:     "ANALYST_USERNAME",
    severity:  "MEDIUM",
    category:  "Analyst Environment — Suspicious Username",
    summary:   "System username matches a known malware analysis sandbox pattern (admin, malware, analyst, sandbox, cuckoo, etc.).",
    indicators: ["os.userInfo().username matches analyst pattern list"],
    recommendation: "Correlate with other sandbox indicators. High likelihood of automated sandbox analysis.",
    mitre:     [MITRE.T1497, MITRE.T1082],
  },

  {
    id:        "AA-051",
    event:     "FRESH_BOOT",
    severity:  "LOW",
    category:  "Analyst Environment — Fresh System Boot",
    summary:   "System uptime under 5 minutes. Device may have been freshly booted from a clean snapshot for analysis.",
    indicators: ["os.uptime() < 300 seconds"],
    recommendation: "Combine with other indicators. Alone this is low confidence, but alongside VM/proxy indicators it strongly suggests a sandbox.",
    mitre:     [MITRE.T1497],
  },

  // ── Hostile command interception rules ──────────────────────────────────────

  {
    id:        "CG-001",
    event:     "AI_COMMAND_INTERCEPTED",
    severity:  "CRITICAL",
    category:  "Command Integrity — AI-Origin Command Blocked",
    summary:   "An AI system (GPT, Claude, Gemini, LangChain, etc.) attempted to issue a command to the agent. Blocked by CommandGuard. This indicates a compromised admin session or a weaponised AI proxy attacking the C2 channel.",
    indicators: ["AI framework structural fingerprint in command payload"],
    recommendation: "Audit admin session for compromise. Check C2 channel for MITM. Rotate admin credentials and enroll key. Review CommandGuard threat log for pattern.",
    mitre:     [MITRE.T1059, MITRE.T1036],
  },

  {
    id:        "CG-002",
    event:     "COMMAND_LOCKOUT",
    severity:  "HIGH",
    category:  "Command Integrity — Brute-Force Command Lockout",
    summary:   "Rate limit exceeded: more than 5 unsigned/invalid commands in 30 seconds. This indicates a brute-force or automated command injection attack on the C2 channel.",
    indicators: ["RATE_LIMIT_MAX exceeded within RATE_WINDOW_MS"],
    recommendation: "Investigate C2 traffic source. Block the offending IP at the server. Rotate enroll key. Agent is locked out for 3 minutes automatically.",
    mitre:     [MITRE.T1059],
  },
];

// ── Rule evaluation ───────────────────────────────────────────────────────────

/**
 * Evaluate an inbound agent alert against the IOC rule set.
 *
 * @param {string} alertType   The alert event name (e.g. "PTRACE_ATTACHED")
 * @param {object} payload     The full alert payload from the agent
 * @returns {object|null}      Matched rule enriched with payload context, or null
 */
function evaluateAlert(alertType, payload = {}) {
  const rule = ALERT_RULES.find(r => r.event === alertType);
  if (!rule) return null;

  return {
    ruleId:         rule.id,
    event:          rule.event,
    severity:       payload.severity || rule.severity,
    category:       rule.category,
    summary:        rule.summary,
    detail:         payload.detail   || "",
    indicators:     rule.indicators,
    recommendation: rule.recommendation,
    mitre:          rule.mitre,
    deviceId:       payload.deviceId,
    hostname:       payload.hostname || "unknown",
    platform:       payload.platform || "unknown",
    ts:             payload.ts       || Date.now(),
    alertId:        payload.alertId  || `ioc-${Date.now()}`,
    raw:            payload,
  };
}

/**
 * Enrich any inbound alert with severity override and rule context.
 * Handles both known-rule alerts and unknown alerts (passes through with defaults).
 */
function enrichAlert(type, payload = {}) {
  const matched = evaluateAlert(type, payload);
  if (matched) return matched;

  // Unknown alert type — pass through with generic structure
  return {
    ruleId:         "UNKNOWN",
    event:          type,
    severity:       payload.severity || "MEDIUM",
    category:       "Unclassified Alert",
    summary:        payload.title    || type,
    detail:         payload.detail   || "",
    indicators:     [],
    recommendation: "Investigate alert context manually.",
    mitre:          [],
    deviceId:       payload.deviceId,
    hostname:       payload.hostname || "unknown",
    platform:       payload.platform || "unknown",
    ts:             payload.ts       || Date.now(),
    alertId:        payload.alertId  || `ioc-${Date.now()}`,
    raw:            payload,
  };
}

/**
 * Correlate multiple recent alerts from the same device to detect
 * multi-stage analysis attacks (e.g. VM + proxy + RE tool all at once).
 *
 * @param {Array}  recentAlerts  Array of evaluated alerts from the same device
 * @returns {object|null}        Correlation finding if threshold exceeded
 */
function correlateAlerts(recentAlerts) {
  if (!recentAlerts || recentAlerts.length < 2) return null;

  const sandboxIndicators = recentAlerts.filter(a =>
    ["CONTAINER_ARTEFACT","VM_CPU_MODEL","VM_HYPERVISOR_FLAG","CI_ENVIRONMENT",
     "ANALYST_USERNAME","FRESH_BOOT","VM_LOW_RESOURCES"].includes(a.event)
  );
  const dynamicIndicators = recentAlerts.filter(a =>
    ["PTRACE_ATTACHED","DEBUGGER_INSPECT_FLAG","RE_TOOL_RUNNING",
     "FRIDA_ENV_VAR","FRIDA_INJECTED_LIBRARY","TIMING_ANOMALY_DEBUGGER"].includes(a.event)
  );
  const networkIndicators = recentAlerts.filter(a =>
    ["CERT_FINGERPRINT_MISMATCH","PROXY_ENV_VAR"].includes(a.event)
  );

  // High-confidence: sandbox + dynamic analysis together
  if (sandboxIndicators.length >= 1 && dynamicIndicators.length >= 1) {
    return {
      correlationId:  `corr-${Date.now()}`,
      severity:       "CRITICAL",
      category:       "Correlated — Active Sandbox Analysis",
      summary:        "Multiple independent indicators confirm this device is in an active analysis environment with dynamic instrumentation.",
      components:     [...sandboxIndicators, ...dynamicIndicators].map(a => a.event),
      recommendation: "Emergency mutation + C2 rotation required. Analyst has a high-fidelity view of agent operations.",
    };
  }

  // Medium: network interception + any other indicator
  if (networkIndicators.length >= 1 && (sandboxIndicators.length + dynamicIndicators.length) >= 1) {
    return {
      correlationId:  `corr-${Date.now()}`,
      severity:       "HIGH",
      category:       "Correlated — Network Interception + Analysis Tools",
      summary:        "Network traffic is being intercepted alongside evidence of analysis tooling. C2 communications are likely being observed.",
      components:     [...networkIndicators, ...sandboxIndicators, ...dynamicIndicators].map(a => a.event),
      recommendation: "Rotate C2 endpoint immediately. Do not transmit sensitive data until C2 is confirmed clean.",
    };
  }

  return null;
}

module.exports = { evaluateAlert, enrichAlert, correlateAlerts, ALERT_RULES };
