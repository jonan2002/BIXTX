import WebSocket from 'ws';
import { ConfigManager } from './ConfigManager';
import { SecurityManager } from './SecurityManager';
import { Logger } from '../utils/Logger';
import { EventEmitter } from 'events';

export interface MessagePayload {
  type: string;
  data: any;
  timestamp: string;
  messageId: string;
}

export class ConnectionManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private logger: Logger;
  private configManager: ConfigManager;
  private securityManager: SecurityManager;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 5000;
  private isConnecting: boolean = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isManualDisconnect: boolean = false;

  constructor(configManager: ConfigManager, securityManager: SecurityManager) {
    super();
    this.logger = new Logger('ConnectionManager');
    this.configManager = configManager;
    this.securityManager = securityManager;
  }

  async initialize(): Promise<void> {
    this.logger.info('ConnectionManager initialized');
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      this.logger.warn('Already connected or connecting');
      return;
    }

    try {
      this.isConnecting = true;
      this.isManualDisconnect = false;

      const serverUrl = this.configManager.getServerUrl();
      const deviceId = this.configManager.getDeviceId();
      const registrationCode = this.configManager.getRegistrationCode();

      if (!deviceId || !registrationCode) {
        throw new Error('Device not registered');
      }

      this.logger.info(`Connecting to server: ${serverUrl}`);

      // Create WebSocket connection
      this.ws = new WebSocket(serverUrl, {
        headers: {
          'X-Device-Id': deviceId,
          'X-Registration-Code': registrationCode,
        },
      });

      this.setupWebSocketHandlers();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws!.once('open', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.ws!.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.startHeartbeat();

      this.logger.info('Connected to server successfully');
      this.emit('connected');
    } catch (error) {
      this.isConnecting = false;
      this.logger.error('Failed to connect:', error);
      this.handleReconnect();
      throw error;
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.on('open', () => {
      this.logger.info('WebSocket connection opened');
      this.sendAuthentication();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      this.handleMessage(data);
    });

    this.ws.on('close', (code, reason) => {
      this.logger.warn(`WebSocket closed: ${code} - ${reason}`);
      this.stopHeartbeat();
      this.emit('disconnected');

      if (!this.isManualDisconnect) {
        this.handleReconnect();
      }
    });

    this.ws.on('error', (error) => {
      this.logger.error('WebSocket error:', error);
      this.emit('error', error);
    });

    this.ws.on('pong', () => {
      // Keep-alive pong received
    });
  }

  private async sendAuthentication(): Promise<void> {
    try {
      const deviceId = this.configManager.getDeviceId();
      const registrationCode = this.configManager.getRegistrationCode();

      const authMessage = {
        type: 'auth',
        data: {
          deviceId,
          registrationCode,
          timestamp: new Date().toISOString(),
        },
      };

      await this.sendMessage(authMessage);
      this.logger.info('Authentication sent');
    } catch (error) {
      this.logger.error('Failed to send authentication:', error);
    }
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      this.logger.debug('Received message:', message.type);

      // Decrypt message if encrypted
      let decryptedData = message.data;
      if (message.encrypted) {
        decryptedData = this.securityManager.decrypt(message.data);
      }

      this.emit('message', {
        type: message.type,
        data: decryptedData,
        timestamp: message.timestamp,
        messageId: message.messageId,
      });

      // Handle specific message types
      this.handleSpecificMessage(message.type, decryptedData);
    } catch (error) {
      this.logger.error('Failed to handle message:', error);
    }
  }

  private handleSpecificMessage(type: string, data: any): void {
    switch (type) {
      case 'auth_success':
        this.logger.info('Authentication successful');
        this.emit('authenticated');
        break;

      case 'auth_failed':
        this.logger.error('Authentication failed:', data.reason);
        this.disconnect();
        break;

      case 'ping':
        this.sendMessage({ type: 'pong', data: { timestamp: new Date().toISOString() } });
        break;

      case 'command':
        this.emit('command', data);
        break;

      case 'remote_control_start':
        this.emit('remote_control_start', data);
        break;

      case 'remote_control_stop':
        this.emit('remote_control_stop', data);
        break;

      case 'webrtc_offer':
        this.emit('webrtc_offer', data);
        break;

      case 'webrtc_answer':
        this.emit('webrtc_answer', data);
        break;

      case 'webrtc_ice_candidate':
        this.emit('webrtc_ice_candidate', data);
        break;

      default:
        this.logger.warn('Unknown message type:', type);
    }
  }

  async sendMessage(message: any, encrypt: boolean = false): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    try {
      let payload = {
        ...message,
        timestamp: new Date().toISOString(),
        messageId: this.generateMessageId(),
      };

      // Encrypt if requested
      if (encrypt) {
        payload.data = this.securityManager.encrypt(payload.data);
        payload.encrypted = true;
      }

      this.ws.send(JSON.stringify(payload));
      this.logger.debug('Message sent:', message.type);
    } catch (error) {
      this.logger.error('Failed to send message:', error);
      throw error;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        this.logger.error('Reconnection failed:', error);
      });
    }, delay);
  }

  async reconnect(): Promise<void> {
    this.reconnectAttempts = 0;
    await this.disconnect();
    await this.connect();
  }

  async disconnect(): Promise<void> {
    this.isManualDisconnect = true;
    this.stopHeartbeat();

    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        this.logger.error('Error closing WebSocket:', error);
      }
      this.ws = null;
    }

    this.logger.info('Disconnected from server');
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
