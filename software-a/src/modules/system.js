/**
 * System Metrics Module
 * Collects CPU, RAM, disk, processes, network interfaces.
 */

const si = require("systeminformation");
const config = require("../config");
const logger = require("../logger");

class SystemModule {
  constructor(beacon) {
    this.beacon = beacon;
    this.timer = null;
  }

  start() {
    this._collect(); // immediate first collection
    this.timer = setInterval(() => this._collect(), config.metricsInterval);
    logger.debug("SystemModule started");
  }

  stop() {
    clearInterval(this.timer);
  }

  async _collect() {
    try {
      const [cpu, mem, disk, processes, network, battery] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.processes(),
        si.networkInterfaces(),
        si.battery(),
      ]);

      const metrics = {
        cpu: {
          load: Math.round(cpu.currentLoad),
          cores: cpu.cpus.map(c => Math.round(c.load)),
        },
        ram: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          percent: Math.round((mem.used / mem.total) * 100),
        },
        disk: disk.map(d => ({
          mount: d.mount,
          size: d.size,
          used: d.used,
          percent: Math.round(d.use),
        })),
        processes: {
          all: processes.all,
          running: processes.running,
          list: processes.list.slice(0, 20).map(p => ({
            pid: p.pid,
            name: p.name,
            cpu: p.pcpu,
            mem: p.pmem,
          })),
        },
        network: network.map(n => ({
          iface: n.iface,
          ip4: n.ip4,
          mac: n.mac,
          type: n.type,
        })),
        battery: battery.hasBattery ? {
          level: battery.percent,
          charging: battery.isCharging,
        } : null,
      };

      this.beacon.queue_data("system", metrics);
    } catch (err) {
      logger.error("SystemModule collect error:", err.message);
    }
  }
}

module.exports = SystemModule;
