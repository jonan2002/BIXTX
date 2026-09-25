/**
 * Logger — silent in production stealth mode; rotates log files daily.
 * Uses winston-daily-rotate-file when the package is available; falls back
 * to a lightweight console shim so the agent still works without devDeps.
 */

"use strict";

const path = require("path");
const config = require("./config");

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[config.logLevel] ?? 1;
const silent = config.silentMode && config.nodeEnv === "production";

// ── Attempt to load winston with daily rotation ────────────────────────────
let winstonLogger = null;
try {
  const winston = require("winston");
  require("winston-daily-rotate-file");

  const LOG_DIR = process.env.LOG_DIR || path.join(require("os").tmpdir(), "bixtx");
  require("fs").mkdirSync(LOG_DIR, { recursive: true });

  const rotateTransport = new winston.transports.DailyRotateFile({
    filename:      path.join(LOG_DIR, "agent-%DATE%.log"),
    datePattern:   "YYYY-MM-DD",
    maxSize:       "20m",   // rotate at 20 MB
    maxFiles:      "7d",    // keep 7 days
    zippedArchive: true,
    level:         config.logLevel || "warn",
    silent,
  });

  winstonLogger = winston.createLogger({
    level:  config.logLevel || "warn",
    silent,
    format: winston.format.combine(
      winston.format.timestamp({ format: "HH:mm:ss.SSS" }),
      winston.format.printf(({ timestamp, level, message }) =>
        `[${timestamp}] [BTX/${level.toUpperCase()}] ${message}`)
    ),
    transports: [rotateTransport],
    exitOnError: false,
  });

  // In dev mode also print to console
  if (config.nodeEnv !== "production") {
    winstonLogger.add(new winston.transports.Console());
  }
} catch {
  // winston or rotate plugin not installed — use console shim
}

// ── Console shim (fallback / dev) ─────────────────────────────────────────
const fmt = (level, ...args) => {
  if (silent || LEVELS[level] > currentLevel) return;
  const ts = new Date().toISOString().slice(11, 23);
  const prefix = `[${ts}] [BTX/${level.toUpperCase()}]`;
  const output  = args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ");
  if (winstonLogger) {
    winstonLogger[level](output);
  } else {
    const fn = level === "error" ? "error" : level === "warn" ? "warn" : "log";
    console[fn](prefix, ...args);
  }
};

module.exports = {
  error: (...a) => fmt("error", ...a),
  warn:  (...a) => fmt("warn",  ...a),
  info:  (...a) => fmt("info",  ...a),
  debug: (...a) => fmt("debug", ...a),
};
