/**
 * bixtx.com — Chat & Intelligence API Routes
 * POST /v1/ai/chat             — send message, receive AI response
 * GET  /v1/ai/memory           — conversation history for a session
 * GET  /v1/ai/knowledge        — aggregated learned knowledge across all devices
 * GET  /v1/ai/profile/:id      — behavioral profile for a single device
 * GET  /v1/ai/profiles         — all device profiles
 * GET  /v1/ai/insights         — derived insights + mutation log
 * GET  /v1/ai/learning-events  — raw learning event stream
 * POST /v1/ai/observe          — ingest an observation (learn + analyze)
 * POST /v1/ai/clear            — clear a conversation session
 */

"use strict";

const express   = require("express");
const jwt       = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");

const { conversationMemory, intelligenceStore } = require("../ai/memory");
const { learningEngine }                        = require("../ai/learningEngine");
const { analyze }                               = require("../ai/analyzer");
const logger                                    = require("../logger");

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "bixtx-secret-change-in-production";

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.admin = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

const chatLimiter = rateLimit({
  windowMs: 60_000, max: 60,
  message:  { error: "Too many chat requests" },
  keyGenerator: (req) => req.admin?.id || req.ip,
});

const observeLimiter = rateLimit({
  windowMs: 60_000, max: 300,
  message:  { error: "Observation rate exceeded" },
  keyGenerator: (req) => req.body?.sourceId || req.ip,
});

function parseLimit(raw, def = 50, max = 500) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), max) : def;
}

// ── POST /v1/ai/chat ───────────────────────────────────────────────────────
router.post("/chat", authRequired, chatLimiter, async (req, res) => {
  const { message, sessionId: clientSessionId } = req.body;
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message must be a non-empty string" });
  }
  if (message.length > 4_000) {
    return res.status(400).json({ error: "message too long (max 4000 chars)" });
  }

  const sessionId = clientSessionId || req.admin.id;
  const context   = conversationMemory.getContext(sessionId);

  conversationMemory.addMessage(sessionId, "user", message.trim());

  try {
    const aiResponse = await analyze(sessionId, message.trim(), context);

    const aiMsg = conversationMemory.addMessage(sessionId, "assistant", aiResponse.text, {
      type:          aiResponse.type,
      confidence:    aiResponse.confidence,
      intents:       aiResponse.intents,
      deviceContext: aiResponse.deviceContext,
    });

    if (aiResponse.type === "analysis") {
      intelligenceStore.addInsight({
        source:  "chat_analysis",
        query:   message.slice(0, 200),
        summary: aiResponse.text.slice(0, 200),
        adminId: req.admin.id,
      });
    }

    res.json({
      message: {
        id:         aiMsg.id,
        role:       "assistant",
        content:    aiResponse.text,
        type:       aiResponse.type,
        confidence: aiResponse.confidence,
        ts:         aiMsg.ts,
        command:    aiResponse.command || null,
      },
      sessionId,
      context: { intents: aiResponse.intents, deviceContext: aiResponse.deviceContext },
    });
  } catch (err) {
    logger.error("[AI] Chat error:", err.message);
    res.status(500).json({ error: "AI processing error" });
  }
});

// ── GET /v1/ai/memory ─────────────────────────────────────────────────────
router.get("/memory", authRequired, (req, res) => {
  const sessionId = req.query.session || req.admin.id;
  const limit     = parseLimit(req.query.limit, 100);
  const history   = conversationMemory.getHistory(sessionId, limit);
  const context   = conversationMemory.getContext(sessionId);
  res.json({ history, context, sessionId, total: history.length });
});

// ── GET /v1/ai/knowledge ──────────────────────────────────────────────────
// Aggregated learned knowledge: profiles, insights, learning events, summary
router.get("/knowledge", authRequired, (req, res) => {
  const limit = parseLimit(req.query.limit, 50, 200);
  try {
    res.json(learningEngine.getKnowledge(limit));
  } catch (err) {
    logger.error("[AI] knowledge error:", err.message);
    res.status(500).json({ error: "Failed to retrieve knowledge" });
  }
});

// ── GET /v1/ai/profile/:id ────────────────────────────────────────────────
router.get("/profile/:id", authRequired, (req, res) => {
  const id      = String(req.params.id).slice(0, 128);
  const profile = intelligenceStore.getDeviceProfile(id);
  if (!profile) return res.status(404).json({ error: "No profile found for this device" });
  res.json(profile);
});

// ── GET /v1/ai/profiles ───────────────────────────────────────────────────
router.get("/profiles", authRequired, (req, res) => {
  const limit    = parseLimit(req.query.limit, 100, 1000);
  const all      = intelligenceStore.getAllProfiles();
  res.json({ profiles: all.slice(0, limit), total: all.length });
});

// ── GET /v1/ai/insights ───────────────────────────────────────────────────
router.get("/insights", authRequired, (req, res) => {
  const limit     = parseLimit(req.query.limit, 20, 200);
  const mutLimit  = parseLimit(req.query.mutations, 10, 100);
  const insights  = intelligenceStore.getInsights(limit);
  const mutations = intelligenceStore.getMutationLog(mutLimit);
  res.json({ insights, mutations, total: { insights: insights.length, mutations: mutations.length } });
});

// ── GET /v1/ai/learning-events ────────────────────────────────────────────
// Raw stream of knowledge updates, anomaly detections, rate-limit events
router.get("/learning-events", authRequired, (req, res) => {
  const limit  = parseLimit(req.query.limit, 50, 500);
  const events = intelligenceStore.getLearningEvents(limit);
  res.json({ events, total: events.length });
});

// ── POST /v1/ai/observe ───────────────────────────────────────────────────
// Ingest a behavioral observation, learn from it, and return analysis
router.post("/observe", authRequired, observeLimiter, (req, res) => {
  const { sourceId, sourceType, event, category, meta } = req.body;
  if (!sourceId || !event || !category) {
    return res.status(400).json({ error: "sourceId, event, and category are required" });
  }
  try {
    const result = learningEngine.learnAndAnalyze({ sourceId, sourceType, event, category, meta });
    if (result.error === "rate_limited") return res.status(429).json({ error: "rate_limited" });
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (err) {
    if (err instanceof TypeError || err instanceof RangeError) {
      return res.status(400).json({ error: err.message });
    }
    logger.error("[AI] observe error:", err.message);
    res.status(500).json({ error: "Failed to process observation" });
  }
});

// ── POST /v1/ai/clear ─────────────────────────────────────────────────────
router.post("/clear", authRequired, (req, res) => {
  const sessionId = req.body.sessionId || req.admin.id;
  conversationMemory.clearSession(sessionId);
  logger.info(`[AI] session cleared: ${sessionId} by ${req.admin.email}`);
  res.json({ ok: true, sessionId });
});

module.exports = router;
