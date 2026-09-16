/**
 * Server-side AES-256-GCM crypto helper — mirrors software-a/src/c2/crypto.js.
 * Shared secret = enrollKey + deviceId (SHA-256 stretched to 256-bit key).
 */

"use strict";

const crypto = require("crypto");

class AgentCrypto {
  constructor(deviceId, enrollKey) {
    this.key  = crypto.createHash("sha256").update(enrollKey + deviceId).digest();
    this.algo = "aes-256-gcm";
  }

  decrypt(ciphertext) {
    const buf = Buffer.from(ciphertext, "base64");
    const iv  = buf.subarray(0, 16);
    const tag = buf.subarray(16, 32);
    const enc = buf.subarray(32);
    const d   = crypto.createDecipheriv(this.algo, this.key, iv, { authTagLength: 16 });
    d.setAuthTag(tag);
    return JSON.parse(Buffer.concat([d.update(enc), d.final()]).toString("utf8"));
  }

  encrypt(data) {
    const iv  = crypto.randomBytes(16);
    const c   = crypto.createCipheriv(this.algo, this.key, iv, { authTagLength: 16 });
    const enc = Buffer.concat([c.update(JSON.stringify(data), "utf8"), c.final()]);
    const tag = c.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString("base64");
  }

  static verifyToken(deviceId, enrollKey, token) {
    const expected = crypto.createHmac("sha256", enrollKey).update(deviceId).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
    } catch {
      return false;
    }
  }
}

module.exports = AgentCrypto;
