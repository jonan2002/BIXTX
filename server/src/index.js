"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const http        = require("http");
const express     = require("express");
const WebSocket   = require("ws");
const cors        = require("cors");
const helmet      = require("helmet");
const compression = require("compression");
const { URL }     = require("url");

const store      = require("./db/store");
const apiRoutes  = require("./routes/api");
const aiRoutes   = require("./routes/ai");
const syncRoutes = require("./routes/sync");
const wsHandler  = require("./websocket/handler");
const logger     = require("./logger");

const PORT       = parseInt(process.env.PORT || "3000");
const ENROLL_KEY = process.env.BIXTX_ENROLL_KEY || "BTX-2026-ALPHA";

// ── Express ────────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) =>
  res.json({ status: "ok", version: "4.7.2", ts: Date.now(), uptime: process.uptime() })
);

app.use("/v1", apiRoutes);
app.use("/v1/ai", aiRoutes);
app.use("/v1/sync", syncRoutes);
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, _req, res, _next) => {
  logger.error("Unhandled:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── HTTP server ────────────────────────────────────────────────────────────
const httpServer = http.createServer(app);

// ── WebSocket servers (noServer mode — share the HTTP port) ────────────────
const adminWss = new WebSocket.Server({ noServer: true });
const agentWss = new WebSocket.Server({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  let pathname;
  try {
    pathname = new URL(req.url, "http://localhost").pathname;
  } catch {
    socket.destroy();
    return;
  }

  if (pathname === "/admin-ws") {
    adminWss.handleUpgrade(req, socket, head, (ws) =>
      adminWss.emit("connection", ws, req)
    );
  } else if (pathname === "/agent") {
    agentWss.handleUpgrade(req, socket, head, (ws) =>
      agentWss.emit("connection", ws, req)
    );
  } else {
    socket.destroy();
  }
});

// ── Admin WebSocket ─────────────────────────────────────────────────────────
adminWss.on("connection", (ws, req) => {
  const url   = new URL(req.url, "http://localhost");
  const token = url.searchParams.get("token");
  try {
    const jwt = require("jsonwebtoken");
    jwt.verify(token, process.env.JWT_SECRET || "bixtx-secret-change-in-production");
    const sessionId = require("uuid").v4();
    wsHandler.registerAdminConnection(sessionId, ws);
    logger.info(`[Admin WS] Connected: ${sessionId}`);
    ws.send(JSON.stringify({ type: "CONNECTED", payload: { sessionId, ts: Date.now() } }));
  } catch {
    ws.close(4003, "Unauthorized");
  }
});

// ── Agent C2 WebSocket ──────────────────────────────────────────────────────
wsHandler.setupAgentWS(agentWss, ENROLL_KEY);

// ── Start ───────────────────────────────────────────────────────────────────
store.init();

httpServer.listen(PORT, "0.0.0.0", () => {
  logger.info(`bixtx backend v4.7.2 listening on port ${PORT}`);
  logger.info(`  REST API  → /v1/*`);
  logger.info(`  Admin WS  → ws://...${PORT}/admin-ws`);
  logger.info(`  Agent C2  → ws://...${PORT}/agent`);
});

process.on("SIGINT",  () => { logger.info("SIGINT — shutting down"); process.exit(0); });
process.on("SIGTERM", () => { logger.info("SIGTERM — shutting down"); process.exit(0); });
process.on("uncaughtException",  e => logger.error("Uncaught:", e.message));
process.on("unhandledRejection", e => logger.error("Unhandled:", e));
