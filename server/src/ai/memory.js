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

// ── Bounds ─────────────────────────────────────────────────────────────────
const MAX_OBSERVATIONS    = 50_000;
const MAX_LEARNING_EVENTS = 2_000;
const MAX_INSIGHTS_CAP    = 500;
const MAX_MUTATION_LOG    = 500;

// ── Global Intelligence Store ─────────────────────────────────────────────
class IntelligenceStore {
  constructor() {
    this.deviceProfiles  = new Map();  // sourceId  → behavioral profile
    this.observations    = [];         // ring buffer of raw observations
    this.learningEvents  = [];         // knowledge update / anomaly events
    this.learnedInsights = [];         // cross-device derived conclusions
    this.mutationLog     = [];         // agent update / config change log
  }

  // ── Profile CRUD ────────────────────────────────────────────────────────

  saveDeviceProfile(sourceId, profile) {
    this.deviceProfiles.set(String(sourceId), profile);
    return profile;
  }

  // ── Raw observations ─────────────────────────────────────────────────────

  addObservation(observation) {
    const stored = {
      id:         uuidv4(),
      ts:         Date.now(),
      sourceId:   observation.sourceId,
      sourceType: observation.sourceType || "unknown",
      event:      observation.event,
      category:   observation.category,
      meta:       observation.meta || null,
    };
    this.observations.unshift(stored);
    if (this.observations.length > MAX_OBSERVATIONS) this.observations.pop();
    return stored;
  }

  getObservations(sourceId = null, limit = 100) {
    const cap     = Math.min(limit, 1000);
    const results = sourceId
      ? this.observations.filter(o => o.sourceId === sourceId)
      : this.observations;
    return results.slice(0, cap);
  }

  // ── Learning events ──────────────────────────────────────────────────────

  addLearningEvent(event) {
    const stored = { id: uuidv4(), ...event, ts: event.ts || Date.now() };
    this.learningEvents.unshift(stored);
    if (this.learningEvents.length > MAX_LEARNING_EVENTS) this.learningEvents.pop();
    return stored;
  }

  getLearningEvents(limit = 50) {
    return this.learningEvents.slice(0, Math.min(limit, MAX_LEARNING_EVENTS));
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
    return this.deviceProfiles.get(String(deviceId)) || null;
  }

  getAllProfiles() {
    return Array.from(this.deviceProfiles.values());
  }

  addMutation(event, target, result) {
    this.mutationLog.unshift({
      id:     uuidv4(),
      ts:     new Date().toISOString().replace("T", " ").slice(0, 16),
      event,
      target,
      result,
    });
    if (this.mutationLog.length > MAX_MUTATION_LOG) this.mutationLog.pop();
  }

  addInsight(insight) {
    const stored = { id: uuidv4(), ts: Date.now(), ...insight };
    this.learnedInsights.unshift(stored);
    if (this.learnedInsights.length > MAX_INSIGHTS_CAP) this.learnedInsights.pop();
    return stored;
  }

  getMutationLog(limit = 20) {
    return this.mutationLog.slice(0, Math.min(limit, MAX_MUTATION_LOG));
  }

  getInsights(limit = 20) {
    return this.learnedInsights.slice(0, Math.min(limit, MAX_INSIGHTS_CAP));
  }
}

// Singletons
const conversationMemory = new ConversationMemory();
const intelligenceStore  = new IntelligenceStore();

// Seed representative agent lifecycle events
[
  { event: "Agent binary updated to v4.7.2",             target: "All enrolled agents",  result: "OK" },
  { event: "TLS certificate rotated (90-day cycle)",     target: "All agents",           result: "OK" },
  { event: "Enroll key refreshed",                       target: "Registration service", result: "OK" },
  { event: "Heartbeat interval adjusted (30 s → 15 s)", target: "Fleet-wide policy",    result: "OK" },
  { event: "Behavioral baseline reset post-OS-upgrade",  target: "WORKSTATION-WIN11",    result: "OK" },
].forEach(m => intelligenceStore.addMutation(m.event, m.target, m.result));

module.exports = { conversationMemory, intelligenceStore };
// test-canary-btx
