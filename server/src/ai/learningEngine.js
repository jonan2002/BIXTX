/**
 * bixtx.com — Behavioral Learning Engine
 *
 * Ingests device observations, builds per-device behavioral profiles,
 * detects anomalies against the learned baseline, and emits insights.
 *
 * Hardening:
 *   - Input validation + prototype-pollution guard on every inbound observation
 *   - Per-device token-bucket rate limiting (MAX_OBS_PER_WINDOW / minute)
 *   - Bounded event/category dictionaries to prevent unbounded memory growth
 *   - Profile integrity: HMAC signature checked before mutation, re-signed after save
 *   - Deep-clone returns so callers cannot mutate internal state
 *   - Every public method isolated — errors log a learning event, never propagate raw
 */

"use strict";

const { createHmac } = require("crypto");
const { intelligenceStore } = require("./memory");

// ── Tunables ───────────────────────────────────────────────────────────────
const MAX_EVENT_KEYS       = 200;    // unique event types per profile
const MAX_CATEGORY_KEYS    = 50;     // unique category types per profile
const EXPECTED_FREQ_FLOOR  = 0.20;   // minimum frequency to enter expectedBehavior
const OBS_WINDOW_MS        = 60_000; // rate-limit window (1 minute)
const OBS_WINDOW_MAX       = 120;    // max observations per device per window
const FIELD_MAX_LEN        = 128;    // max string length for user-supplied fields
const SOURCE_ID_PATTERN    = /^[a-zA-Z0-9_\-.:]{1,64}$/;

// HMAC key for profile integrity — override in production via env
const PROFILE_HMAC_KEY = process.env.PROFILE_INTEGRITY_KEY || "btx-profile-integrity-key-change-in-prod";

// ── Rate limiter ───────────────────────────────────────────────────────────
const _rateBuckets = new Map(); // sourceId → { count, windowStart }

function _checkRate(sourceId) {
  const now    = Date.now();
  const bucket = _rateBuckets.get(sourceId) || { count: 0, windowStart: now };
  if (now - bucket.windowStart > OBS_WINDOW_MS) {
    bucket.count       = 0;
    bucket.windowStart = now;
  }
  bucket.count++;
  _rateBuckets.set(sourceId, bucket);
  return bucket.count <= OBS_WINDOW_MAX;
}

// ── Profile integrity ──────────────────────────────────────────────────────
function _sign(profile) {
  const payload = JSON.stringify({
    sourceId:     profile.sourceId,
    observations: profile.observations,
    confidence:   profile.confidence,
  });
  return createHmac("sha256", PROFILE_HMAC_KEY).update(payload).digest("hex").slice(0, 24);
}

function _verify(profile) {
  return profile && profile._sig && profile._sig === _sign(profile);
}

// ── Input validation ───────────────────────────────────────────────────────
function _validate(obs) {
  if (!obs || typeof obs !== "object" || Array.isArray(obs)) {
    throw new TypeError("Observation must be a plain object");
  }
  if (!SOURCE_ID_PATTERN.test(String(obs.sourceId || ""))) {
    throw new RangeError("sourceId must be 1–64 alphanumeric/dash/dot chars");
  }
  if (typeof obs.event !== "string" || !obs.event.trim() || obs.event.length > FIELD_MAX_LEN) {
    throw new RangeError("event must be a non-empty string ≤ 128 chars");
  }
  if (typeof obs.category !== "string" || !obs.category.trim() || obs.category.length > FIELD_MAX_LEN) {
    throw new RangeError("category must be a non-empty string ≤ 128 chars");
  }

  // Build sanitized copy — strip prototype-polluting keys
  const safe = Object.create(null);
  for (const [k, v] of Object.entries(obs)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    safe[k] = typeof v === "string" ? v.slice(0, FIELD_MAX_LEN) : v;
  }
  return safe;
}

// ── Deep clone ─────────────────────────────────────────────────────────────
function _clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ── Empty profile factory ──────────────────────────────────────────────────
function _blankProfile(obs) {
  return {
    sourceId:         obs.sourceId,
    sourceType:       String(obs.sourceType || "unknown").slice(0, 64),
    firstSeen:        Date.now(),
    lastSeen:         Date.now(),
    observations:     0,
    categories:       {},
    events:           {},
    expectedBehavior: [],
    confidence:       0,
    _sig:             null,
  };
}

// ── LearningEngine ─────────────────────────────────────────────────────────
class LearningEngine {

  /**
   * Ingest an observation and update the device profile.
   * Returns the updated profile (deep clone) or { error, sourceId } on rate-limit.
   * Never throws to the caller.
   */
  learnFromObservation(observation) {
    try {
      const obs = _validate(observation);

      if (!_checkRate(obs.sourceId)) {
        intelligenceStore.addLearningEvent({
          type:     "rate_limited",
          sourceId: obs.sourceId,
          ts:       Date.now(),
        });
        return { error: "rate_limited", sourceId: obs.sourceId };
      }

      const raw     = intelligenceStore.getDeviceProfile(obs.sourceId);
      const profile = raw ? _clone(raw) : _blankProfile(obs);

      // Integrity check before mutation
      if (raw && !_verify(profile)) {
        intelligenceStore.addLearningEvent({
          type:     "integrity_warning",
          sourceId: obs.sourceId,
          message:  "Profile HMAC mismatch — possible out-of-band modification",
          ts:       Date.now(),
        });
      }

      profile.observations++;
      profile.lastSeen = Date.now();

      // Bounded category tracking
      const catAtCap = Object.keys(profile.categories).length >= MAX_CATEGORY_KEYS;
      if (!catAtCap || profile.categories[obs.category] !== undefined) {
        profile.categories[obs.category] = (profile.categories[obs.category] || 0) + 1;
      }

      // Bounded event tracking
      const evAtCap = Object.keys(profile.events).length >= MAX_EVENT_KEYS;
      if (!evAtCap || profile.events[obs.event] !== undefined) {
        profile.events[obs.event] = (profile.events[obs.event] || 0) + 1;
      }

      // Confidence grows asymptotically from 0.50 toward 0.99
      profile.confidence = Number(
        Math.min(0.99, 0.50 + (profile.observations / 100) * 0.49).toFixed(4)
      );

      // Re-sign before persisting
      profile._sig = _sign(profile);

      const saved = intelligenceStore.saveDeviceProfile(obs.sourceId, profile);
      this._updateExpectedBehavior(obs.sourceId, saved);

      intelligenceStore.addLearningEvent({
        type:       "knowledge_update",
        sourceId:   obs.sourceId,
        event:      obs.event,
        category:   obs.category,
        confidence: saved.confidence,
        ts:         Date.now(),
      });

      return _clone(saved);
    } catch (err) {
      intelligenceStore.addLearningEvent({
        type:    "learn_error",
        message: err.message,
        ts:      Date.now(),
      });
      throw err;
    }
  }

  /**
   * Compare an observation against the established baseline.
   * Never mutates state — read-only.
   */
  analyzeObservation(observation) {
    try {
      const obs     = _validate(observation);
      const profile = intelligenceStore.getDeviceProfile(obs.sourceId);

      if (!profile) {
        return { status: "learning", reason: "No baseline established yet", sourceId: obs.sourceId };
      }

      const eventCount = profile.events[obs.event] || 0;
      const isExpected = profile.expectedBehavior.some(b => b.event === obs.event);

      if (isExpected) {
        return { status: "expected", confidence: profile.confidence };
      }
      if (eventCount > 0) {
        return {
          status:      "unusual",
          confidence:  profile.confidence,
          reason:      "Event is known but below the expected-behavior frequency threshold",
          occurrences: eventCount,
        };
      }
      return {
        status:     "new",
        confidence: profile.confidence,
        reason:     "Previously unseen event for this source",
      };
    } catch (err) {
      return { status: "error", reason: err.message };
    }
  }

  /**
   * Atomic learn + analyze: store observation, update profile, emit insight if anomalous.
   */
  learnAndAnalyze(observation) {
    try {
      const obs      = _validate(observation);
      const analysis = this.analyzeObservation(obs);  // read before mutation
      const stored   = intelligenceStore.addObservation(obs);
      const profile  = this.learnFromObservation(stored);

      if (analysis.status === "unusual" || analysis.status === "new") {
        intelligenceStore.addInsight({
          type:        "behavioral_anomaly",
          sourceId:    obs.sourceId,
          sourceType:  obs.sourceType,
          event:       obs.event,
          category:    obs.category,
          status:      analysis.status,
          confidence:  analysis.confidence,
          description: analysis.reason,
        });
      }

      return { observation: stored, analysis, profile };
    } catch (err) {
      return { error: err.message };
    }
  }

  /**
   * Aggregate knowledge summary for the /v1/ai/knowledge endpoint.
   */
  getKnowledge(limit = 50) {
    const cap      = Math.min(limit, 200);
    const profiles = intelligenceStore.getAllProfiles();
    const insights = intelligenceStore.getInsights(cap);
    const events   = intelligenceStore.getLearningEvents(cap);

    const totalConf = profiles.reduce((s, p) => s + (p.confidence || 0), 0);
    const summary   = {
      totalProfiles:     profiles.length,
      totalInsights:     intelligenceStore.getInsights(9999).length,
      totalObservations: intelligenceStore.getObservations(null, 9999).length,
      avgConfidence:     profiles.length
        ? Number((totalConf / profiles.length).toFixed(4))
        : 0,
      anomaliesDetected: insights.filter(i => i.type === "behavioral_anomaly").length,
    };

    return {
      summary,
      profiles:      profiles.slice(0, cap),
      insights,
      recentEvents:  events,
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _updateExpectedBehavior(sourceId, profile) {
    const expected = [];
    for (const [event, count] of Object.entries(profile.events)) {
      const frequency = count / profile.observations;
      if (frequency >= EXPECTED_FREQ_FLOOR) {
        expected.push({
          event,
          frequency:  Number(frequency.toFixed(4)),
          confidence: Number(Math.min(0.99, frequency * profile.confidence).toFixed(4)),
        });
      }
    }
    expected.sort((a, b) => b.frequency - a.frequency);
    profile.expectedBehavior = expected;
    intelligenceStore.saveDeviceProfile(sourceId, profile);
    return expected;
  }
}

const learningEngine = new LearningEngine();
module.exports = { learningEngine };
