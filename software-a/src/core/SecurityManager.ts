import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { ConfigManager } from './ConfigManager';
import { Logger } from '../utils/Logger';

export class SecurityManager {
  private logger: Logger;
  private configManager: ConfigManager;
  private encryptionKey: string = '';
  private algorithm: string = 'aes-256-gcm';

  constructor(configManager: ConfigManager) {
    this.logger = new Logger('SecurityManager');
    this.configManager = configManager;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing SecurityManager...');

      // Get or generate encryption key
      let key = this.configManager.getEncryptionKey();
      if (!key) {
        key = this.generateEncryptionKey();
        this.configManager.setEncryptionKey(key);
      }
      this.encryptionKey = key;

      this.logger.info('SecurityManager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SecurityManager:', error);
      throw error;
    }
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  encrypt(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonString, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw error;
    }
  }

  decrypt(encryptedData: string): any {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(jsonString);
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw error;
    }
  }

  encryptBuffer(buffer: Buffer): Buffer {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        Buffer.from(this.encryptionKey, 'hex'),
        iv
      );

      const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
      const authTag = (cipher as any).getAuthTag();

      // Return IV + AuthTag + Encrypted data
      return Buffer.concat([iv, authTag, encrypted]);
    } catch (error) {
      this.logger.error('Buffer encryption failed:', error);
      throw error;
    }
  }

  decryptBuffer(encryptedBuffer: Buffer): Buffer {
    try {
      const iv = encryptedBuffer.slice(0, 16);
      const authTag = encryptedBuffer.slice(16, 32);
      const encrypted = encryptedBuffer.slice(32);

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        Buffer.from(this.encryptionKey, 'hex'),
        iv
      );

      (decipher as any).setAuthTag(authTag);

      return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch (error) {
      this.logger.error('Buffer decryption failed:', error);
      throw error;
    }
  }

  generateRegistrationCode(): string {
    // Generate a 6-character alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  validateToken(token: string): boolean {
    // Implement token validation logic
    // For now, just check if it's a valid hex string
    return /^[a-f0-9]{64}$/i.test(token);
  }
}
