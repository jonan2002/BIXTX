/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  BIXTX — BACKEND SERVER                                  ║
 * ║  Version 4.7.2  |  C2 Relay + REST API + Admin WebSocket     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Listens on:
 *   HTTP  :3000  → REST API  (/v1/*)
 *   WS    :3001  → Agent C2 relay (agent connections)
 *   WS    :3000  → Admin real-time feed (/admin-ws)
 *
 * Start: node src/index.js
 */

"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const http = require("http");
const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const store = require("./db/store");
const apiRoutes  = require("./routes/api");
const aiRoutes   = require("./routes/ai");
const syncRoutes = require("./routes/sync");
const wsHandler = require("./websocket/handler");
const logger = require("./logger");

const HTTP_PORT  = parseInt(process.env.PORT || "3000");
const WS_PORT    = parseInt(process.env.WS_PORT || "3001");
const ENROLL_KEY = process.env.BIXTX_ENROLL_KEY || "BTX-2026-ALPHA";

// ── Express App ────────────────────────────────────────────────────────────
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" }));

// Health check (no auth)
app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "4.7.2", ts: Date.now(), uptime: process.uptime() });
});

// REST API
app.use("/v1", apiRoutes);
app.use("/v1/ai", aiRoutes);
app.use("/v1/sync", syncRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Error handler
app.use((err, req, res, _next) => {
  logger.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── HTTP Server ─────────────────────────────────────────────────────────────
const httpServer = http.createServer(app);

// Admin WebSocket (on the same HTTP port, path /admin-ws)
const adminWss = new WebSocket.Server({ server: httpServer, path: "/admin-ws" });
adminWss.on("connection", (ws, req) => {
  // Validate JWT from query string
  const url = new URL(req.url, `http://localhost:${HTTP_PORT}`);
  const token = url.searchParams.get("token");
  try {
    const jwt = require("jsonwebtoken");
    jwt.verify(token, process.env.JWT_SECRET || "bixtx-secret-change-in-production");
    const sessionId = require("uuid").v4();
    wsHandler.registerAdminConnection(sessionId, ws);
    logger.info(`[Admin WS] Admin connected: session ${sessionId}`);
    ws.send(JSON.stringify({ type: "CONNECTED", payload: { sessionId, ts: Date.now() } }));
  } catch {
    ws.close(4003, "Unauthorized");
  }
});

// ── Agent C2 WebSocket Server (separate port) ───────────────────────────────
const agentWss = new WebSocket.Server({ port: WS_PORT });
wsHandler.setupAgentWS(agentWss, ENROLL_KEY);

// ── Start ────────────────────────────────────────────────────────────────────
store.init();

httpServer.listen(HTTP_PORT, () => {
  logger.info(`╔════════════════════════════════════════╗`);
  logger.info(`║  bixtx Backend Server v4.7.2       ║`);
  logger.info(`║  REST API   → http://0.0.0.0:${HTTP_PORT}       ║`);
  logger.info(`║  Admin WS   → ws://0.0.0.0:${HTTP_PORT}/admin-ws║`);
  logger.info(`║  Agent C2   → ws://0.0.0.0:${WS_PORT}           ║`);
  logger.info(`╚════════════════════════════════════════╝`);
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
process.on("SIGINT",  () => { logger.info("Shutting down..."); process.exit(0); });
process.on("SIGTERM", () => { logger.info("Shutting down..."); process.exit(0); });
process.on("uncaughtException",  err => logger.error("Uncaught:", err.message));
process.on("unhandledRejection", err => logger.error("Unhandled:", err));
