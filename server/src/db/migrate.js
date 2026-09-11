/**
 * bixtx.com — Database Migration CLI
 * Run: node src/db/migrate.js [--reset]
 *
 * Applies schema migrations in order, tracking applied versions in
 * a `schema_migrations` table. Safe to re-run (idempotent).
 */

"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const fs   = require("fs");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../../data/bixtx.db");
const RESET   = process.argv.includes("--reset");

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let Database;
try {
  Database = require("better-sqlite3");
} catch {
  console.error("[migrate] better-sqlite3 not installed. Run: npm install");
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── Migration tracking table ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT PRIMARY KEY,
    applied_at  INTEGER DEFAULT (unixepoch())
  );
`);

function applied(version) {
  return !!db.prepare("SELECT 1 FROM schema_migrations WHERE version=?").get(version);
}

function markApplied(version) {
  db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(version);
}

// ── Migrations ────────────────────────────────────────────────────────────
const MIGRATIONS = [
  {
    version: "001_initial_schema",
    up: () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS devices (
          id            TEXT PRIMARY KEY,
          name          TEXT NOT NULL,
          platform      TEXT,
          arch          TEXT,
          os_version    TEXT,
          ip            TEXT,
          enroll_key    TEXT,
          agent_version TEXT,
          features      TEXT,
          status        TEXT DEFAULT 'offline',
          first_seen    INTEGER,
          last_seen     INTEGER,
          last_ping     INTEGER
        );

        CREATE TABLE IF NOT EXISTS data_records (
          id         TEXT PRIMARY KEY,
          device_id  TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          module     TEXT NOT NULL,
          data       TEXT NOT NULL,
          hash       TEXT,
          ts         INTEGER,
          created_at INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS alerts (
          id         TEXT PRIMARY KEY,
          device_id  TEXT REFERENCES devices(id) ON DELETE SET NULL,
          level      TEXT NOT NULL,
          message    TEXT NOT NULL,
          ts         INTEGER DEFAULT (unixepoch()),
          read       INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS admin_users (
          id            TEXT PRIMARY KEY,
          email         TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role          TEXT DEFAULT 'operator',
          created_at    INTEGER DEFAULT (unixepoch()),
          last_login    INTEGER
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id         TEXT PRIMARY KEY,
          device_id  TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          admin_id   TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
          started_at INTEGER DEFAULT (unixepoch()),
          ended_at   INTEGER,
          status     TEXT DEFAULT 'active'
        );
      `);
    },
  },

  {
    version: "002_indexes",
    up: () => {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_data_device  ON data_records(device_id);
        CREATE INDEX IF NOT EXISTS idx_data_module  ON data_records(module);
        CREATE INDEX IF NOT EXISTS idx_data_ts      ON data_records(ts DESC);
        CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(level);
        CREATE INDEX IF NOT EXISTS idx_alerts_ts    ON alerts(ts DESC);
        CREATE INDEX IF NOT EXISTS idx_sessions_dev ON sessions(device_id);
      `);
    },
  },

  {
    version: "003_sync_uploads",
    up: () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sync_uploads (
          id         TEXT PRIMARY KEY,
          device_id  TEXT NOT NULL,
          received_at INTEGER DEFAULT (unixepoch()),
          size_bytes  INTEGER,
          modules     TEXT,
          icloud_sync INTEGER DEFAULT 0,
          cloud_sync  INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_sync_device ON sync_uploads(device_id);
        CREATE INDEX IF NOT EXISTS idx_sync_ts     ON sync_uploads(received_at DESC);
      `);
    },
  },

  {
    version: "004_ai_insights",
    up: () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS ai_insights (
          id         TEXT PRIMARY KEY,
          source     TEXT,
          query      TEXT,
          summary    TEXT,
          admin_id   TEXT,
          ts         INTEGER DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS mutation_log (
          id       TEXT PRIMARY KEY,
          event    TEXT NOT NULL,
          target   TEXT,
          result   TEXT,
          ts       TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_ai_insights_ts ON ai_insights(ts DESC);
        CREATE INDEX IF NOT EXISTS idx_mut_ts         ON mutation_log(ts DESC);
      `);
    },
  },
];

// ── Run ───────────────────────────────────────────────────────────────────
if (RESET) {
  console.log("[migrate] --reset: dropping all tables...");
  db.exec(`
    DROP TABLE IF EXISTS sync_uploads;
    DROP TABLE IF EXISTS ai_insights;
    DROP TABLE IF EXISTS mutation_log;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS alerts;
    DROP TABLE IF EXISTS data_records;
    DROP TABLE IF EXISTS devices;
    DROP TABLE IF EXISTS admin_users;
    DROP TABLE IF EXISTS schema_migrations;
  `);
  console.log("[migrate] All tables dropped. Re-running migrations...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     TEXT PRIMARY KEY,
      applied_at  INTEGER DEFAULT (unixepoch())
    );
  `);
}

let count = 0;
for (const m of MIGRATIONS) {
  if (!applied(m.version)) {
    console.log(`[migrate] Applying ${m.version}...`);
    const apply = db.transaction(() => {
      m.up();
      markApplied(m.version);
    });
    apply();
    count++;
  }
}

if (count === 0) {
  console.log("[migrate] Schema is up to date. No migrations needed.");
} else {
  console.log(`[migrate] Applied ${count} migration(s). DB ready: ${DB_PATH}`);
}

db.close();
