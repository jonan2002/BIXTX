/**
 * Data Store — SQLite (production) or in-memory (dev/test)
 * Stores: devices, sessions, alerts, collected data, admin users.
 */

const path = require("path");
const { v4: uuidv4 } = require("uuid");

let db;

function init() {
  try {
    const Database = require("better-sqlite3");
    const dbPath = process.env.DB_PATH || path.join(__dirname, "../../../data/bixtx.db");
    const fs = require("fs");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate();
    console.log(`[DB] SQLite ready: ${dbPath}`);
  } catch {
    // In-memory fallback
    db = createMemoryStore();
    console.log("[DB] Using in-memory store");
  }
}

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      platform TEXT,
      arch TEXT,
      os_version TEXT,
      ip TEXT,
      enroll_key TEXT,
      agent_version TEXT,
      features TEXT,
      status TEXT DEFAULT 'offline',
      first_seen INTEGER,
      last_seen INTEGER,
      last_ping INTEGER
    );

    CREATE TABLE IF NOT EXISTS data_records (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      module TEXT NOT NULL,
      data TEXT NOT NULL,
      hash TEXT,
      ts INTEGER,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      device_id TEXT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      ts INTEGER DEFAULT (unixepoch()),
      read INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'operator',
      created_at INTEGER DEFAULT (unixepoch()),
      last_login INTEGER
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      admin_id TEXT,
      started_at INTEGER DEFAULT (unixepoch()),
      ended_at INTEGER,
      status TEXT DEFAULT 'active'
    );
  `);
}

// ── Device operations ────────────────────────────────────────────────────
const devices = {
  upsert(d) {
    if (!db._isMemory) {
      db.prepare(`
        INSERT INTO devices (id, name, platform, arch, os_version, ip, enroll_key, agent_version, features, status, first_seen, last_seen, last_ping)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'online', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name, platform=excluded.platform, ip=excluded.ip,
          agent_version=excluded.agent_version, status='online',
          last_seen=excluded.last_seen, last_ping=excluded.last_ping
      `).run(d.id, d.name, d.platform, d.arch, d.osVersion, d.ip, d.enrollKey, d.agentVersion,
             JSON.stringify(d.features), Date.now(), Date.now(), Date.now());
    } else {
      db._devices.set(d.id, { ...db._devices.get(d.id), ...d, status: "online", lastSeen: Date.now() });
    }
  },

  setOffline(id) {
    if (!db._isMemory) {
      db.prepare("UPDATE devices SET status='offline', last_seen=? WHERE id=?").run(Date.now(), id);
    } else {
      const d = db._devices.get(id);
      if (d) db._devices.set(id, { ...d, status: "offline" });
    }
  },

  getAll() {
    if (!db._isMemory) {
      return db.prepare("SELECT * FROM devices ORDER BY last_seen DESC").all();
    }
    return Array.from(db._devices.values());
  },

  getById(id) {
    if (!db._isMemory) return db.prepare("SELECT * FROM devices WHERE id=?").get(id);
    return db._devices.get(id) || null;
  },

  ping(id) {
    if (!db._isMemory) {
      db.prepare("UPDATE devices SET last_ping=?, status='online' WHERE id=?").run(Date.now(), id);
    }
  },
};

// ── Data operations ────────────────────────────────────────────────────────
const data = {
  insert(deviceId, module, payload, hash) {
    const id = uuidv4();
    if (!db._isMemory) {
      db.prepare(
        "INSERT INTO data_records (id, device_id, module, data, hash, ts) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(id, deviceId, module, JSON.stringify(payload), hash, Date.now());
    } else {
      db._data.push({ id, deviceId, module, data: payload, hash, ts: Date.now() });
      if (db._data.length > 10000) db._data.shift();
    }
    return id;
  },

  getByDevice(deviceId, module = null, limit = 100) {
    if (!db._isMemory) {
      if (module) {
        return db.prepare("SELECT * FROM data_records WHERE device_id=? AND module=? ORDER BY ts DESC LIMIT ?")
          .all(deviceId, module, limit);
      }
      return db.prepare("SELECT * FROM data_records WHERE device_id=? ORDER BY ts DESC LIMIT ?")
        .all(deviceId, limit);
    }
    return db._data.filter(r => r.deviceId === deviceId && (!module || r.module === module))
      .slice(-limit).reverse();
  },
};

// ── Alert operations ───────────────────────────────────────────────────────
const alerts = {
  create(deviceId, level, message) {
    const id = uuidv4();
    if (!db._isMemory) {
      db.prepare("INSERT INTO alerts (id, device_id, level, message) VALUES (?, ?, ?, ?)")
        .run(id, deviceId, level, message);
    } else {
      db._alerts.unshift({ id, deviceId, level, message, ts: Date.now(), read: false });
    }
    return id;
  },

  getAll(limit = 50) {
    if (!db._isMemory) {
      return db.prepare("SELECT * FROM alerts ORDER BY ts DESC LIMIT ?").all(limit);
    }
    return db._alerts.slice(0, limit);
  },
};

// ── In-memory store fallback ─────────────────────────────────────────────
function createMemoryStore() {
  return {
    _isMemory: true,
    _devices: new Map(),
    _data: [],
    _alerts: [],
    _users: new Map([
      ["admin", { id: "admin", email: "systems.manager@bixtx.com", passwordHash: "$2b$10$9PqzAgddeLaXhMP/G2.VV.KHcwoKaTUpfRM6F6gckzLvjksCzDvZK", role: "admin" }]
    ]),
  };
}

module.exports = { 
  init, devices, data, alerts,
  users: {
    getByEmail: (email) => {
      if (db._isMemory) {
        return Array.from(db._users.values()).find(u => u.email === email);
      }
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    }
  }
};
