let robot: any = null; try { robot = require("robotjs"); } catch (_) { console.warn("robotjs not available; remote control will be unavailable in this environment"); }
import { ConnectionManager } from '../core/ConnectionManager';
import { Logger } from '../utils/Logger';

export interface MouseEvent {
  type: 'move' | 'click' | 'scroll';
  x?: number;
  y?: number;
  button?: 'left' | 'right' | 'middle';
  scrollAmount?: number;
}

export interface KeyboardEvent {
  type: 'keypress' | 'keydown' | 'keyup';
  key: string;
  modifiers?: string[];
}

export class RemoteControlService {
  private logger: Logger;
  private connectionManager: ConnectionManager;
  private isActive: boolean = false;

  constructor(connectionManager: ConnectionManager) {
    this.logger = new Logger('RemoteControlService');
    this.connectionManager = connectionManager;

    this.setupEventHandlers();
  }

  async initialize(): Promise<void> {
    this.logger.info('RemoteControlService initialized');
  }

  private setupEventHandlers(): void {
    this.connectionManager.on('mouse_event', (data: MouseEvent) => {
      if (this.isActive) {
        this.handleMouseEvent(data);
      }
    });

    this.connectionManager.on('keyboard_event', (data: KeyboardEvent) => {
      if (this.isActive) {
        this.handleKeyboardEvent(data);
      }
    });
  }

  async start(params: any = {}): Promise<any> {
    if (this.isActive) {
      throw new Error('Remote control already active');
    }

    try {
      this.logger.info('Starting remote control...');
      this.isActive = true;

      // Set mouse delay (for smoother movement)
      robot.setMouseDelay(2);
      robot.setKeyboardDelay(10);

      this.logger.info('Remote control started');
      return { success: true, message: 'Remote control started' };
    } catch (error) {
      this.isActive = false;
      this.logger.error('Failed to start remote control:', error);
      throw error;
    }
  }

  async stop(): Promise<any> {
    if (!this.isActive) {
      return { success: true, message: 'Remote control not active' };
    }

    try {
      this.logger.info('Stopping remote control...');
      this.isActive = false;

      this.logger.info('Remote control stopped');
      return { success: true, message: 'Remote control stopped' };
    } catch (error) {
      this.logger.error('Failed to stop remote control:', error);
      throw error;
    }
  }

  private handleMouseEvent(event: MouseEvent): void {
    try {
      switch (event.type) {
        case 'move':
          if (event.x !== undefined && event.y !== undefined) {
            robot.moveMouse(event.x, event.y);
          }
          break;

        case 'click':
          if (event.button) {
            robot.mouseClick(event.button);
          }
          break;

        case 'scroll':
          if (event.scrollAmount !== undefined) {
            robot.scrollMouse(0, event.scrollAmount);
          }
          break;
      }
    } catch (error) {
      this.logger.error('Failed to handle mouse event:', error);
    }
  }

  private handleKeyboardEvent(event: KeyboardEvent): void {
    try {
      switch (event.type) {
        case 'keypress':
          if (event.modifiers && event.modifiers.length > 0) {
            robot.keyTap(event.key, event.modifiers);
          } else {
            robot.keyTap(event.key);
          }
          break;

        case 'keydown':
          robot.keyToggle(event.key, 'down', event.modifiers);
          break;

        case 'keyup':
          robot.keyToggle(event.key, 'up', event.modifiers);
          break;
      }
    } catch (error) {
      this.logger.error('Failed to handle keyboard event:', error);
    }
  }

  getScreenSize(): { width: number; height: number } {
    return robot.getScreenSize();
  }

  getMousePosition(): { x: number; y: number } {
    return robot.getMousePos();
  }
}
