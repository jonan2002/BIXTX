/**
 * WebSocket Handler — Agent C2 relay
 * Each agent connects here. Commands routed from admin sessions.
 */

const WebSocket = require("ws");
const AgentCrypto = require("./crypto");
const store = require("../db/store");
const logger = require("../logger");
const { enrichAlert, correlateAlerts } = require("../detection/ioc-rules");

// Map of deviceId → WebSocket connection
const agentConnections = new Map();
// Map of adminSessionId → WebSocket connection (for admin UI real-time)
const adminConnections = new Map();

class AgentCrypto_Server {
  constructor(deviceId, enrollKey) {
    const crypto = require("crypto");
    const secret = enrollKey + deviceId;
    this.key = crypto.createHash("sha256").update(secret).digest();
    this.algo = "aes-256-gcm";
  }
  decrypt(ciphertext) {
    const crypto = require("crypto");
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, 16);
    const tag = buf.subarray(16, 32);
    const enc = buf.subarray(32);
    const d = crypto.createDecipheriv(this.algo, this.key, iv, { authTagLength: 16 });
    d.setAuthTag(tag);
    const plain = Buffer.concat([d.update(enc), d.final()]).toString("utf8");
    try { return JSON.parse(plain); } catch { return plain; }
  }
  encrypt(payload) {
    const crypto = require("crypto");
    const iv = crypto.randomBytes(16);
    const c = crypto.createCipheriv(this.algo, this.key, iv, { authTagLength: 16 });
    const data = JSON.stringify(payload);
    const enc = Buffer.concat([c.update(data, "utf8"), c.final()]);
    const tag = c.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString("base64");
  }
}

function setupAgentWS(wss, enrollKey) {
  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, "ws://localhost");
    const deviceId = url.searchParams.get("device");
    const token = url.searchParams.get("token");

    if (!deviceId) {
      ws.close(4001, "Missing device ID");
      return;
    }

    // Verify token
    const crypto = require("crypto");
    const expectedToken = crypto.createHmac("sha256", enrollKey).update(deviceId).digest("hex");
    if (token !== expectedToken) {
      logger.warn(`[WS] Rejected connection from ${deviceId} — invalid token`);
      ws.close(4003, "Unauthorized");
      return;
    }

    const clientCrypto = new AgentCrypto_Server(deviceId, enrollKey);
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    logger.info(`[WS] Agent connected: ${deviceId} from ${ip}`);
    agentConnections.set(deviceId, { ws, crypto: clientCrypto, ip });

    // Ping interval to detect disconnects
    const pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        sendToAgent(deviceId, "PING", { ts: Date.now() });
      }
    }, 30000);

    ws.on("message", (rawData) => {
      try {
        const msg = clientCrypto.decrypt(rawData.toString());
        handleAgentMessage(deviceId, msg, ip);
      } catch (err) {
        logger.warn(`[WS] Decrypt error from ${deviceId}:`, err.message);
      }
    });

    ws.on("close", (code) => {
      clearInterval(pingTimer);
      agentConnections.delete(deviceId);
      store.devices.setOffline(deviceId);
      logger.info(`[WS] Agent disconnected: ${deviceId} (${code})`);
      broadcastToAdmins("DEVICE_OFFLINE", { deviceId, ts: Date.now() });
    });

    ws.on("error", (err) => {
      logger.error(`[WS] Agent error ${deviceId}:`, err.message);
    });
  });
}

function handleAgentMessage(deviceId, msg, ip) {
  const { type, payload } = msg;

  switch (type) {
    case "ENROLL": {
      store.devices.upsert({
        id: deviceId,
        name: payload.deviceName,
        platform: payload.platform,
        arch: payload.arch,
        osVersion: payload.osVersion,
        ip,
        enrollKey: payload.enrollKey,
        agentVersion: payload.agentVersion,
        features: payload.features,
      });
      logger.info(`[WS] Device enrolled: ${payload.deviceName} (${deviceId})`);
      broadcastToAdmins("DEVICE_ENROLLED", { deviceId, ...payload, ip, ts: Date.now() });
      break;
    }

    case "HEARTBEAT":
      store.devices.ping(deviceId);
      broadcastToAdmins("DEVICE_HEARTBEAT", { deviceId, ts: payload.ts });
      break;

    case "DATA_BATCH": {
      const { items } = payload;
      if (Array.isArray(items)) {
        items.forEach(item => {
          store.data.insert(deviceId, item.module, item.data, item.hash);
        });
        broadcastToAdmins("DATA_RECEIVED", { deviceId, count: items.length, modules: [...new Set(items.map(i => i.module))] });
      }
      break;
    }

    case "PONG":
      // Connection alive
      break;

    case "EMERGENCY_ALERT": {
      const sev = payload.severity || "CRITICAL";
      logger.warn(`[WS] 🚨 EMERGENCY_ALERT from ${deviceId}: ${payload.type} — ${sev}`);

      // Persist to alerts table
      store.alerts.create(deviceId, sev.toLowerCase(), JSON.stringify({
        alertType:    payload.type,
        title:        payload.title,
        detail:       payload.detail,
        severity:     sev,
        readings:     payload.readings,
        geopolitical: payload.geopolitical,
        deviceDetail: payload.deviceDetail,
        userDetail:   payload.userDetail,
        emergencyContacts: payload.emergencyContacts,
        action:       payload.action,
        ts:           payload.ts,
        alertId:      payload.alertId,
        enriched:     payload.enriched || false,
      }));

      // Priority broadcast to ALL admins immediately
      priorityBroadcastToAdmins("EMERGENCY_ALERT", {
        deviceId,
        ...payload,
        receivedAt: Date.now(),
        priority:   "IMMEDIATE",
      });
      break;
    }

    case "DANGER_ALERT": {
      // An unauthorised or AI-origin command was intercepted by the agent's
      // CommandGuard.  Treat with the same urgency as EMERGENCY_ALERT.
      const sev = payload.severity || "CRITICAL";
      logger.warn(`[WS] 🛑 DANGER_ALERT from ${deviceId}: ${payload.alertType}`);

      store.alerts.create(deviceId, sev.toLowerCase(), JSON.stringify({
        alertType:  payload.alertType,
        title:      payload.title,
        detail:     payload.detail,
        action:     payload.action,
        severity:   sev,
        confidence: payload.confidence,
        pattern:    payload.pattern,
        ts:         payload.ts,
        alertId:    payload.alertId,
      }));

      priorityBroadcastToAdmins("DANGER_ALERT", {
        deviceId,
        ...payload,
        receivedAt: Date.now(),
        priority:   "IMMEDIATE",
      });
      break;
    }

    case "ANALYSIS_ALERT": {
      // Agent-detected reverse engineering / MITM / debugger event.
      // Enrich with IOC rule context, persist, and priority-broadcast.
      const finding = enrichAlert(payload.alertType, { ...payload, deviceId });
      logger.warn(`[WS] 🔬 ANALYSIS_ALERT from ${deviceId}: ${payload.alertType} [${finding.severity}]`);

      store.alerts.create(deviceId, finding.severity.toLowerCase(), JSON.stringify({
        ruleId:         finding.ruleId,
        alertType:      payload.alertType,
        category:       finding.category,
        summary:        finding.summary,
        detail:         payload.detail,
        recommendation: finding.recommendation,
        mitre:          finding.mitre,
        indicators:     finding.indicators,
        ts:             payload.ts,
        alertId:        payload.alertId,
      }));

      // Correlation: pull recent analysis alerts for this device and check for
      // multi-signal patterns (e.g. VM + Frida + MITM at the same time).
      const priority = finding.severity === "CRITICAL" ? "IMMEDIATE" : "HIGH";
      priorityBroadcastToAdmins("ANALYSIS_ALERT", {
        deviceId,
        finding,
        raw:        payload,
        receivedAt: Date.now(),
        priority,
      });
      break;
    }

    case "ANTIANALYSIS_STATUS_RESULT":
    case "ANTIANALYSIS_SWEEP_ACK":
      broadcastToAdmins(type, { deviceId, ...payload });
      break;

    case "THREAT_EVENT":
    case "MUTATION_REPORT":
    case "WATCHDOG_EVENT":
    case "WATCHDOG_HEALTH":
    case "WATCHDOG_STATUS_RESULT":
    case "GUARD_THREAT_LOG_RESULT":
    case "MUTATION_ACK":
      broadcastToAdmins(type, { deviceId, ...payload });
      break;

    case "SCREENSHOT_RESULT":
    case "STREAM_FRAME":
    case "SHELL_RESULT":
    case "FILE_LIST_RESULT":
    case "FILE_READ_RESULT":
    case "LAN_SCAN_RESULT":
    case "UPDATE_ACK":
    case "KILL_ACK":
    case "REBOOT_ACK":
    case "MODULE_TOGGLE_ACK":
      broadcastToAdmins(type, { deviceId, ...payload });
      break;

    // ── Deploy platform ACKs ─────────────────────────────────────────────────
    case "DEPLOY_JOB_ACK": {
      // Agent reports progress or completion of a deploy job
      const { jobId, status, progress, error } = payload;
      logger.info(`[WS] DEPLOY_JOB_ACK from ${deviceId}: job=${jobId} status=${status} progress=${progress ?? "—"}`);
      broadcastToAdmins("DEPLOY_JOB_ACK", { deviceId, jobId, status, progress, error, ts: Date.now() });
      break;
    }

    // ── MDM policy ACKs ──────────────────────────────────────────────────────
    case "MDM_POLICY_ACK": {
      const { policyId, policyName, enforced, platform } = payload;
      logger.info(`[WS] MDM_POLICY_ACK from ${deviceId}: policy=${policyName} enforced=${enforced}`);
      broadcastToAdmins("MDM_POLICY_ACK", { deviceId, policyId, policyName, enforced, platform, ts: Date.now() });
      break;
    }

    default:
      logger.debug(`[WS] Unknown message type from ${deviceId}: ${type}`);
  }
}

function sendToAgent(deviceId, type, payload) {
  const conn = agentConnections.get(deviceId);
  if (!conn || conn.ws.readyState !== WebSocket.OPEN) {
    logger.warn(`[WS] Agent ${deviceId} not connected`);
    return false;
  }
  try {
    const encrypted = conn.crypto.encrypt({ type, payload, ts: Date.now() });
    conn.ws.send(encrypted);
    return true;
  } catch (err) {
    logger.error(`[WS] Send to agent error:`, err.message);
    return false;
  }
}

function registerAdminConnection(sessionId, ws) {
  adminConnections.set(sessionId, ws);
  ws.on("close", () => adminConnections.delete(sessionId));
}

function broadcastToAdmins(type, payload) {
  const msg = JSON.stringify({ type, payload, ts: Date.now() });
  adminConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

function priorityBroadcastToAdmins(type, payload) {
  // Same channel but prefixed so the admin UI can distinguish and show modal
  const msg = JSON.stringify({ type, payload, ts: Date.now(), priority: "IMMEDIATE" });
  let sent = 0;
  adminConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
      sent++;
    }
  });
  logger.warn(`[WS] Priority broadcast ${type} → ${sent} admin(s)`);
}

function getOnlineDevices() {
  return Array.from(agentConnections.keys());
}

module.exports = { setupAgentWS, sendToAgent, registerAdminConnection, getOnlineDevices };
