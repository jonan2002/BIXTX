import fs from 'fs';
import path from 'path';
import os from 'os';
import { Logger } from '../utils/Logger';

export interface Config {
  deviceId: string | null;
  registrationCode: string | null;
  encryptionKey: string | null;
  serverUrl: string;
  registeredAt: string | null;
  settings: {
    autoStart: boolean;
    allowRemoteControl: boolean;
    allowFileAccess: boolean;
    allowCameraAccess: boolean;
    allowMicrophoneAccess: boolean;
    allowScreenCapture: boolean;
    notificationsEnabled: boolean;
    loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

export class ConfigManager {
  private logger: Logger;
  private configPath: string;
  private config: Config;

  constructor() {
    this.logger = new Logger('ConfigManager');
    this.configPath = this.getConfigPath();
    this.config = this.loadConfig();
  }

  private getConfigPath(): string {
    const appDataPath = process.env.APPDATA || 
      (process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support')
        : path.join(os.homedir(), '.config'));

    const bixtxDir = path.join(appDataPath, 'bixtx.comLink');

    // Create directory if it doesn't exist
    if (!fs.existsSync(bixtxDir)) {
      fs.mkdirSync(bixtxDir, { recursive: true });
    }

    return path.join(bixtxDir, 'config.json');
  }

  private loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const config = JSON.parse(data);
        this.logger.info('Config loaded successfully');
        return config;
      }
    } catch (error) {
      this.logger.error('Failed to load config:', error);
    }

    // Return default config
    return this.getDefaultConfig();
  }

  private getDefaultConfig(): Config {
    return {
      deviceId: null,
      registrationCode: null,
      encryptionKey: null,
      serverUrl: process.env.BIXTX_SERVER_URL || 'wss://api.bixtx.com/ws',
      registeredAt: null,
      settings: {
        autoStart: true,
        allowRemoteControl: true,
        allowFileAccess: true,
        allowCameraAccess: true,
        allowMicrophoneAccess: true,
        allowScreenCapture: true,
        notificationsEnabled: true,
        loggingLevel: 'info',
      },
    };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
      this.logger.info('Config saved successfully');
    } catch (error) {
      this.logger.error('Failed to save config:', error);
    }
  }

  getConfig(): Config {
    return { ...this.config };
  }

  updateConfig(updates: Partial<Config>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  getDeviceId(): string | null {
    return this.config.deviceId;
  }

  setDeviceId(deviceId: string): void {
    this.config.deviceId = deviceId;
    this.saveConfig();
  }

  getRegistrationCode(): string | null {
    return this.config.registrationCode;
  }

  setRegistrationCode(code: string): void {
    this.config.registrationCode = code;
    this.saveConfig();
  }

  getEncryptionKey(): string | null {
    return this.config.encryptionKey;
  }

  setEncryptionKey(key: string): void {
    this.config.encryptionKey = key;
    this.saveConfig();
  }

  getServerUrl(): string {
    return this.config.serverUrl;
  }

  setServerUrl(url: string): void {
    this.config.serverUrl = url;
    this.saveConfig();
  }

  getRegisteredAt(): string | null {
    return this.config.registeredAt;
  }

  setRegisteredAt(timestamp: string): void {
    this.config.registeredAt = timestamp;
    this.saveConfig();
  }

  isDeviceRegistered(): boolean {
    return !!(this.config.deviceId && this.config.registrationCode);
  }

  clearRegistration(): void {
    this.config.deviceId = null;
    this.config.registrationCode = null;
    this.config.registeredAt = null;
    this.saveConfig();
  }

  getSettings(): Config['settings'] {
    return { ...this.config.settings };
  }

  updateSettings(settings: Partial<Config['settings']>): void {
    this.config.settings = { ...this.config.settings, ...settings };
    this.saveConfig();
  }

  getSetting<K extends keyof Config['settings']>(key: K): Config['settings'][K] {
    return this.config.settings[key];
  }

  setSetting<K extends keyof Config['settings']>(key: K, value: Config['settings'][K]): void {
    this.config.settings[key] = value;
    this.saveConfig();
  }
}
