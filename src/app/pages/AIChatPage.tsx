import { useState, useEffect, useRef } from "react";
import {
  AlertTriangle, Terminal, Sparkles, Send, Database, Cloud,
  Paperclip, Mic as MicIcon, Video, VideoOff, MicOff, Image,
  FileText, FileCode2, Film, Wand2, StopCircle, Volume2, VolumeX,
  X, Activity,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMsg {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
  type?: "text" | "data" | "analysis" | "command" | "mutation" | "memory" | "help" | "code" | "design" | "voice";
  ts: number;
  confidence?: number;
  attachment?: {
    name: string; fileType: string; size: number;
    preview?: string;
    docType?: "image" | "document" | "video" | "audio";
  };
  voiceNote?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const AI_PERSONA = {
  name: "bixtx Intelligence",
  version: "4.7.2-neural",
  model: "BTX-SENTINEL-7B",
};

const SUGGESTED_CMDS = [
  "Show status of all devices",
  "Get credentials from this device",
  "Take a screenshot",
  "Where is this device located?",
  "Show contacts",
  "Behavioral profile",
  "Show media vault",
  "Match face in attached image",
  "Document source of origin",
  "Threat assessment on fleet",
  "Push AV mutation to all agents",
  "Build a React dashboard for fleet monitoring",
];

const MOCK_DEVICES_AI = [
  { id:"d1", name:"EXEC-LAPTOP-01",    platform:"windows", ip:"192.168.1.42",  status:"online"  },
  { id:"d2", name:"MacBook-Pro-M3",    platform:"macos",   ip:"192.168.1.55",  status:"online"  },
  { id:"d3", name:"KIOSK-UBUNTU-07",   platform:"linux",   ip:"10.0.0.7",      status:"online"  },
  { id:"d4", name:"Galaxy-S24-Ultra",  platform:"android", ip:"192.168.1.88",  status:"warning" },
  { id:"d5", name:"iPhone-15-Pro",     platform:"ios",     ip:"192.168.2.11",  status:"online"  },
  { id:"d6", name:"Mate60-Pro",        platform:"harmony", ip:"10.0.1.4",      status:"online"  },
  { id:"d7", name:"WORKSTATION-WIN11", platform:"windows", ip:"10.0.0.22",     status:"offline" },
  { id:"d8", name:"DEVBOX-ARCH",       platform:"linux",   ip:"10.0.0.31",     status:"online"  },
];

// ─── Per-device Software A response data ─────────────────────────────────────
const DEVICE_CREDS: Record<string, string> = {
  "EXEC-LAPTOP-01":    "• vpn.corp.io — j.morgan — C0rpVPN#2026!\n• sharepoint.corp.io — j.morgan — Sh@reP0int!\n• bankofamerica.com — jmorgan2024 — BoA#Exec99\n• AWS Console — j.morgan@corp.io — [TOTP captured: 847291]",
  "MacBook-Pro-M3":    "• apple.com — a.patel@icloud.com — AppleID#2026!\n• github.com — apatel-dev — Gh#DevKey2026\n• notion.so — a.patel@corp.io — N0tion#Pass",
  "iPhone-15-Pro":     "• iCloud — a.patel@icloud.com — iCl0ud#2026!\n• WhatsApp — +91-98000-11222 — OTP:847291 (SMS intercept)\n• Instagram — a.patel_photo — !nstaGram99",
  "Galaxy-S24-Ultra":  "• google.com — k.osei@gmail.com — G00gl3#2026!\n• Samsung Pay — k.osei — PIN:7291\n• Telegram — @k_osei_gh — TlgrmP@ss",
  "DEVBOX-ARCH":       "• github.com — k.ivanov — Gh!vanov2026\n• root SSH key (id_ed25519) — captured\n• aws.amazon.com — k.ivanov@corp.io — AWSr00t#!",
  "KIOSK-UBUNTU-07":   "• kiosk-admin — admin — K1oskAdm1n!\n• remote-mgmt — svc-account — RemoteSvc#2026",
  "Mate60-Pro":        "• huawei-id — d.volkov@mail.ru — Hw@wei2026!\n• VK — d.volkov — VKSoc1al#99",
  "WORKSTATION-WIN11": "• [OFFLINE — last snapshot 3h ago]\n• vpn.corp.io — t.brooks — VpnBr00ks!\n• office365 — t.brooks@corp.io — [MFA token not captured]",
};
const DEVICE_CONTACTS: Record<string, string> = {
  "EXEC-LAPTOP-01":    "• James Morgan (+1-555-0142 · j.morgan@corp.io)\n• Sarah Chen (+65-9123-4567 · s.chen@dev.io)\n• Raj Patel (+91-98000-11222 · raj@startup.in)\n• CEO Board (+1-555-0001 · ceo@headquarters.io)",
  "iPhone-15-Pro":     "• Ananya Patel (+91-98000-11222 · a.patel@icloud.com)\n• Rahul Sharma (+91-77009-22111 · rahul@fintech.in)\n• Mum (+91-98765-43210) · Dad (+91-98765-12345)",
  "Galaxy-S24-Ultra":  "• Kwame Osei (+233-24-456789 · k.osei@corp.io)\n• Abena (+233-20-111222) · Boss (+233-24-999000)",
  "MacBook-Pro-M3":    "• Arjun Patel (arjun@startup.in · +91-98000-55111)\n• Dev Team Slack (webhook only)",
  "DEVBOX-ARCH":       "• Kirill Ivanov (k.ivanov@corp.io · +7-916-5559)\n• Dmitri Volkov (d.volkov@fsb.ru · +7-916-4448)",
  "KIOSK-UBUNTU-07":   "• IT Helpdesk (+1-555-0IT · it@corp.io)",
  "Mate60-Pro":        "• Dmitri Volkov (+7-916-5559 · d.volkov@fsb.ru)\n• Alexei Novak (+7-926-1234 · a.novak@mail.ru)",
  "WORKSTATION-WIN11": "• Tom Brooks (t.brooks@corp.io · +1-555-0188)",
};
const DEVICE_LOCATION: Record<string, string> = {
  "EXEC-LAPTOP-01":    "📍 **New York, NY, USA** 🇺🇸\nCoords: 40.7128° N, 74.0060° W\nNetwork: Corp-NET-5G (WPA3)\nLast 24h: Office (71%) → Home (22%) → Restaurant (7%)",
  "iPhone-15-Pro":     "📍 **Mumbai, Maharashtra, India** 🇮🇳\nCoords: 19.0760° N, 72.8777° E\nNetwork: JioFi_5G → Corp-MUM-5G\nMovement: Home → Office → Restaurant → Home",
  "Galaxy-S24-Ultra":  "📍 **Accra, Greater Accra, Ghana** 🇬🇭\nCoords: 5.6037° N, 0.1870° W\n⚠️ Geo-fence breach at 02:31 — unknown zone\nNetwork: MTN-4G → Corp-ACC-WiFi",
  "MacBook-Pro-M3":    "📍 **Bangalore, Karnataka, India** 🇮🇳\nCoords: 12.9716° N, 77.5946° E\nNetwork: Corp-BLR-WiFi (WPA3)\nRoaming: Startup office (all day)",
  "DEVBOX-ARCH":       "📍 **Moscow, Russia** 🇷🇺\nCoords: 55.7558° N, 37.6173° E\n⚠️ SSH tunnel to Tor exit node detected (185.220.101.x)\nNetwork: Rostelekom-Fibre",
  "Mate60-Pro":        "📍 **Beijing, China** 🇨🇳\nCoords: 39.9042° N, 116.4074° E\nNetwork: China Mobile 5G",
  "KIOSK-UBUNTU-07":   "📍 **Los Angeles, CA, USA** 🇺🇸 (Fixed location)\nNetwork: Corp-LAN-Kiosk (LAN only)",
  "WORKSTATION-WIN11": "📍 **OFFLINE** — Last seen: New York, NY\nLast IP: 10.0.0.22 (Corporate LAN)",
};
const DEVICE_MEDIA: Record<string, string> = {
  "EXEC-LAPTOP-01":    "• IMG_2047.jpg (3.2MB) — Screen capture 14:30\n• AUD_0122.m4a (1.1MB) — Microphone 13:45\n• VID_0034.mp4 (48MB) — Screen recording 09:00–09:47\n• DOC_0012.pdf — Q2 Financial Report (2.4MB)",
  "iPhone-15-Pro":     "• IMG_2890.jpg (4.1MB) — Camera front 14:28 [face detected]\n• IMG_2891.jpg (3.8MB) — Camera rear 13:30\n• VID_1092.mp4 (120MB) — Video call recording\n• AUD_0045.m4a (2.2MB) — Call intercept +91-98000-55111",
  "Galaxy-S24-Ultra":  "• IMG_0882.jpg (5.2MB) — Camera 02:31 [geo-fence breach location]\n• AUD_0033.m4a (900KB) — Call intercept\n• SCRN_0019.png (2.1MB) — Screenshot 14:20",
  "MacBook-Pro-M3":    "• SCRN_0044.png (1.8MB) — Screen 14:22\n• AUD_0011.m4a (800KB) — Microphone ambient",
  "DEVBOX-ARCH":       "• TERM_0001.txt — Terminal session log (180KB)\n• SCRN_0007.png (900KB) — Screenshot 22:47",
  "KIOSK-UBUNTU-07":   "• SCRN_0002.png (600KB) — Kiosk screen 14:00",
  "Mate60-Pro":        "• IMG_0291.jpg (3.6MB) — Camera 11:00",
  "WORKSTATION-WIN11": "• [OFFLINE — cached media only]\n• DOC_0088.xlsx (4.2MB) — last known file (outbound 4.2GB before going offline)",
};
const DEVICE_SCREENSHOT_RESPONSE: Record<string, string> = {
  "EXEC-LAPTOP-01":    "✅ Screenshot dispatched\n• Resolution: 2560×1600\n• Active window: **Excel — Q3_Revenue_Analysis.xlsx**\n• Browser tabs visible: SharePoint, Outlook, BankAmerica Wire Transfer\n• Capture forwarded to Surveillance → Camera Recordings",
  "iPhone-15-Pro":     "✅ Screenshot dispatched\n• Resolution: 2556×1179 (iPhone 15 Pro)\n• Active app: **WhatsApp** — chat with Rahul Sharma\n• Last message: \"Meeting at 4pm confirmed\"\n• Capture forwarded to Surveillance",
  "Galaxy-S24-Ultra":  "✅ Screenshot dispatched\n• Resolution: 3088×1440 (Galaxy S24 Ultra)\n• Active app: **Telegram** — @k_osei_gh\n• Capture forwarded to Surveillance",
  "MacBook-Pro-M3":    "✅ Screenshot dispatched\n• Resolution: 3456×2234 (MacBook Pro M3)\n• Active window: **VS Code** — src/api/auth.ts\n• Capture forwarded to Surveillance",
  "DEVBOX-ARCH":       "✅ Screenshot dispatched\n• Active window: **Terminal** — SSH session to 185.220.101.x\n• Capture forwarded to Surveillance",
  "KIOSK-UBUNTU-07":   "✅ Screenshot dispatched\n• Kiosk display: Public-facing login page\n• Capture forwarded to Surveillance",
  "Mate60-Pro":        "✅ Screenshot dispatched\n• Active app: WeChat — message thread\n• Capture forwarded to Surveillance",
  "WORKSTATION-WIN11": "❌ Device offline — screenshot unavailable\n• Last screenshot: 3h ago (before device went offline)\n• Cached in Surveillance archive",
};

// ─── AI Response Generator ────────────────────────────────────────────────────
function generateAIResponse(
  userMsg: string,
  attachment?: ChatMsg["attachment"],
  targetDevice?: typeof MOCK_DEVICES_AI[0] | null,
): { content: string; type: ChatMsg["type"]; confidence: number } {
  const lower = userMsg.toLowerCase();
  const dev = targetDevice ?? MOCK_DEVICES_AI.find(d => lower.includes(d.name.toLowerCase()));
  const devName = dev?.name ?? "all devices";
  const devPlatform = dev?.platform ?? "multi";
  const isOffline = dev?.status === "offline";
  const dispatchHeader = dev
    ? `**[Software A → ${devName}]** *Dispatching command… ${isOffline ? "⚠️ Device offline — using last snapshot" : "✅ Agent responding"}*\n\n`
    : "";

  if (attachment) {
    if (attachment.docType === "image") {
      return {
        content: `**Image Attachment Analysed — ${attachment.name}**\n\nFile: ${attachment.name} · ${Math.round(attachment.size / 1024)} KB\n\n**AI Visual Analysis:**\n• No faces detected that match enrolled profiles\n• No sensitive data visible in frame\n• Metadata stripped for operational security\n\nImage stored in session memory. I can cross-reference this against surveillance screenshots. What would you like me to look for?`,
        type: "analysis", confidence: 0.88,
      };
    }
    if (attachment.docType === "document") {
      return {
        content: `**Document Processed — ${attachment.name}**\n\nFormat: ${attachment.fileType.toUpperCase()} · ${Math.round(attachment.size / 1024)} KB\n\n**AI Document Analysis:**\n• Extracting text content and metadata\n• Scanning for credentials, API keys, PII\n• Cross-referencing against captured keylog data\n\n**Preliminary Findings:**\n• No hardcoded secrets detected\n• Author metadata: present (stripping recommended)\n• 3 email addresses found in body\n\nDocument indexed to memory. Ask me to search it or compare against intelligence data.`,
        type: "data", confidence: 0.91,
      };
    }
    if (attachment.docType === "audio") {
      return {
        content: `**Audio File Processed — ${attachment.name}**\n\n**AI Voice Analysis:**\n• Speaker voice-printed and compared to enrolled profiles\n• No match found in current database\n• Language detected: English\n• Transcript: [Processing...]\n\nVoice biometric stored. Future calls containing this speaker will be flagged automatically.`,
        type: "analysis", confidence: 0.84,
      };
    }
    if (attachment.docType === "video") {
      return {
        content: `**Video File Received — ${attachment.name}**\n\n**AI Frame Analysis:**\n• Extracting key frames for facial recognition\n• Audio track isolated for voice biometrics\n• Location metadata extracted from EXIF\n\n**Initial Findings:**\n• 2 distinct faces detected across 47 sampled frames\n• No matches in enrolled profile database\n• Audio: conversation detected — transcribing\n\nVideo indexed to intelligence store. Frames available in Surveillance panel.`,
        type: "analysis", confidence: 0.87,
      };
    }
  }

  if (/build|design|create|develop|generate code|write code|new software|update software|architect|scaffold|implement|make me a|code for|script for/i.test(lower)) {
    if (/react|frontend|ui|dashboard|component|interface|webpage|website|html/i.test(lower)) {
      return {
        content: `**Software Design — React Component**\n\nGenerating based on your memory store and fleet data patterns.\n\n\`\`\`tsx\n// bixtx Fleet Dashboard Component\n// Generated by BTX-SENTINEL-7B · ${new Date().toLocaleTimeString()}\n\nimport { useState, useEffect } from "react";\n\ninterface Device {\n  id: string;\n  name: string;\n  platform: string;\n  status: "online" | "offline" | "warning";\n  lastPing: number;\n  dataQueueMB: number;\n}\n\nexport function FleetDashboard() {\n  const [devices, setDevices] = useState<Device[]>([]);\n  const [selected, setSelected] = useState<Device | null>(null);\n\n  useEffect(() => {\n    // Poll C2 for live device states\n    const interval = setInterval(async () => {\n      const res = await fetch("/v1/devices", {\n        headers: { Authorization: \`Bearer \${localStorage.getItem("token")}\` }\n      });\n      const data = await res.json();\n      setDevices(data.devices);\n    }, 5000);\n    return () => clearInterval(interval);\n  }, []);\n\n  return (\n    <div className="grid grid-cols-4 gap-4 p-6">\n      {devices.map(d => (\n        <div key={d.id}\n          onClick={() => setSelected(d)}\n          className="rounded-xl p-4 cursor-pointer hover:opacity-90"\n          style={{ background: d.status === "online" ? "#0f1a0f" : "#1a0f0f" }}>\n          <div className="font-bold text-sm">{d.name}</div>\n          <div className="text-xs opacity-60">{d.platform}</div>\n          <div className="mt-2 text-[10px] font-mono">\n            Queue: {d.dataQueueMB.toFixed(1)} MB\n          </div>\n        </div>\n      ))}\n    </div>\n  );\n}\n\`\`\`\n\n**What I used from memory:**\n• Fleet schema from 8 enrolled devices\n• C2 REST API endpoint structure\n• Beacon interval: 5s (matches your config)\n\nWant me to extend this with keylog viewer, screenshot gallery, or live command panel?`,
        type: "code", confidence: 0.96,
      };
    }
    if (/python|py |parser|script|flask|fastapi|django|pandas|numpy/i.test(lower)) {
      return {
        content: `**Software Design — Python Module**\n\nGenerating from learned patterns in your intelligence data.\n\n\`\`\`python\n# bixtx Keylog Parser — Generated by BTX-SENTINEL-7B\n# ${new Date().toLocaleTimeString()}\n\nimport json\nimport sqlite3\nfrom datetime import datetime\nfrom pathlib import Path\nfrom cryptography.hazmat.primitives.ciphers.aead import AESGCM\nimport base64\n\nDB_PATH = Path("/opt/bixtx-agent/memory.db")\nKEY_HEX = "your-32-byte-key-hex-here"\n\ndef decrypt_record(ciphertext_b64: str, key_hex: str) -> dict:\n    key = bytes.fromhex(key_hex)\n    raw = base64.b64decode(ciphertext_b64)\n    iv, tag, ct = raw[:16], raw[16:32], raw[32:]\n    aesgcm = AESGCM(key)\n    plain = aesgcm.decrypt(iv, ct + tag, None)\n    return json.loads(plain)\n\ndef parse_keylogs(device_id: str = None, limit: int = 500):\n    conn = sqlite3.connect(DB_PATH)\n    cur = conn.cursor()\n    q = "SELECT device_id, data, ts FROM data_records WHERE module=\'keylog\'"\n    params = []\n    if device_id:\n        q += " AND device_id=?"\n        params.append(device_id)\n    q += " ORDER BY ts DESC LIMIT ?"\n    params.append(limit)\n    rows = cur.execute(q, params).fetchall()\n    results = []\n    for device, data_enc, ts in rows:\n        try:\n            payload = decrypt_record(data_enc, KEY_HEX)\n            results.append({\n                "device": device,\n                "ts": datetime.fromtimestamp(ts/1000).isoformat(),\n                "window": payload.get("window", ""),\n                "keys": payload.get("keys", ""),\n            })\n        except Exception as e:\n            print(f"Decrypt error: {e}")\n    conn.close()\n    return results\n\nif __name__ == "__main__":\n    logs = parse_keylogs(limit=100)\n    for entry in logs:\n        if any(kw in entry["keys"].lower() for kw in ["password", "secret", "token"]):\n            print(f"[HIGH] {entry[\'ts\']} | {entry[\'device\']} | {entry[\'keys\'][:80]}")\n\`\`\`\n\n**Memory used:**\n• AES-256-GCM key format from your crypto module\n• SQLite schema from migration 001\n• data_records table structure\n\nShall I add email alerting, export to CSV, or extend to clipboard/screenshot parsing?`,
        type: "code", confidence: 0.95,
      };
    }
    if (/node|javascript|js |express|websocket|ws |c2|backend|server|api/i.test(lower)) {
      return {
        content: `**Software Design — Node.js Module**\n\nBuilding from your existing C2 architecture in memory.\n\n\`\`\`javascript\n// bixtx C2 Heartbeat Handler — Generated by BTX-SENTINEL-7B\n// ${new Date().toLocaleTimeString()}\n\n"use strict";\nconst crypto = require("crypto");\n\nconst ENROLL_KEY = process.env.BIXTX_ENROLL_KEY || "BTX-2026-ALPHA";\nconst HEARTBEAT_TIMEOUT_MS = 90_000;\n\nconst lastHeartbeat = new Map();\n\nfunction onHeartbeat(deviceId, payload, broadcast) {\n  lastHeartbeat.set(deviceId, Date.now());\n  broadcast("DEVICE_HEARTBEAT", {\n    deviceId, latency: Date.now() - payload.ts,\n    ts: Date.now(),\n  });\n}\n\nfunction watchdog(agentConnections, broadcast, store) {\n  setInterval(() => {\n    const now = Date.now();\n    for (const [id, ts] of lastHeartbeat.entries()) {\n      if (now - ts > HEARTBEAT_TIMEOUT_MS) {\n        lastHeartbeat.delete(id);\n        if (!agentConnections.has(id)) continue;\n        store.devices.setOffline(id);\n        broadcast("DEVICE_STALE", {\n          deviceId: id, lastSeen: ts, staleMs: now - ts,\n        });\n      }\n    }\n  }, 15_000);\n}\n\nmodule.exports = { onHeartbeat, watchdog };\n\`\`\`\n\n**Architecture aligned with:**\n• Your existing handler.js C2 relay\n• beacon interval: 30s (config.beaconIntervalMs)\n• WAL-mode SQLite store\n\nWant me to add retry logic, priority-queue batching, or integrate with the mutation engine?`,
        type: "code", confidence: 0.97,
      };
    }
    return {
      content: `**Software Architecture Design**\n\nBased on your fleet data and stored memory patterns, here is a recommended architecture:\n\n\`\`\`\n┌──────────────────────────────────────────────────────┐\n│  bixtx.com — Generated Architecture                   │\n│  ${new Date().toLocaleTimeString()} · BTX-SENTINEL-7B             │\n├──────────────────────────────────────────────────────┤\n│  SOFTWARE A (Agent)                                   │\n│  ├── C2 Layer     : WebSocket + AES-256-GCM          │\n│  ├── Surveillance : 12 modules (modular on/off)      │\n│  ├── Mutation     : MutationEngine + Watchdog        │\n│  ├── CommandGuard : HMAC signed + AI interception    │\n│  └── Sensors      : Fall/Heat/HR/Noise/Activity      │\n│                                                       │\n│  BACKEND SERVER                                       │\n│  ├── REST API     : Express.js :3000                 │\n│  ├── Admin WS     : /admin-ws (JWT auth)             │\n│  ├── Agent C2 WS  : :3001 (HMAC + AES-256-GCM)      │\n│  └── Database     : SQLite WAL (better-sqlite3)      │\n│                                                       │\n│  SOFTWARE B (Web UI)                                  │\n│  ├── React 18 + Tailwind v4                          │\n│  ├── Security Ops : Emergency + Danger modals        │\n│  ├── AI Chat      : This interface + memory sidebar  │\n│  └── Remote Ctrl  : Live stream + shell              │\n└──────────────────────────────────────────────────────┘\n\`\`\`\n\nShall I generate the full code for that module?`,
      type: "design", confidence: 0.93,
    };
  }

  if (/status|online|offline|alive|fleet|all device/i.test(lower) && !dev) {
    return {
      content: `**Fleet Status — ${new Date().toLocaleTimeString()}**\n\n🟢 Online: **7/8 devices** | 🔴 Offline: **1**\n\n• EXEC-LAPTOP-01 — Windows — 192.168.1.42 ✅\n• MacBook-Pro-M3 — macOS — 192.168.1.55 ✅\n• KIOSK-UBUNTU-07 — Linux — 10.0.0.7 ⚠️ (CPU 78%)\n• Galaxy-S24-Ultra — Android — warning (battery 23%)\n• iPhone-15-Pro — iOS — 192.168.2.11 ✅\n• Mate60-Pro — HarmonyOS — 10.0.1.4 ✅\n• WORKSTATION-WIN11 — OFFLINE since 3h ago\n• DEVBOX-ARCH — Linux — 10.0.0.31 ✅\n\nAll active agents beaconing normally. Last heartbeat: **4s ago**.\n\nSelect a device target in the panel above to issue device-specific commands.`,
      type: "data", confidence: 0.97,
    };
  }

  if (/contact|phonebook|address book|phone number/i.test(lower)) {
    const device = dev || MOCK_DEVICES_AI[0];
    const contacts = DEVICE_CONTACTS[device.name] ?? `No contacts data available for ${device.name}`;
    return {
      content: `${dispatchHeader}**Contacts — ${device.name}**\n*Extracted via Software A address book module*\n\n${contacts}\n\n**AI Note:** ${device.platform === "ios" ? "iCloud sync confirmed — contacts also available in iCloud backup." : device.platform === "android" ? "Google Contacts sync detected." : "Contacts sourced from local address book."}`,
      type: "data", confidence: 0.96,
    };
  }

  if (/media|photo|image|video|audio|recording|file|document|vault/i.test(lower) && !/build|design|create|generate code/i.test(lower)) {
    const device = dev || MOCK_DEVICES_AI[0];
    const media = DEVICE_MEDIA[device.name] ?? `No media vault data for ${device.name}`;
    return {
      content: `${dispatchHeader}**Media Vault — ${device.name}**\n*Retrieved from Software A media intercept module*\n\n${media}\n\n**Options:** Reply "download [filename]" to queue for extraction, or "stream video" to start live feed.`,
      type: "data", confidence: 0.93,
    };
  }

  if (/image match|face match|face recogni|identify person|who is this|match face/i.test(lower) || (attachment?.docType === "image" && /match|identify|recogni|who|person|face/i.test(lower))) {
    const device = dev || MOCK_DEVICES_AI[4];
    return {
      content: `${dispatchHeader}**Facial Recognition — Cross-Device Match**\n\n${attachment ? `Analysing attached image: **${attachment.name}**\n\n` : ""}**Scanning enrolled profiles…**\n• Comparing against ${MOCK_DEVICES_AI.filter(d => d.status !== "offline").length} active device camera feeds\n• Cross-referencing 892 captured screenshots\n• Running DLIB 128D face embedding comparison\n\n**Match Result:**\n✅ **Possible match — Ananya Patel** (87.3% confidence)\n• Matched from: iPhone-15-Pro front camera (IMG_2890.jpg · 14:28)\n• Location at time: Mumbai, Maharashtra 🇮🇳\n• Device: ${device.name}\n\n**Face signature stored.** Future captures containing this face will auto-flag.`,
      type: "analysis", confidence: 0.87,
    };
  }

  if (/source of origin|document origin|where.*from|who.*sent|origin.*file|trace.*document/i.test(lower)) {
    const device = dev || MOCK_DEVICES_AI[0];
    return {
      content: `${dispatchHeader}**Document Source-of-Origin Analysis — ${device.name}**\n\n**Metadata Extraction:**\n• Author: **James Morgan** (j.morgan@corp.io)\n• Created: 2026-07-15 09:31 — Modified: 2026-09-01 14:22\n• Software: Microsoft Excel 365 (Windows 11)\n• GPS embed: None · Printer ID: Not embedded\n\n**Network Trace:**\n• Last uploaded: SharePoint (corp.io) via 192.168.1.42\n• Email attachment sent to: ceo@headquarters.io at 10:03\n• Download intercepted on: ${device.name} at 14:20\n\n**AI Assessment:** Document originated on EXEC-LAPTOP-01 → sent via Outlook → downloaded on ${device.name}. Full chain verified.`,
      type: "analysis", confidence: 0.92,
    };
  }

  if (/behav|profile|pattern|habit|routine|risk/i.test(lower)) {
    const device = dev || MOCK_DEVICES_AI[0];
    const riskMap: Record<string, number> = {
      "EXEC-LAPTOP-01":67,"MacBook-Pro-M3":45,"iPhone-15-Pro":52,
      "Galaxy-S24-Ultra":81,"DEVBOX-ARCH":89,"Mate60-Pro":73,
      "KIOSK-UBUNTU-07":78,"WORKSTATION-WIN11":94,
    };
    const risk = riskMap[device.name] ?? 60;
    const riskLevel = risk > 75 ? "CRITICAL" : risk > 50 ? "HIGH" : "MEDIUM";
    const riskColor = risk > 75 ? "🔴" : risk > 50 ? "🟡" : "🟢";
    return {
      content: `${dispatchHeader}**Behavioral Profile — ${device.name}**\n\n${riskColor} Risk Score: **${risk}/100 — ${riskLevel}**\nPlatform: ${devPlatform.toUpperCase()} · Observations: 1,847 data points over 14 days\n\n**Active Patterns:**\n• Peak activity: 09:00–18:30 (weekdays) + 22:00–23:30 (anomalous)\n• Top processes: ${device.platform === "ios" ? "WhatsApp (28%), Safari (22%), Instagram (15%), iCloud (10%)" : device.platform === "android" ? "Telegram (31%), Chrome (24%), Samsung Pay (12%)" : "Chrome (34%), Slack (18%), Excel (11%), Terminal (8%)"}\n• Frequent locations: ${DEVICE_LOCATION[device.name]?.split("\n")[0] ?? "Unknown"}\n\n**AI Assessment:** ${risk > 75 ? "ELEVATED risk — anomalous activity detected. Recommend enhanced monitoring." : "Standard profile with some notable patterns. Continued observation recommended."}`,
      type: "analysis", confidence: 0.91,
    };
  }

  if (/keylog|keystroke|typed|keyboard|password/i.test(lower)) {
    const device = dev || MOCK_DEVICES_AI[3];
    const credData = DEVICE_CREDS[device.name] ?? "No keylog data available for this device.";
    return {
      content: `${dispatchHeader}**Keylog + Credential Extract — ${device.name}**\n*Last 1 hour · captured via Software A keylogger module*\n\n**Captured Credentials:**\n${credData}\n\n**AI Flag:** High-value credentials detected. Credentials stored in extraction queue.`,
      type: "data", confidence: 0.99,
    };
  }

  if (/location|where|gps|position|city|country/i.test(lower)) {
    const device = dev || MOCK_DEVICES_AI[4];
    const locData = DEVICE_LOCATION[device.name] ?? `📍 Location unavailable for ${device.name}`;
    return {
      content: `${dispatchHeader}**Location Intelligence — ${device.name}**\n\n${locData}\n\n**AI Assessment:** Location history cross-referenced with behavioral profile.`,
      type: "data", confidence: 0.94,
    };
  }

  if (/network|wifi|ssid|lan|scan|probe/i.test(lower)) {
    return {
      content: `**Network Intelligence**\n\nSSID: **Corp-NET-5G** (-48 dBm, WPA3)\n\n**Nearby Networks:**\n• Corp-NET-5G ····· -48 dBm · WPA3 ✓\n• Corp-GUEST ······ -55 dBm · Open ⚠️\n• Rogue-AP-detected · -62 dBm · Open 🚨\n\n⚠️ **Alert:** Rogue AP at -62 dBm. Possible deauth attack vector.`,
      type: "data", confidence: 0.93,
    };
  }

  if (/threat|anomal|analys|report|assess|intel|suspicious/i.test(lower)) {
    return {
      content: `**Intelligence Report — ${new Date().toLocaleDateString()}**\n\n**Fleet Risk: ELEVATED (64/100)**\n\n🔴 **Critical:**\n• KIOSK-UBUNTU-07: 'xmrig' crypto-miner (CPU 78%)\n• Galaxy-S24-Ultra: geo-fence breach at 02:31\n\n🟡 **High:**\n• WORKSTATION-WIN11: 4.2 GB outbound before going offline\n• EXEC-LAPTOP-01: OTP + password simultaneously captured\n• DEVBOX-ARCH: SSH tunnel to Tor exit node (185.220.101.x)\n\n**Recommendations:**\n1. Kill xmrig: \`kill -9 $(pgrep xmrig)\`\n2. Enable geofence on Galaxy-S24\n3. Isolate WORKSTATION-WIN11 on reconnect`,
      type: "analysis", confidence: 0.95,
    };
  }

  if (/mutat|evasion|av |antivirus|detection|signature/i.test(lower)) {
    return {
      content: `**AV Evasion Status — v4.7.2-r14**\n\nDetection: **1/12 engines** (Sophos only)\n\n✅ Defender · ✅ Kaspersky · ✅ CrowdStrike · ✅ SentinelOne\n✅ Carbon Black · ✅ Bitdefender · ✅ ESET\n🔴 Sophos — DETECTED (Mal/Behav-299)\n✅ McAfee · ✅ Avast · ✅ Trend Micro · ✅ Malwarebytes\n\nRecommendation: Push signature rotation to clear Sophos rule #299.\nReply **"yes push mutation"** to execute.`,
      type: "mutation", confidence: 0.99,
    };
  }

  if (/yes.*push|push.*mutat|confirm.*mutat/i.test(lower)) {
    return {
      content: `**Global Mutation Executing...**\n\n✅ Signature hash rotated → BLAKE3\n✅ Process name → RuntimeBroker_ext\n✅ Sophos rule #299 bypassed\n✅ Beacon jitter ±12s applied\n✅ TLS fingerprint rotated\n\n**Result:** 0/12 detection ✅\nMutation v4.7.2-r15 pushed to **7 active agents**.`,
      type: "mutation", confidence: 1.0,
    };
  }

  if (/memory|storage|icloud|cloud|saved|stored|database|sync/i.test(lower)) {
    return {
      content: `**AI Memory & Storage**\n\n**Device Memory (Software A):**\n• Local SQLite AES-256-GCM: ✅ Active\n• Storage used: ~127 MB fleet-wide\n\n**Cloud Sync:**\n• ☁️ iCloud Drive: ✅ Syncing\n• ☁️ bixtx Cloud: ✅ Last sync ${new Date().toLocaleTimeString()}\n\n**AI Knowledge Base:**\n• Behavioral profiles: 8 devices\n• Mutation history: 14 entries\n• Learned patterns: 23\n• Code generations: ${Math.floor(Math.random() * 12) + 4} sessions stored\n\nAll data AES-256-GCM encrypted. Persistent across restarts.`,
      type: "memory", confidence: 0.98,
    };
  }

  if (/screenshot|screen|capture|visual/i.test(lower)) {
    const device = dev || MOCK_DEVICES_AI[0];
    const resp = DEVICE_SCREENSHOT_RESPONSE[device.name] ?? `✅ Screenshot dispatched to ${device.name}\n• Capture forwarded to Surveillance → Camera Recordings`;
    return {
      content: `${dispatchHeader}**Screenshot — ${device.name}**\n\n${resp}\n\nLive stream available via **Remote Control**.`,
      type: "command", confidence: 0.96,
    };
  }

  if (/help|what can|commands?|capabilit|how to/i.test(lower)) {
    return {
      content: `**bixtx.com — Full Capabilities**\n\n**Intelligence Queries:**\n• Device status, behavioral profiles, keylogs\n• Location history, network scans, clipboard\n• Threat assessment, anomaly reports\n\n**Software Design & Code Generation:**\n• "Build a React dashboard for fleet"\n• "Design a Python keylog parser"\n• "Write a Node.js C2 heartbeat handler"\n• "Generate encrypted SQLite schema"\n• "Architect a new surveillance module"\n\n**Media Input:**\n• 📎 Attach images, documents, audio, video\n• 🎤 Voice input — speak your query\n• 📷 Video call — discuss visually\n\n**Control Commands:**\n• Screenshot / stream / shell on any device\n• Push mutation, rotate C2 endpoint\n\n**Learning:**\n• I update behavioral profiles continuously\n• All code I generate is stored in memory\n• Ask me to recall any previous design`,
      type: "help", confidence: 1.0,
    };
  }

  const fallbacks = [
    `All 7 active agents beaconing normally. Memory synchronized to iCloud and bixtx Cloud. 23 behavioral patterns learned. Ask me anything — or say "build me a..." to design new software.`,
    `Monitoring active. AI has processed 1,847 observations across 8 devices. Mutation engine at r14 — 1/12 AV detecting. I can also generate code, design modules, or parse attachments you send.`,
    `Fleet nominal. iCloud sync active. Local memory encrypted and flushing every 30s. I can design new software from your intelligence data — try "build me a Python parser" or attach a document to analyse.`,
  ];
  return {
    content: fallbacks[Math.floor(Math.random() * fallbacks.length)],
    type: "text", confidence: 0.85,
  };
}

// ── Accepted file types ────────────────────────────────────────────────────────
function resolveDocType(file: File): ChatMsg["attachment"] {
  const { name, type, size } = file;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const docType: ChatMsg["attachment"] extends undefined ? never : NonNullable<ChatMsg["attachment"]>["docType"] =
    type.startsWith("image/") ? "image"
    : type.startsWith("video/") ? "video"
    : type.startsWith("audio/") ? "audio"
    : "document";
  return { name, fileType: ext, size, docType };
}

// ── Voice recognition shim ────────────────────────────────────────────────────
type SpeechRecognitionType = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: { results: { item(i: number): { item(j: number): { transcript: string } } }; resultIndex: number }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void; stop(): void;
};

function getSpeechRecognition(): SpeechRecognitionType | null {
  const W = window as { SpeechRecognition?: new () => SpeechRecognitionType; webkitSpeechRecognition?: new () => SpeechRecognitionType };
  const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = "en-US";
  return rec;
}

function speakText(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/\*\*|```[\s\S]*?```|\*|#|`/g, "").slice(0, 500);
  const utt = new SpeechSynthesisUtterance(clean);
  utt.rate = 0.95; utt.pitch = 1; utt.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Alex"));
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}

// ─── AIChatPage ───────────────────────────────────────────────────────────────
export function AIChatPage({ show }: { show: (msg: string, kind?: "success"|"error"|"info") => void }) {
  const [selectedDevice, setSelectedDevice] = useState<typeof MOCK_DEVICES_AI[0] | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "sys-0", role: "ai", type: "text", ts: Date.now() - 5000, confidence: 1.0,
      content: `**bixtx Intelligence Online — v4.7.2-neural**\n\nAll surveillance modules active. 7/8 devices online. Memory synchronized to iCloud Drive and bixtx Cloud.\n\nSelect a **target device** above to issue device-specific commands via Software A — credentials, contacts, location, screenshots, media, face-matching, document origin analysis, and more.\n\nAttach images, documents, audio, or video for analysis. Use voice input or start a video call. Type **"help"** to see full capabilities.`,
    },
  ]);
  const [input, setInput]             = useState("");
  const [thinking, setThinking]       = useState(false);
  const [showMemory, setShowMemory]   = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const [pendingFiles, setPendingFiles] = useState<{ meta: NonNullable<ChatMsg["attachment"]>; preview?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  const [videoOpen, setVideoOpen]     = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef                      = useRef<HTMLVideoElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => { videoStream?.getTracks().forEach(t => t.stop()); };
  }, [videoStream]);

  const sendMessage = async (text: string, attachment?: NonNullable<ChatMsg["attachment"]>, preview?: string) => {
    const finalText = text.trim() || (attachment ? `[Attached: ${attachment.name}]` : "");
    if (!finalText && !attachment) return;
    if (thinking) return;

    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`, role: "user", type: "text",
      ts: Date.now(), content: finalText,
      ...(attachment ? { attachment: { ...attachment, preview } } : {}),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setPendingFiles([]);
    setVoiceTranscript("");
    setThinking(true);

    const thinkMs = 700 + Math.random() * 1400;
    await new Promise(r => setTimeout(r, thinkMs));

    const resp = generateAIResponse(finalText, attachment, selectedDevice);
    const aiMsg: ChatMsg = {
      id: `ai-${Date.now()}`, role: "ai", type: resp.type, ts: Date.now(),
      content: resp.content, confidence: resp.confidence,
    };
    setMessages(prev => [...prev, aiMsg]);
    setThinking(false);

    if (voiceEnabled) speakText(resp.content);
  };

  const handleSend = () => {
    const att = pendingFiles[0];
    sendMessage(input, att?.meta, att?.preview);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach(file => {
      const meta = resolveDocType(file);
      if (meta?.docType === "image") {
        const reader = new FileReader();
        reader.onload = ev => {
          setPendingFiles(prev => [...prev, { meta: meta!, preview: ev.target?.result as string }]);
        };
        reader.readAsDataURL(file);
      } else {
        setPendingFiles(prev => [...prev, { meta: meta! }]);
      }
    });
    e.target.value = "";
  };

  const removePending = (i: number) => setPendingFiles(prev => prev.filter((_, idx) => idx !== i));

  const toggleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const rec = getSpeechRecognition();
    if (!rec) {
      show("Speech recognition not supported in this browser", "error");
      return;
    }
    recognitionRef.current = rec;
    rec.onresult = (e) => {
      const transcript = e.results.item(e.resultIndex).item(0).transcript;
      setVoiceTranscript(transcript);
      setInput(transcript);
    };
    rec.onend = () => setIsRecording(false);
    rec.onerror = (e) => { show(`Voice error: ${e.error}`, "error"); setIsRecording(false); };
    rec.start();
    setIsRecording(true);
    show("Listening... speak your query", "info");
  };

  const openVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
      setVideoOpen(true);
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      }, 100);
      const aiMsg: ChatMsg = {
        id: `ai-vid-${Date.now()}`, role: "ai", type: "text", ts: Date.now(), confidence: 1.0,
        content: `**Video Call Active**\n\nCamera and microphone connected. I can see your feed and analyse it in real-time.\n\n• Face detection: active\n• Voice recognition: active\n• Session recording: off (toggle in Settings)\n\nSpeak naturally or type your query. I will analyse video frames on request.`,
      };
      setMessages(prev => [...prev, aiMsg]);
      if (voiceEnabled) speakText("Video call connected. I am ready to assist.");
    } catch (err: unknown) {
      show(`Camera access denied: ${err instanceof Error ? err.message : "unknown"}`, "error");
    }
  };

  const closeVideo = () => {
    videoStream?.getTracks().forEach(t => t.stop());
    setVideoStream(null);
    setVideoOpen(false);
  };

  const TYPE_COLOR: Record<string, string> = {
    data: "#10d9a0", analysis: "#3b82f6", command: "#f59e0b",
    mutation: "#ef4444", memory: "#10b981", help: "#6b8ab0",
    text: "#3b82f6", code: "#22c55e", design: "#f472b6", voice: "#a78bfa",
  };
  const TYPE_LABEL: Record<string, string> = {
    data: "INTEL", analysis: "ANALYSIS", command: "COMMAND",
    mutation: "MUTATION", memory: "MEMORY", help: "HELP",
    text: "AI", code: "CODE", design: "DESIGN", voice: "VOICE",
  };

  const renderContent = (content: string) => {
    const lines = content.split("\n");
    let inCode = false;
    const codeLines: string[] = [];
    const output: React.ReactNode[] = [];
    lines.forEach((line, i) => {
      if (line.startsWith("```")) {
        if (!inCode) { inCode = true; codeLines.length = 0; return; }
        inCode = false;
        output.push(
          <div key={`code-${i}`} className="my-2 rounded-lg overflow-hidden"
            style={{ background:"#030b16", border:"1px solid rgba(34,197,94,0.2)" }}>
            <div className="px-3 py-1 text-[8px] font-mono flex items-center gap-1.5"
              style={{ background:"rgba(34,197,94,0.08)", color:"#22c55e", borderBottom:"1px solid rgba(34,197,94,0.15)" }}>
              <FileCode2 size={9} />CODE
            </div>
            <pre className="p-3 text-[10px] font-mono leading-relaxed overflow-x-auto"
              style={{ color:"#a3e635", margin:0 }}>
              {codeLines.join("\n")}
            </pre>
          </div>
        );
        return;
      }
      if (inCode) { codeLines.push(line); return; }
      if (line.startsWith("**") && line.endsWith("**") && !line.slice(2,-2).includes("**")) {
        output.push(<div key={i} className="font-black text-sm mb-1" style={{ color:"#e2eaf6" }}>{line.slice(2,-2)}</div>);
        return;
      }
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((p, j) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={j} style={{ color:"#e2eaf6" }}>{p.slice(2,-2)}</strong>
          : <span key={j}>{p}</span>
      );
      if (line.startsWith("  ") && !line.startsWith("  **")) {
        output.push(<div key={i} className="font-mono text-[10px] leading-relaxed pl-2" style={{ color:"#10d9a0" }}>{line}</div>);
        return;
      }
      if (line.startsWith("• ") || /^[✅🔴🟡🟢⚠️☁️🚨]/.test(line)) {
        output.push(<div key={i} className="text-xs leading-relaxed py-0.5" style={{ color:"#b8cce8" }}>{rendered}</div>);
        return;
      }
      if (line === "") { output.push(<div key={i} className="h-1.5" />); return; }
      output.push(<div key={i} className="text-xs leading-relaxed" style={{ color:"#b8cce8" }}>{rendered}</div>);
    });
    return output;
  };

  const ATTACH_ICON: Record<string, React.ReactNode> = {
    image: <Image size={11} />, video: <Film size={11} />,
    audio: <MicIcon size={11} />, document: <FileText size={11} />,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4" style={{ height:"calc(100vh - 80px)" }}>

      {videoOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center"
          style={{ background:"rgba(7,6,15,0.88)", backdropFilter:"blur(10px)" }}>
          <div className="relative rounded-2xl overflow-hidden"
            style={{ width:720, maxWidth:"90vw", border:"2px solid rgba(59,130,246,0.5)", boxShadow:"0 0 60px rgba(59,130,246,0.2)" }}>
            <div className="px-4 py-3 flex items-center justify-between border-b"
              style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-xs font-mono font-bold" style={{ color:"#e2eaf6" }}>BIXTX — VIDEO CALL</span>
                <span className="text-[9px] font-mono" style={{ color:"#6b8ab0" }}>Encrypted · E2E · Local only</span>
              </div>
              <button onClick={closeVideo}
                className="px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)" }}>
                <VideoOff size={11} />End Call
              </button>
            </div>
            <div style={{ background:"#000", position:"relative" }}>
              <video ref={videoRef} autoPlay muted playsInline
                style={{ width:"100%", maxHeight:"60vh", objectFit:"cover", display:"block" }} />
              <div className="absolute bottom-3 right-3 w-28 h-20 rounded-xl flex items-center justify-center"
                style={{ background:"linear-gradient(135deg,#0a1628,#1a1040)", border:"2px solid rgba(59,130,246,0.4)" }}>
                <div className="text-center">
                  <Sparkles size={22} color="#3b82f6" />
                  <div className="text-[9px] font-mono mt-1" style={{ color:"#3b82f6" }}>BIXTX</div>
                </div>
              </div>
            </div>
            <div className="p-3 flex items-center justify-center gap-3" style={{ background:"#0a1628" }}>
              <button onClick={toggleVoice}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: isRecording ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.15)", border:`1px solid ${isRecording ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.4)"}` }}>
                {isRecording ? <MicOff size={15} color="#ef4444" /> : <MicIcon size={15} color="#3b82f6" />}
              </button>
              <button onClick={() => setVoiceEnabled(v => !v)}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: voiceEnabled ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)", border:`1px solid ${voiceEnabled ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.1)"}` }}>
                {voiceEnabled ? <Volume2 size={15} color="#10b981" /> : <VolumeX size={15} color="#6b8ab0" />}
              </button>
              <button onClick={() => sendMessage("Analyse current video frame and describe what you see")}
                className="px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.35)" }}>
                Analyse Frame
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 h-full">
        {/* ── Main chat column ── */}
        <div className="flex-1 flex flex-col min-w-0 rounded-2xl overflow-hidden"
          style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.25)" }}>

          {/* Device Selector bar */}
          <div className="px-4 py-2 flex items-center gap-2 border-b overflow-x-auto flex-shrink-0"
            style={{ borderColor:"rgba(59,130,246,0.12)", background:"#050c1a" }}>
            <span className="text-[9px] font-mono flex-shrink-0" style={{ color:"#6b8ab0" }}>TARGET:</span>
            <button
              onClick={() => {
                setSelectedDevice(null);
                show("Target cleared — fleet-wide mode", "info");
              }}
              className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex-shrink-0 transition-all"
              style={{
                background: !selectedDevice ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${!selectedDevice ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.08)"}`,
                color: !selectedDevice ? "#3b82f6" : "#6b8ab0",
              }}>
              All Devices
            </button>
            {MOCK_DEVICES_AI.map(d => {
              const isSelected = selectedDevice?.id === d.id;
              const statusColor = d.status === "online" ? "#10b981" : d.status === "warning" ? "#f59e0b" : "#ef4444";
              const platIcon = d.platform === "ios" ? "🍎" : d.platform === "android" ? "🤖" : d.platform === "windows" ? "🪟" : d.platform === "macos" ? "💻" : d.platform === "linux" ? "🐧" : "📱";
              return (
                <button key={d.id}
                  onClick={() => {
                    setSelectedDevice(isSelected ? null : d);
                    if (!isSelected) show(`Target locked: ${d.name} (${d.ip})`, "info");
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex-shrink-0 transition-all"
                  style={{
                    background: isSelected ? `${statusColor}18` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isSelected ? statusColor + "60" : "rgba(255,255,255,0.08)"}`,
                    color: isSelected ? statusColor : "#6b8ab0",
                  }}>
                  <span>{platIcon}</span>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
                  <span>{d.name}</span>
                </button>
              );
            })}
          </div>

          <div className="px-5 py-3 flex items-center justify-between border-b flex-shrink-0"
            style={{ borderColor:"rgba(59,130,246,0.2)", background:"#0a1628" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background:"linear-gradient(135deg,#3b82f6,#10d9a0)" }}>
                <Sparkles size={15} color="#fff" />
              </div>
              <div>
                <div className="text-sm font-black" style={{ color:"#e2eaf6" }}>{AI_PERSONA.name}</div>
                <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>
                  {AI_PERSONA.model} · {selectedDevice ? `→ ${selectedDevice.name}` : "Fleet-wide"}
                </div>
              </div>
              {selectedDevice && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                  style={{ background:`${selectedDevice.status==="online"?"rgba(16,185,129,0.12)":selectedDevice.status==="warning"?"rgba(245,158,11,0.12)":"rgba(239,68,68,0.12)"}`, border:`1px solid ${selectedDevice.status==="online"?"rgba(16,185,129,0.3)":selectedDevice.status==="warning"?"rgba(245,158,11,0.3)":"rgba(239,68,68,0.3)"}` }}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: selectedDevice.status==="online"?"#10b981":selectedDevice.status==="warning"?"#f59e0b":"#ef4444" }} />
                  <span className="text-[9px] font-mono" style={{ color: selectedDevice.status==="online"?"#10b981":selectedDevice.status==="warning"?"#f59e0b":"#ef4444" }}>
                    {selectedDevice.name.toUpperCase()} · {selectedDevice.ip}
                  </span>
                </div>
              )}
              {!selectedDevice && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                  style={{ background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.3)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[9px] font-mono" style={{ color:"#10b981" }}>ONLINE · LEARNING</span>
                </div>
              )}
              {isRecording && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full"
                  style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.4)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[9px] font-mono" style={{ color:"#ef4444" }}>LISTENING</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setVoiceEnabled(v => !v)}
                className="px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1"
                style={{ color: voiceEnabled ? "#10b981" : "#6b8ab0", background: voiceEnabled ? "rgba(16,185,129,0.1)" : "transparent" }}>
                {voiceEnabled ? <Volume2 size={10} /> : <VolumeX size={10} />}
                {voiceEnabled ? "Voice On" : "Voice Off"}
              </button>
              <button onClick={() => setShowSuggestions(v => !v)}
                className="px-2 py-1 rounded text-[10px] font-mono"
                style={{ color:"#6b8ab0", background: showSuggestions ? "rgba(59,130,246,0.1)" : "transparent" }}>
                Suggestions
              </button>
              <button onClick={() => setShowMemory(v => !v)}
                className="px-2 py-1 rounded text-[10px] font-mono"
                style={{ color:"#6b8ab0", background: showMemory ? "rgba(59,130,246,0.1)" : "transparent" }}>
                Memory
              </button>
              <button onClick={() => {
                setMessages([{ id:`sys-${Date.now()}`, role:"ai", type:"text", ts:Date.now(), confidence:1.0,
                  content:"Session cleared. Conversation context reset. Knowledge base and code memory retained. Ready." }]);
                show("Chat session cleared", "info");
              }} className="px-2 py-1 rounded text-[10px] font-mono" style={{ color:"#6b8ab0" }}>
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: msg.role === "user"
                      ? "rgba(59,130,246,0.2)"
                      : msg.role === "system" ? "rgba(6,182,212,0.15)"
                      : "linear-gradient(135deg,#3b82f6,#10d9a0)",
                  }}>
                  {msg.role === "user" ? <Terminal size={13} color="#3b82f6" />
                    : msg.role === "system" ? <AlertTriangle size={13} color="#10d9a0" />
                    : <Sparkles size={13} color="#fff" />}
                </div>
                <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  {msg.role !== "user" && msg.type && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{ background:`${TYPE_COLOR[msg.type] || "#3b82f6"}18`, color: TYPE_COLOR[msg.type] || "#3b82f6" }}>
                        {TYPE_LABEL[msg.type] || "AI"}
                      </span>
                      {msg.confidence !== undefined && (
                        <span className="text-[9px] font-mono" style={{ color:"#1a3060" }}>
                          {Math.round((msg.confidence || 0) * 100)}% confidence
                        </span>
                      )}
                    </div>
                  )}
                  <div className="rounded-2xl px-4 py-3 space-y-2"
                    style={{
                      background: msg.role === "user" ? "rgba(59,130,246,0.18)"
                        : msg.role === "system" ? "rgba(6,182,212,0.08)" : "#0d1930",
                      border: `1px solid ${msg.role === "user" ? "rgba(59,130,246,0.35)" : msg.role === "system" ? "rgba(6,182,212,0.2)" : "rgba(59,130,246,0.15)"}`,
                      borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    }}>
                    {msg.attachment && (
                      <div className="rounded-lg overflow-hidden"
                        style={{ border:"1px solid rgba(59,130,246,0.2)", background:"rgba(7,6,15,0.5)" }}>
                        {msg.attachment.docType === "image" && msg.attachment.preview ? (
                          <img src={msg.attachment.preview} alt={msg.attachment.name}
                            className="w-full max-h-48 object-cover" />
                        ) : (
                          <div className="px-3 py-2 flex items-center gap-2">
                            <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                              style={{ background:"rgba(59,130,246,0.15)" }}>
                              {ATTACH_ICON[msg.attachment.docType || "document"]}
                            </div>
                            <div>
                              <div className="text-[10px] font-mono font-semibold" style={{ color:"#b8cce8" }}>
                                {msg.attachment.name}
                              </div>
                              <div className="text-[9px] font-mono" style={{ color:"#6b8ab0" }}>
                                {msg.attachment.fileType.toUpperCase()} · {Math.round(msg.attachment.size / 1024)} KB
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {msg.role === "user"
                      ? <div className="text-sm font-mono" style={{ color:"#e2eaf6" }}>{msg.content}</div>
                      : <div className="space-y-0.5">{renderContent(msg.content)}</div>}
                  </div>
                  <div className="text-[9px] font-mono px-1" style={{ color:"#1a3060" }}>
                    {new Date(msg.ts).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background:"linear-gradient(135deg,#3b82f6,#10d9a0)" }}>
                  <Sparkles size={13} color="#fff" />
                </div>
                <div className="rounded-2xl px-4 py-3"
                  style={{ background:"#0d1930", border:"1px solid rgba(59,130,246,0.15)", borderRadius:"18px 18px 18px 4px" }}>
                  <div className="flex items-center gap-1.5">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full"
                        style={{ background:"#3b82f6", animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
                    ))}
                    <span className="text-[10px] font-mono ml-1" style={{ color:"#6b8ab0" }}>
                      {pendingFiles.length > 0 ? "Analysing attachment..." : "Analysing intelligence..."}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {showSuggestions && (
            <div className="px-4 pb-2 flex-shrink-0">
              <div className="flex gap-1.5 flex-wrap">
                {SUGGESTED_CMDS.slice(0, 6).map(cmd => (
                  <button key={cmd} onClick={() => sendMessage(cmd)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-mono transition-all hover:opacity-80"
                    style={{ background:"rgba(59,130,246,0.1)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.25)" }}>
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          )}

          {pendingFiles.length > 0 && (
            <div className="px-4 pb-1 flex-shrink-0">
              <div className="flex gap-2 flex-wrap">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-xl"
                    style={{ background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.25)", maxWidth:200 }}>
                    {f.preview
                      ? <img src={f.preview} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                      : <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                          style={{ background:"rgba(59,130,246,0.2)" }}>
                          {ATTACH_ICON[f.meta.docType || "document"]}
                        </div>
                    }
                    <div className="min-w-0">
                      <div className="text-[9px] font-mono truncate" style={{ color:"#b8cce8" }}>{f.meta.name}</div>
                      <div className="text-[8px] font-mono" style={{ color:"#6b8ab0" }}>
                        {Math.round(f.meta.size / 1024)} KB
                      </div>
                    </div>
                    <button onClick={() => removePending(i)}
                      className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center hover:opacity-80"
                      style={{ background:"rgba(239,68,68,0.2)" }}>
                      <X size={8} color="#ef4444" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {voiceTranscript && !isRecording && (
            <div className="px-4 pb-1 flex-shrink-0">
              <div className="px-3 py-1.5 rounded-lg flex items-center gap-2"
                style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)" }}>
                <MicIcon size={10} color="#a78bfa" />
                <span className="text-[10px] font-mono" style={{ color:"#a78bfa" }}>"{voiceTranscript}"</span>
              </div>
            </div>
          )}

          <div className="px-4 pb-4 flex-shrink-0">
            <div className="rounded-2xl border overflow-hidden"
              style={{ background:"#0a1628", borderColor: isRecording ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.3)" }}>
              <div className="px-3 pt-2 pb-1 flex items-center gap-1 border-b"
                style={{ borderColor:"rgba(59,130,246,0.12)" }}>
                <input ref={fileInputRef} type="file" multiple className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.js,.py,.ts,.md"
                  onChange={handleFileSelect} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:opacity-80"
                  style={{ color:"#3b82f6", background:"rgba(59,130,246,0.08)", border:"1px solid rgba(59,130,246,0.2)" }}>
                  <Paperclip size={11} />Attach
                </button>
                <button onClick={toggleVoice}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:opacity-80"
                  style={{ color: isRecording ? "#ef4444" : "#a78bfa", background: isRecording ? "rgba(239,68,68,0.1)" : "rgba(167,139,250,0.08)", border: `1px solid ${isRecording ? "rgba(239,68,68,0.35)" : "rgba(167,139,250,0.2)"}` }}>
                  {isRecording ? <><StopCircle size={11} />Stop</> : <><MicIcon size={11} />Voice</>}
                </button>
                <button onClick={videoOpen ? closeVideo : openVideo}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:opacity-80"
                  style={{ color: videoOpen ? "#ef4444" : "#10d9a0", background: videoOpen ? "rgba(239,68,68,0.08)" : "rgba(6,182,212,0.08)", border: `1px solid ${videoOpen ? "rgba(239,68,68,0.25)" : "rgba(6,182,212,0.2)"}` }}>
                  {videoOpen ? <><VideoOff size={11} />End Video</> : <><Video size={11} />Video</>}
                </button>
                <button onClick={() => { setInput("Design and build "); inputRef.current?.focus(); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:opacity-80"
                  style={{ color:"#22c55e", background:"rgba(34,197,94,0.07)", border:"1px solid rgba(34,197,94,0.2)" }}>
                  <Wand2 size={11} />Design
                </button>
                <div className="flex-1" />
                <span className="text-[9px] font-mono" style={{ color:"#1a3060" }}>
                  {messages.filter(m => m.role === "user").length} queries
                </span>
              </div>
              <div className="flex items-end gap-2 px-3 py-2">
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mb-0.5">
                  <Terminal size={11} color="#6b8ab0" />
                </div>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={isRecording ? "Listening… speak your query" : selectedDevice ? `Command for ${selectedDevice.name} — credentials, screenshot, location, contacts…` : "Command, query, or 'build me a...' — select a device above to target Software A"}
                  rows={1}
                  className="flex-1 resize-none outline-none text-sm font-mono bg-transparent leading-relaxed"
                  style={{ color:"#e2eaf6", minHeight:"24px", maxHeight:"120px" }}
                />
                <button onClick={handleSend}
                  disabled={(!input.trim() && pendingFiles.length === 0) || thinking}
                  className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-30"
                  style={{ background:"linear-gradient(135deg,#3b82f6,#10d9a0)" }}>
                  <Send size={13} color="#fff" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1 px-1">
              <span className="text-[9px] font-mono" style={{ color:"#1a3060" }}>
                Shift+Enter newline · Enter send · 📎 all file types accepted
              </span>
              <span className="text-[9px] font-mono" style={{ color:"#1a3060" }}>
                {pendingFiles.length > 0 ? `${pendingFiles.length} file(s) attached` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* ── Memory / Context sidebar ── */}
        {showMemory && (
          <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
            <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Database size={13} color="#3b82f6" />
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>AI Memory Store</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { label:"Keystrokes",    val: "2,341", color:"#ef4444" },
                  { label:"Screenshots",   val: "892",   color:"#3b82f6" },
                  { label:"Clipboard",     val: "156",   color:"#f59e0b" },
                  { label:"Locations",     val: "234",   color:"#10d9a0" },
                  { label:"Network Scans", val: "89",    color:"#10b981" },
                  { label:"Call Records",  val: "43",    color:"#ef4444" },
                  { label:"Social Msgs",   val: "712",   color:"#3b82f6" },
                  { label:"Code Sessions", val: "12",    color:"#22c55e" },
                  { label:"Attachments",   val: "6",     color:"#f472b6" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{s.label}</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color:s.color }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Cloud size={13} color="#10d9a0" />
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Cloud Sync</span>
              </div>
              <div className="space-y-2">
                {[
                  { label:"iCloud Drive",  status:"Active",  path:"~/Library/Mobile Documents/...", color:"#10b981" },
                  { label:"bixtx Cloud",  status:"Syncing", path:"api.bixtx.com/sync",             color:"#10b981" },
                  { label:"Local SQLite",  status:"Active",  path:"/opt/bixtx-agent/",             color:"#10b981" },
                ].map(s => (
                  <div key={s.label} className="rounded-lg px-3 py-2" style={{ background:"#030b16", border:`1px solid ${s.color}25` }}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold" style={{ color:s.color }}>{s.label}</span>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:s.color }} />
                        <span className="text-[9px] font-mono" style={{ color:s.color }}>{s.status}</span>
                      </div>
                    </div>
                    <div className="text-[9px] font-mono truncate" style={{ color:"#1a3060" }}>{s.path}</div>
                  </div>
                ))}
                <div className="text-[9px] font-mono text-center mt-1" style={{ color:"#1a3060" }}>
                  Total: 127 MB · Last sync: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} color="#3b82f6" />
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>AI Learning</span>
              </div>
              <div className="space-y-2">
                {[
                  { label:"Behavioral Profiles", val:"8 devices",   pct:85, color:"#3b82f6" },
                  { label:"Pattern Recognition",  val:"1,847 pts",   pct:72, color:"#10d9a0" },
                  { label:"Anomaly Baseline",     val:"14d trained", pct:91, color:"#10b981" },
                  { label:"Mutation Engine",      val:"r14 active",  pct:100,color:"#ef4444" },
                  { label:"Code Knowledge Base",  val:"12 modules",  pct:68, color:"#22c55e" },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[9px] font-mono" style={{ color:"#6b8ab0" }}>{s.label}</span>
                      <span className="text-[9px] font-mono" style={{ color:s.color }}>{s.val}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
                      <div className="h-full rounded-full" style={{ width:`${s.pct}%`, background:s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={13} color="#f59e0b" />
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Recent Insights</span>
              </div>
              <div className="space-y-2">
                {[
                  { ts:"02:31", text:"Galaxy-S24: geo-fence breach detected", color:"#ef4444" },
                  { ts:"10:18", text:"EXEC-01: OTP + password captured", color:"#f59e0b" },
                  { ts:"22:47", text:"EXEC-01: Anomalous late-night terminal", color:"#f59e0b" },
                  { ts:"14:12", text:"Sophos detection cleared post-mutation", color:"#10b981" },
                  { ts:"09:51", text:"High-value credential: LastPass entry", color:"#ef4444" },
                ].map((insight, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-[9px] font-mono flex-shrink-0 mt-0.5" style={{ color:"#1a3060" }}>{insight.ts}</span>
                    <span className="text-[10px] leading-snug" style={{ color:insight.color }}>{insight.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Wand2 size={13} color="#22c55e" />
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Media Input</span>
              </div>
              <div className="space-y-2">
                {[
                  { icon: <Paperclip size={11} />, label:"Attach Files", sub:"Images, PDF, DOCX, code, audio, video", color:"#3b82f6", action: () => fileInputRef.current?.click() },
                  { icon: <MicIcon size={11} />,   label:"Voice Input",  sub:"Speech-to-text, speak your query", color:"#a78bfa", action: toggleVoice },
                  { icon: <Video size={11} />,     label:"Video Call",   sub:"Camera + mic, frame analysis", color:"#10d9a0", action: videoOpen ? closeVideo : openVideo },
                  { icon: <Wand2 size={11} />,     label:"Code Design",  sub:"Generate software from memory", color:"#22c55e", action: () => { setInput("Design and build "); inputRef.current?.focus(); } },
                ].map(m => (
                  <button key={m.label} onClick={m.action}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all hover:opacity-80"
                    style={{ background:`${m.color}08`, border:`1px solid ${m.color}20` }}>
                    <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background:`${m.color}18`, color:m.color }}>
                      {m.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold" style={{ color:m.color }}>{m.label}</div>
                      <div className="text-[8px] font-mono leading-snug" style={{ color:"#6b8ab0" }}>{m.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
