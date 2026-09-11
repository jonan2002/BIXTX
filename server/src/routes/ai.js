/**
 * bixtx.com — Chat & Intelligence API Routes
 * POST /v1/ai/chat         — send message, get AI response
 * GET  /v1/ai/memory       — conversation history
 * GET  /v1/ai/profile/:id  — device behavioral profile
 * GET  /v1/ai/insights     — cross-fleet learned insights
 * POST /v1/ai/clear        — clear conversation session
 */

const express = require("express");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { conversationMemory, intelligenceStore } = require("../ai/memory");
const { analyze } = require("../ai/analyzer");
const logger = require("../logger");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "bixtx-secret-change-in-production";

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.admin = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ── POST /v1/ai/chat ───────────────────────────────────────────────────────
router.post("/chat", authRequired, async (req, res) => {
  const { message, sessionId: clientSessionId } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: "Message required" });

  const sessionId = clientSessionId || req.admin.id;
  const context = conversationMemory.getContext(sessionId);

  // Store user message
  conversationMemory.addMessage(sessionId, "user", message);

  try {
    // Generate AI response
    const aiResponse = await analyze(sessionId, message, context);

    // Store AI response
    const aiMsg = conversationMemory.addMessage(sessionId, "assistant", aiResponse.text, {
      type: aiResponse.type,
      confidence: aiResponse.confidence,
      intents: aiResponse.intents,
      deviceContext: aiResponse.deviceContext,
    });

    // Log insight if it's an analysis
    if (aiResponse.type === "analysis") {
      intelligenceStore.addInsight({
        source: "chat_analysis",
        query: message,
        summary: aiResponse.text.slice(0, 200),
        adminId: req.admin.id,
      });
    }

    res.json({
      message: {
        id: aiMsg.id,
        role: "assistant",
        content: aiResponse.text,
        type: aiResponse.type,
        confidence: aiResponse.confidence,
        ts: aiMsg.ts,
        command: aiResponse.command || null,
      },
      sessionId,
      context: {
        intents: aiResponse.intents,
        deviceContext: aiResponse.deviceContext,
      },
    });
  } catch (err) {
    logger.error("[AI] Chat error:", err.message);
    res.status(500).json({ error: "AI processing error", details: err.message });
  }
});

// ── GET /v1/ai/memory ─────────────────────────────────────────────────────
router.get("/memory", authRequired, (req, res) => {
  const sessionId = req.query.session || req.admin.id;
  const history = conversationMemory.getHistory(sessionId, parseInt(req.query.limit || 100));
  const context = conversationMemory.getContext(sessionId);
  res.json({ history, context, sessionId });
});

// ── GET /v1/ai/profile/:id ────────────────────────────────────────────────
router.get("/profile/:id", authRequired, (req, res) => {
  const profile = intelligenceStore.getDeviceProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "No profile for this device" });
  res.json(profile);
});

// ── GET /v1/ai/profiles ───────────────────────────────────────────────────
router.get("/profiles", authRequired, (req, res) => {
  const profiles = intelligenceStore.getAllProfiles();
  res.json({ profiles, total: profiles.length });
});

// ── GET /v1/ai/insights ───────────────────────────────────────────────────
router.get("/insights", authRequired, (req, res) => {
  const insights = intelligenceStore.getInsights(parseInt(req.query.limit || 20));
  const mutations = intelligenceStore.getMutationLog(parseInt(req.query.mutations || 10));
  res.json({ insights, mutations });
});

// ── POST /v1/ai/clear ─────────────────────────────────────────────────────
router.post("/clear", authRequired, (req, res) => {
  const sessionId = req.body.sessionId || req.admin.id;
  conversationMemory.clearSession(sessionId);
  res.json({ ok: true, sessionId });
});

module.exports = router;
