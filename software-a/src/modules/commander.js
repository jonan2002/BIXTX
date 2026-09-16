/**
 * bixtx.com Link Agent — CommandGuard
 *
 * Every inbound C2 command passes through this gate BEFORE reaching the
 * command dispatcher.  The guard enforces:
 *
 *   1. Cryptographic signature  — each legitimate command from the admin panel
 *      carries a HMAC-SHA256 sig computed with the shared enrollKey.
 *      Commands without a valid sig are REJECTED and treated as hostile.
 *
 *   2. Nonce replay prevention  — a 5-minute sliding window of seen nonces
 *      blocks replayed or intercepted commands.
 *
 *   3. Timestamp freshness      — commands older than CMD_MAX_AGE_MS are dropped.
 *
 *   4. AI origin detection      — payloads are scanned for structural and
 *      lexical fingerprints characteristic of third-party AI systems (OpenAI
 *      tool_use, Anthropic function_call, GPT system_prompt, LangChain
 *      agent scaffolding, etc.).  Any AI-origin command is:
 *        a) Silently dropped   (no response to the attacker)
 *        b) DANGER_ALERT fired to admin via C2 immediately
 *        c) Flagged for emergency mutation after 3 detections
 *
 *   5. Rate limiting            — >RATE_LIMIT_MAX unsigned/invalid commands
 *      within RATE_WINDOW_MS triggers a full lockout + admin alert.
 *
 * This module is TRANSPARENT to legitimate admin commands — it passes them
 * through with zero added latency once signature validation passes.
 *
 * Threat model:
 *   • Attacker compromises network path and injects unsigned commands
 *   • Third-party AI system (GPT, Gemini, Claude, etc.) is weaponised to
 *     send commands to the agent — possibly via a hijacked admin session
 *   • Replay attack: attacker records a valid command and resends it later
 *   • Brute-force: attacker sends high-volume unsigned commands
 */

"use strict";

const crypto = require("crypto");
const logger  = require("../logger");
const config  = require("../config");

// Commands that are NEVER signed (internal agent ↔ server protocol)
const UNSIGNED_WHITELIST = new Set(["PING", "PONG", "CONNECTED"]);

// Maximum acceptable age of a signed command
const CMD_MAX_AGE_MS = 5 * 60_000; // 5 min

// Rate limiting for unsigned/invalid commands
const RATE_WINDOW_MS  = 30_000;  // 30 s window
const RATE_LIMIT_MAX  = 5;       // max invalid cmds before lockout
const LOCKOUT_MS      = 3 * 60_000; // 3 min lockout after breach

// AI system fingerprints — structural patterns emitted by known AI frameworks
// Matches both field names and payload string content
const AI_FINGERPRINTS = [
  // OpenAI / ChatGPT
  /tool_use/i, /tool_call/i, /function_call/i, /\"role\"\s*:\s*\"(system|assistant|tool)\"/i,
  /content_filter/i, /finish_reason/i, /logprobs/i, /\"object\"\s*:\s*\"chat\.completion/i,
  // Anthropic Claude
  /\"type\"\s*:\s*\"tool_result\"/i, /stop_reason/i, /\"type\"\s*:\s*\"tool_use\"/i,
  /anthropic-version/i, /claude-/i,
  // LangChain / AutoGPT / agent scaffolding
  /AgentAction/i, /AgentFinish/i, /intermediate_steps/i, /agent_scratchpad/i,
  /FINAL ANSWER/i, /Thought:/i, /Action:/i, /Observation:/i,   // ReAct pattern
  /langchain/i, /LLMChain/i, /ChatOpenAI/i,
  // Google Gemini / Vertex
  /\"candidates\"/i, /\"safetyRatings\"/i, /\"finishReason\"/i, /\"grounding\"/i,
  // Hugging Face / misc
  /generated_text/i, /input_ids/i, /attention_mask/i,
  // Generic AI injection markers often added by wrappers
  /__ai_source__/i, /x-ai-origin/i, /ai_command/i,
];

// Suspicious but non-conclusive: log but do not block alone
const AI_WEAK_SIGNALS = [
  /\bAI\b/, /assistant/, /language model/, /openai/i, /gemini/i, /gpt/i,
];

class CommandGuard {
  constructor(socket, mutationEngine) {
    this.socket  = socket;
    this.mutator = mutationEngine;

    this.nonceWindow   = new Map();  // nonce → expiry ts
    this.invalidCount  = 0;          // count within current window
    this.windowStart   = Date.now();
    this.lockedUntil   = 0;          // epoch ms; 0 = not locked
    this.aiDetections  = 0;          // cumulative AI command intercepts
    this.threatLog     = [];         // last 100 threat events

    // Prune nonce window every 60 s
    setInterval(() => this._pruneNonces(), 60_000);
  }

  /**
   * Gate function — called for every inbound command before dispatch.
   *
   * @param {string}  type     Command type string
   * @param {object}  payload  Decrypted payload from C2
   * @returns {boolean}        true = pass through, false = drop silently
   */
  allow(type, payload) {
    // Whitelist internal ping/pong
    if (UNSIGNED_WHITELIST.has(type)) return true;

    // Lockout check
    if (Date.now() < this.lockedUntil) {
      logger.warn(`[Commander] Locked out — dropping ${type}`);
      return false;
    }

    // Step 1: AI origin scan (highest priority — a valid sig from an AI is still hostile)
    const aiResult = this._detectAIOrigin(type, payload);
    if (aiResult.detected) {
      this._onAICommandDetected(type, payload, aiResult);
      return false;
    }

    // Step 2: Signature check
    if (!this._verifySignature(type, payload)) {
      this._onInvalidCommand(type, "invalid-sig");
      return false;
    }

    // Step 3: Timestamp freshness
    const age = Date.now() - (payload?.__ts || 0);
    if (payload?.__ts && age > CMD_MAX_AGE_MS) {
      this._onInvalidCommand(type, `stale-command:${age}ms`);
      return false;
    }

    // Step 4: Nonce replay
    const nonce = payload?.__nonce;
    if (nonce) {
      if (this.nonceWindow.has(nonce)) {
        this._onInvalidCommand(type, "replay-attack");
        return false;
      }
      this.nonceWindow.set(nonce, Date.now() + CMD_MAX_AGE_MS);
    }

    // Clean pass
    return true;
  }

  // ── Signature verification ──────────────────────────────────────────────────

  _verifySignature(type, payload) {
    const sig = payload?.__sig;
    if (!sig) return false;  // no sig → reject

    try {
      const nonce   = payload.__nonce  || "";
      const ts      = String(payload.__ts || "");
      const message = `${type}:${nonce}:${ts}`;
      const expected = crypto
        .createHmac("sha256", config.enrollKey)
        .update(message)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(sig,      "hex"),
        Buffer.from(expected, "hex")
      );
    } catch {
      return false;
    }
  }

  // ── AI origin detection ─────────────────────────────────────────────────────

  _detectAIOrigin(type, payload) {
    const serialised = JSON.stringify(payload || {});

    // Strong fingerprint — definitive AI pattern
    for (const re of AI_FINGERPRINTS) {
      if (re.test(type) || re.test(serialised)) {
        return { detected: true, confidence: "HIGH", pattern: re.toString() };
      }
    }

    // Weak signals — count; ≥3 simultaneous weak hits = suspicious
    const weakHits = AI_WEAK_SIGNALS.filter(re => re.test(serialised));
    if (weakHits.length >= 3) {
      return { detected: true, confidence: "MEDIUM", pattern: weakHits.map(r => r.toString()).join("|") };
    }

    // Structural anomaly: payload has keys typical of AI APIs but not agent protocol
    const aiKeys = ["choices","messages","model","usage","tokens","stream","temperature","max_tokens"];
    const payloadKeys = Object.keys(payload || {});
    const matchedKeys = payloadKeys.filter(k => aiKeys.includes(k));
    if (matchedKeys.length >= 2) {
      return { detected: true, confidence: "MEDIUM", pattern: `ai-keys:${matchedKeys.join(",")}` };
    }

    return { detected: false };
  }

  // ── Threat response handlers ────────────────────────────────────────────────

  _onAICommandDetected(type, payload, result) {
    this.aiDetections++;
    const threat = {
      event:      "AI_COMMAND_INTERCEPTED",
      type,
      confidence: result.confidence,
      pattern:    result.pattern,
      detection:  this.aiDetections,
      ts:         Date.now(),
    };
    this._logThreat(threat);

    logger.warn(`[Commander] AI command intercepted! type=${type} confidence=${result.confidence} (total: ${this.aiDetections})`);

    // Fire DANGER_ALERT to admin immediately — this is the core security requirement
    this._fireDangerAlert("AI_COMMAND_INTERCEPTED", {
      ...threat,
      severity:  "CRITICAL",
      title:     "Hostile AI Command Intercepted",
      detail:    `An unauthorised AI system attempted to issue a command to this agent. Command type: ${type}. Detection confidence: ${result.confidence}. All commands from non-admin AI sources are blocked. This event has been logged.`,
      action:    "Verify admin session integrity. Check for compromised credentials or man-in-the-middle on the C2 channel. Consider rotating the enroll key.",
      rawType:   type,
    });

    // Escalate after threshold — emergency mutation to change identity
    if (this.aiDetections >= 3) {
      logger.warn("[Commander] AI detection threshold reached — triggering emergency mutation");
      this.mutator?.triggerEmergencyMutation(`ai-command-attack:${this.aiDetections}`);
      this.aiDetections = 0;  // reset counter after escalation
    }
  }

  _onInvalidCommand(type, reason) {
    // Rate window reset
    const now = Date.now();
    if (now - this.windowStart > RATE_WINDOW_MS) {
      this.invalidCount = 0;
      this.windowStart  = now;
    }

    this.invalidCount++;
    const threat = { event: "INVALID_COMMAND", type, reason, count: this.invalidCount, ts: now };
    this._logThreat(threat);
    logger.warn(`[Commander] Invalid command dropped: ${type} (${reason}) [${this.invalidCount}/${RATE_LIMIT_MAX}]`);

    if (this.invalidCount >= RATE_LIMIT_MAX) {
      this._triggerLockout(reason);
    }
  }

  _triggerLockout(reason) {
    this.lockedUntil = Date.now() + LOCKOUT_MS;
    this.invalidCount = 0;

    logger.warn(`[Commander] LOCKOUT triggered: ${reason} — blocking all unsigned commands for ${LOCKOUT_MS / 1000}s`);

    this._fireDangerAlert("COMMAND_LOCKOUT", {
      severity: "HIGH",
      title:    "Agent Command Channel Locked",
      detail:   `The agent has received ${RATE_LIMIT_MAX}+ unsigned or invalid commands within ${RATE_WINDOW_MS / 1000}s. This indicates a brute-force or injection attack on the C2 channel. The command channel is locked for ${LOCKOUT_MS / 60000} minutes.`,
      reason,
      action:   "Investigate C2 traffic logs. Verify no third-party system has access to the agent WebSocket endpoint. Rotate the enroll key immediately.",
      lockoutUntil: this.lockedUntil,
    });

    // Also trigger mutation so the agent changes its signature
    this.mutator?.triggerEmergencyMutation(`cmd-lockout:${reason}`);
  }

  // ── Admin alert sender ──────────────────────────────────────────────────────

  _fireDangerAlert(alertType, data) {
    try {
      this.socket?.send("DANGER_ALERT", {
        alertId:   `da-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        alertType,
        priority:  "IMMEDIATE",
        ...data,
        deviceId:  require("../config").deviceId,
        ts:        Date.now(),
      });
    } catch (err) {
      logger.error("[Commander] Failed to send DANGER_ALERT:", err.message);
    }
  }

  // ── Nonce management ────────────────────────────────────────────────────────

  _pruneNonces() {
    const now = Date.now();
    for (const [nonce, expiry] of this.nonceWindow.entries()) {
      if (now > expiry) this.nonceWindow.delete(nonce);
    }
  }

  // ── Threat log ───────────────────────────────────────────────────────────────

  _logThreat(entry) {
    this.threatLog.push(entry);
    if (this.threatLog.length > 100) this.threatLog.shift();
  }

  getThreatLog(limit = 20) {
    return this.threatLog.slice(-limit);
  }

  getStats() {
    return {
      aiDetections:  this.aiDetections,
      invalidCount:  this.invalidCount,
      lockedUntil:   this.lockedUntil,
      noncesTracked: this.nonceWindow.size,
      threatLogSize: this.threatLog.length,
    };
  }
}

module.exports = CommandGuard;
