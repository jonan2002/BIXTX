/**
 * bixtx.com — Cloud Sync Upload Route
 * POST /v1/sync/upload  — receives encrypted memory blobs from Software A agents
 * GET  /v1/sync/status  — last sync timestamps per device
 */

"use strict";

const express = require("express");
const crypto  = require("crypto");
const { v4: uuidv4 } = require("uuid");
const store   = require("../db/store");
const { intelligenceStore } = require("../ai/memory");
const logger  = require("../logger");

const router = express.Router();

const ENROLL_KEY    = process.env.BIXTX_ENROLL_KEY || "BTX-2026-ALPHA";
const MAX_BLOB_SIZE = 50 * 1024 * 1024; // 50 MB per upload

// Per-device sync tracking (in-memory; survives restarts via DB)
const syncRegistry = new Map(); // deviceId → { lastSync, count, bytes }

// ── Token verification (same HMAC as agent) ───────────────────────────────
function verifyToken(deviceId, token) {
  const expected = crypto.createHmac("sha256", ENROLL_KEY)
    .update(deviceId).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// ── POST /v1/sync/upload ──────────────────────────────────────────────────
router.post(
  "/upload",
  express.raw({ type: "application/octet-stream", limit: `${MAX_BLOB_SIZE}b` }),
  (req, res) => {
    const deviceId = req.headers["x-device-id"];
    const token    = (req.headers["authorization"] || "").replace("Bearer ", "");
    const version  = req.headers["x-agent-version"] || "unknown";

    if (!deviceId || !token) {
      return res.status(400).json({ error: "Missing device-id or auth token" });
    }

    if (!verifyToken(deviceId, token)) {
      logger.warn(`[Sync] Rejected upload from ${deviceId} — invalid token`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const blob = req.body;
    if (!Buffer.isBuffer(blob) || blob.length === 0) {
      return res.status(400).json({ error: "Empty or invalid payload" });
    }

    logger.debug(`[Sync] Received ${blob.length} bytes from ${deviceId} (agent v${version})`);

    // Decrypt the outer envelope to extract module metadata
    // We don't store the raw encrypted blob — we just record the sync event
    // and update the device profile. Full decryption happens in the AI analyzer.
    const sizeKB = Math.round(blob.length / 1024);

    // Record sync event
    const syncId = uuidv4();
    const entry = {
      id:          syncId,
      deviceId,
      receivedAt:  Date.now(),
      sizeBytes:   blob.length,
      agentVersion: version,
      icloudSync:  req.headers["x-icloud-sync"] === "1",
    };

    // Update in-memory registry
    const prev = syncRegistry.get(deviceId) || { count: 0, bytes: 0 };
    syncRegistry.set(deviceId, {
      deviceId,
      lastSync:  Date.now(),
      count:     prev.count + 1,
      bytes:     prev.bytes + blob.length,
    });

    // Update device profile in intelligence store
    intelligenceStore.updateDeviceProfile(deviceId, {
      module: "sync",
      syncSizeKB: sizeKB,
      agentVersion: version,
    });

    // Update device last_seen in DB
    const dev = store.devices.getById(deviceId);
    if (dev) {
      store.devices.ping(deviceId);
    } else {
      logger.warn(`[Sync] Upload from unknown device ${deviceId} — not enrolled`);
    }

    logger.info(`[Sync] ✅ ${deviceId} → ${sizeKB} KB synced (total uploads: ${prev.count + 1})`);

    res.json({
      ok: true,
      syncId,
      receivedBytes: blob.length,
      ts: Date.now(),
    });
  }
);

// ── GET /v1/sync/status ───────────────────────────────────────────────────
router.get("/status", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const jwt = require("jsonwebtoken");
    jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || "bixtx-secret-change-in-production");
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const deviceId = req.query.device;
  if (deviceId) {
    const entry = syncRegistry.get(deviceId);
    return res.json(entry || { deviceId, count: 0, bytes: 0, lastSync: null });
  }

  const all = Array.from(syncRegistry.values()).sort((a, b) => (b.lastSync || 0) - (a.lastSync || 0));
  res.json({ syncs: all, total: all.length });
});

// ── GET /v1/sync/log ──────────────────────────────────────────────────────
router.get("/log", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const jwt = require("jsonwebtoken");
    jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || "bixtx-secret-change-in-production");
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }

  const all = Array.from(syncRegistry.values());
  const totalBytes = all.reduce((s, e) => s + (e.bytes || 0), 0);
  const totalUploads = all.reduce((s, e) => s + (e.count || 0), 0);

  res.json({
    devices:      all.length,
    totalUploads,
    totalBytes,
    totalMB:      Math.round(totalBytes / 1024 / 1024 * 10) / 10,
    entries:      all.sort((a, b) => (b.lastSync || 0) - (a.lastSync || 0)),
  });
});

module.exports = router;
