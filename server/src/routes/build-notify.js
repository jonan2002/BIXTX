"use strict";
/**
 * build-notify.js
 * Central store for GitHub Actions build results.
 * Exports:
 *   binaryUrls  — { android, ios, harmony, linux, macos, windows } → URL | null
 *   router      — Express router handling /build/:platform/notify + /build/:platform/status
 */

const express = require("express");

const router = express.Router();

const PLATFORMS = ["android", "ios", "harmony", "linux", "macos", "windows"];

// In-memory store — survives Render restarts only within the same process.
// For persistence across restarts, set BINARY_URLS_<PLATFORM> env vars on Render.
const binaryUrls = Object.fromEntries(
  PLATFORMS.map(p => [
    p,
    process.env[`BINARY_URL_${p.toUpperCase()}`] || null,
  ])
);

// ── POST /v1/build/:platform/notify ──────────────────────────────────────────
// Called by GitHub Actions when a build completes.
// Body: { status, downloadUrl, secret, build? }
router.post("/build/:platform/notify", (req, res) => {
  const { platform } = req.params;

  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: "Unknown platform", supported: PLATFORMS });
  }

  const provided = req.headers["x-notify-secret"] || req.body?.secret;
  const expected = process.env.RENDER_APK_NOTIFY_SECRET;
  if (expected && provided !== expected) {
    return res.status(401).json({ error: "Invalid webhook secret" });
  }

  const { status, downloadUrl, build } = req.body || {};

  if (status === "completed" && downloadUrl) {
    binaryUrls[platform] = downloadUrl;
    console.log(`[BUILD] ${platform} binary ready: ${downloadUrl} (build=${build})`);
    return res.json({ ok: true, platform, downloadUrl });
  }

  console.log(`[BUILD] ${platform} notify: status=${status}`);
  return res.json({ ok: true, platform, status: status || "unknown" });
});

// ── GET /v1/build/:platform/status ────────────────────────────────────────────
router.get("/build/:platform/status", (req, res) => {
  const { platform } = req.params;

  if (!PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: "Unknown platform", supported: PLATFORMS });
  }

  const url = binaryUrls[platform];
  return res.json({
    platform,
    status: url ? "completed" : "not_built",
    downloadUrl: url,
    message: url
      ? null
      : `Binary not built yet. Trigger via POST /v1/build/${platform}`,
  });
});

// ── GET /v1/build/status (all platforms) ─────────────────────────────────────
router.get("/build/status", (req, res) => {
  const summary = Object.fromEntries(
    PLATFORMS.map(p => [
      p,
      { status: binaryUrls[p] ? "completed" : "not_built", downloadUrl: binaryUrls[p] },
    ])
  );
  return res.json(summary);
});

module.exports = { router, binaryUrls };
