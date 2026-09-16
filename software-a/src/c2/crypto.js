/**
 * bixtx.com Link Agent — AES-256-GCM Encryption Module
 * All C2 communications are end-to-end encrypted.
 */

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

class AgentCrypto {
  constructor(sharedSecret) {
    // Derive a 256-bit key from the shared secret using HKDF-SHA256
    this.key = crypto.createHash("sha256").update(sharedSecret).digest();
  }

  encrypt(plaintext) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_LENGTH });
    const data = typeof plaintext === "object" ? JSON.stringify(plaintext) : String(plaintext);
    const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
  }

  decrypt(ciphertext) {
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    try {
      return JSON.parse(decrypted.toString("utf8"));
    } catch {
      return decrypted.toString("utf8");
    }
  }

  static generateToken(deviceId, enrollKey) {
    return crypto
      .createHmac("sha256", enrollKey)
      .update(deviceId)
      .digest("hex");
  }

  static hashData(data) {
    return crypto.createHash("sha3-512").update(JSON.stringify(data)).digest("hex");
  }
}

module.exports = AgentCrypto;
