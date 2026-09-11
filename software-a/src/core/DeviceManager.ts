import { machineIdSync } from 'node-machine-id';
import si from 'systeminformation';
import os from 'os';
import { ConfigManager } from './ConfigManager';
import { Logger } from '../utils/Logger';
import { nanoid } from 'nanoid';

export interface DeviceInfo {
  deviceId: string;
  hardwareId: string;
  deviceName: string;
  platform: string;
  osVersion: string;
  architecture: string;
  hostname: string;
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    speed: number;
  };
  memory: {
    total: number;
    available: number;
  };
  disk: {
    total: number;
    available: number;
  };
  network: {
    interfaces: Array<{
      name: string;
      mac: string;
      ip4: string;
      ip6: string;
    }>;
  };
  graphics: Array<{
    model: string;
    vram: number;
  }>;
  registeredAt?: string;
  lastSeen?: string;
}

export class DeviceManager {
  private logger: Logger;
  private deviceInfo: DeviceInfo | null = null;
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.logger = new Logger('DeviceManager');
    this.configManager = configManager;
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing DeviceManager...');
      await this.collectDeviceInfo();
      this.logger.info('DeviceManager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize DeviceManager:', error);
      throw error;
    }
  }

  async collectDeviceInfo(): Promise<DeviceInfo> {
    try {
      const hardwareId = machineIdSync();
      const [cpuInfo, memInfo, diskInfo, netInfo, graphicsInfo, osInfo] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.fsSize(),
        si.networkInterfaces(),
        si.graphics(),
        si.osInfo(),
      ]);

      // Calculate total disk space
      const totalDisk = diskInfo.reduce((acc, disk) => acc + disk.size, 0);
      const availableDisk = diskInfo.reduce((acc, disk) => acc + disk.available, 0);

      // Get existing device ID or generate new one
      let deviceId = this.configManager.getDeviceId();
      if (!deviceId) {
        deviceId = `LWX-${nanoid(12).toUpperCase()}`;
      }

      this.deviceInfo = {
        deviceId,
        hardwareId,
        deviceName: os.hostname(),
        platform: process.platform,
        osVersion: `${osInfo.distro} ${osInfo.release}`,
        architecture: os.arch(),
        hostname: os.hostname(),
        cpu: {
          manufacturer: cpuInfo.manufacturer,
          brand: cpuInfo.brand,
          cores: cpuInfo.cores,
          speed: cpuInfo.speed,
        },
        memory: {
          total: memInfo.total,
          available: memInfo.available,
        },
        disk: {
          total: totalDisk,
          available: availableDisk,
        },
        network: {
          interfaces: netInfo
            .filter((iface) => !iface.internal)
            .map((iface) => ({
              name: iface.iface,
              mac: iface.mac,
              ip4: iface.ip4 || '',
              ip6: iface.ip6 || '',
            })),
        },
        graphics: graphicsInfo.controllers.map((gpu) => ({
          model: gpu.model,
          vram: gpu.vram || 0,
        })),
        lastSeen: new Date().toISOString(),
      };

      return this.deviceInfo;
    } catch (error) {
      this.logger.error('Failed to collect device info:', error);
      throw error;
    }
  }

  async updateDeviceInfo(): Promise<DeviceInfo> {
    return await this.collectDeviceInfo();
  }

  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  getDeviceId(): string | null {
    return this.deviceInfo?.deviceId || this.configManager.getDeviceId();
  }

  getHardwareId(): string | null {
    return this.deviceInfo?.hardwareId || null;
  }

  async register(registrationCode: string): Promise<void> {
    try {
      if (!this.deviceInfo) {
        await this.collectDeviceInfo();
      }

      this.logger.info('Registering device with code:', registrationCode);

      // Save registration
      this.configManager.setDeviceId(this.deviceInfo!.deviceId);
      this.configManager.setRegistrationCode(registrationCode);
      this.configManager.setRegisteredAt(new Date().toISOString());

      this.logger.info('Device registered successfully');
    } catch (error) {
      this.logger.error('Failed to register device:', error);
      throw error;
    }
  }

  async unregister(): Promise<void> {
    try {
      this.logger.info('Unregistering device...');
      this.configManager.clearRegistration();
      this.deviceInfo = null;
      this.logger.info('Device unregistered successfully');
    } catch (error) {
      this.logger.error('Failed to unregister device:', error);
      throw error;
    }
  }

  async getSystemMetrics(): Promise<any> {
    try {
      const [cpuLoad, memInfo, diskInfo, networkStats, processes] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats(),
        si.processes(),
      ]);

      return {
        cpu: {
          usage: cpuLoad.currentLoad,
          cores: cpuLoad.cpus.map((cpu) => cpu.load),
        },
        memory: {
          total: memInfo.total,
          used: memInfo.used,
          available: memInfo.available,
          usagePercent: (memInfo.used / memInfo.total) * 100,
        },
        disk: diskInfo.map((disk) => ({
          device: disk.fs,
          mount: disk.mount,
          total: disk.size,
          used: disk.used,
          available: disk.available,
          usagePercent: disk.use,
        })),
        network: networkStats.map((stat) => ({
          interface: stat.iface,
          rx: stat.rx_sec,
          tx: stat.tx_sec,
        })),
        processes: {
          total: processes.all,
          running: processes.running,
          sleeping: processes.sleeping,
          blocked: processes.blocked,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get system metrics:', error);
      throw error;
    }
  }
}
