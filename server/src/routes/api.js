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
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");
const store = require("../db/store");
const wsHandler = require("../websocket/handler");
const logger = require("../logger");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "bixtx-secret-change-in-production";
const ENROLL_KEY = process.env.BIXTX_ENROLL_KEY || "BTX-2026-ALPHA";

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

// ── Rate limiting ────────────────────────────────────────────────────────
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Too many requests" } });

// ── POST /v1/auth/token ────────────────────────────────────────────────────
router.post("/auth/token", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  // Dev fallback: credentials sourced from environment variables only — never hardcoded
  const DEV_EMAIL = process.env.DEV_ADMIN_EMAIL;
  const DEV_PASS  = process.env.DEV_ADMIN_PASSWORD;
  if (process.env.NODE_ENV !== "production" && DEV_EMAIL && DEV_PASS && email === DEV_EMAIL && password === DEV_PASS) {
    const token = jwt.sign({ id: "admin", email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
    return res.json({ token, expires_in: 3600, role: "admin" });
  }

  // Production: check DB
  const user = store.users?.getByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, expires_in: 86400, role: user.role });
});

// ── GET /v1/devices ────────────────────────────────────────────────────────
router.get("/devices", authRequired, (req, res) => {
  const devices = store.devices.getAll();
  const online = wsHandler.getOnlineDevices();
  const enriched = devices.map(d => ({
    ...d,
    status: online.includes(d.id) ? "online" : d.status,
  }));
  res.json({ devices: enriched, total: enriched.length, online: online.length });
});

// ── GET /v1/devices/:id ────────────────────────────────────────────────────
router.get("/devices/:id", authRequired, (req, res) => {
  const device = store.devices.getById(req.params.id);
  if (!device) return res.status(404).json({ error: "Device not found" });
  res.json(device);
});

// ── POST /v1/devices/:id/cmd ───────────────────────────────────────────────
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

// ── GET /v1/devices/:id/data ───────────────────────────────────────────────
router.get("/devices/:id/data", authRequired, (req, res) => {
  const { module, limit = 100 } = req.query;
  const records = store.data.getByDevice(req.params.id, module, parseInt(limit));
  res.json({ records, total: records.length });
});

// ── POST /v1/devices/enroll ────────────────────────────────────────────────
router.post("/devices/enroll", authRequired, (req, res) => {
  const { label, ttl = "24h" } = req.body;
  const linkId = uuidv4().slice(0, 8).toUpperCase();
  const enrollUrl = `https://bixtx.com/enroll/${linkId}?key=${ENROLL_KEY}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  res.json({
    enrollUrl,
    shortUrl: `https://bixtx.com/enroll/${linkId}`,
    linkId,
    enrollKey: ENROLL_KEY,
    label: label || "Unnamed device",
    expiresAt,
    ttl,
    installCommands: {
      linux:   `curl -sSL ${enrollUrl} | bash`,
      macos:   `curl -sSL ${enrollUrl} | bash`,
      windows: `powershell -c "iwr '${enrollUrl}' | iex"`,
      android: `curl -sSL ${enrollUrl} | bash`,
      ios:     `open '${enrollUrl}'`,
      harmony: `hdc app install -r bixtx-agent.hap && hdc shell aa start -b ai.bixtx.agent -a EntryAbility -p key=${ENROLL_KEY}`,
    },
  });
});

// ── GET /v1/alerts ─────────────────────────────────────────────────────────
router.get("/alerts", authRequired, (req, res) => {
  const alerts = store.alerts.getAll(parseInt(req.query.limit || 50));
  res.json({ alerts, total: alerts.length });
});

// ── POST /v1/update/push ───────────────────────────────────────────────────
router.post("/update/push", authRequired, (req, res) => {
  const { deviceIds, version } = req.body;
  const targets = deviceIds || wsHandler.getOnlineDevices();
  const results = targets.map(id => ({
    deviceId: id,
    sent: wsHandler.sendToAgent(id, "UPDATE", { version: version || "4.7.2" }),
  }));
  res.json({ results, total: targets.length, success: results.filter(r => r.sent).length });
});

// ── POST /v1/deploy/job ────────────────────────────────────────────────────
// Push a deploy job to one or all agents; agent responds with DEPLOY_JOB_ACK
router.post("/deploy/job", authRequired, (req, res) => {
  const { deviceIds, jobId, type, version, checksum, rollbackVersion } = req.body;
  if (!jobId || !type || !version) {
    return res.status(400).json({ error: "jobId, type, and version are required" });
  }
  const targets = deviceIds || wsHandler.getOnlineDevices();
  const results = targets.map(id => ({
    deviceId: id,
    sent: wsHandler.sendToAgent(id, "DEPLOY_JOB", { jobId, type, version, checksum, rollbackVersion, ts: Date.now() }),
  }));
  logger.info(`[API] DEPLOY_JOB ${jobId} v${version} dispatched to ${results.length} device(s) by ${req.admin.email}`);
  res.json({ ok: true, jobId, type, version, results, total: targets.length, dispatched: results.filter(r=>r.sent).length });
});

// ── POST /v1/mdm/push ──────────────────────────────────────────────────────
// Push MDM policy state changes to one or all agents
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
  res.json({ ok: true, policies: policies.length, results, total: targets.length, dispatched: results.filter(r=>r.sent).length });
});

// ── POST /v1/devices/broadcast/cmd ────────────────────────────────────────
// Broadcast a command to all online agents (used by Admin UI rollback & containment)
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
  res.json({ ok: true, type, results, total: targets.length, dispatched: results.filter(r => r.sent).length });
});

// ── Upgrade approval queue (in-memory; survives server restarts via wsHandler) ──
const upgradeQueue = new Map(); // requestId → { request, status, adminId, ts }

// Agents push UPGRADE_PROPOSAL messages over WebSocket; the WS handler calls this
// to enqueue them so admins can see and act on them via REST.
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
// Exported at module.exports.enqueueUpgradeProposal below — call from WS handler
// when an UPGRADE_PROPOSAL frame arrives from an agent.

// GET /v1/upgrades — list all upgrade requests (filter by ?status=pending|approved|denied)
router.get("/upgrades", authRequired, (req, res) => {
  const { status } = req.query;
  let items = Array.from(upgradeQueue.values());
  if (status) items = items.filter(r => r.status === status);
  items.sort((a, b) => b.requestedAt - a.requestedAt);
  res.json({ upgrades: items, total: items.length });
});

// POST /v1/upgrades/:id/approve — admin approves; forwards UPGRADE_APPROVED to agent
router.post("/upgrades/:id/approve", authRequired, (req, res) => {
  const entry = upgradeQueue.get(req.params.id);
  if (!entry) return res.status(404).json({ error: "Upgrade request not found" });
  if (entry.status !== "pending") return res.status(409).json({ error: `Request is already ${entry.status}` });

  entry.status  = "approved";
  entry.adminId = req.admin.id;
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

// POST /v1/upgrades/:id/deny — admin denies; forwards UPGRADE_DENIED to agent
router.post("/upgrades/:id/deny", authRequired, (req, res) => {
  const entry = upgradeQueue.get(req.params.id);
  if (!entry) return res.status(404).json({ error: "Upgrade request not found" });
  if (entry.status !== "pending") return res.status(409).json({ error: `Request is already ${entry.status}` });

  const reason = req.body?.reason || "Denied by administrator";
  entry.status    = "denied";
  entry.adminId   = req.admin.id;
  entry.decidedAt = Date.now();
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

// ── GET /v1/stats ──────────────────────────────────────────────────────────
router.get("/stats", authRequired, (req, res) => {
  const devices = store.devices.getAll();
  const online = wsHandler.getOnlineDevices();
  res.json({
    devices: { total: devices.length, online: online.length, offline: devices.length - online.length },
    server: { uptime: process.uptime(), version: "4.7.2", ts: Date.now() },
  });
});

module.exports = router;
module.exports.enqueueUpgradeProposal = enqueueUpgradeProposal;
