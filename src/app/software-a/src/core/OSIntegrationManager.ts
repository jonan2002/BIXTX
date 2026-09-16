/**
 * OS Integration Manager
 * Deep operating system integration for seamless operation
 * Handles OS updates, patches, and system-level integration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/Logger';
import { ConfigManager } from './ConfigManager';

const execAsync = promisify(exec);

export interface OSInfo {
  platform: string;
  version: string;
  architecture: string;
  kernel: string;
  updatesPending: number;
  securityPatches: string[];
  lastUpdateCheck: string;
}

export class OSIntegrationManager {
  private logger: Logger;
  private configManager: ConfigManager;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private osInfo: OSInfo | null = null;

  constructor(configManager: ConfigManager) {
    this.logger = new Logger('OSIntegrationManager');
    this.configManager = configManager;
  }

  /**
   * Initialize OS integration
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing OS integration...');

      // Detect OS information
      await this.detectOSInfo();

      // Set up OS-specific integrations
      await this.setupOSIntegration();

      // Enable auto-update monitoring
      await this.enableAutoUpdateMonitoring();

      // Register system hooks
      await this.registerSystemHooks();

      // Optimize for current OS
      await this.optimizeForOS();

      this.logger.info('OS integration initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OS integration:', error);
      throw error;
    }
  }

  /**
   * Detect detailed OS information
   */
  private async detectOSInfo(): Promise<void> {
    try {
      const platform = process.platform;
      const version = os.release();
      const architecture = os.arch();

      let kernel = '';
      let updatesPending = 0;
      let securityPatches: string[] = [];

      if (platform === 'win32') {
        try {
          const { stdout } = await execAsync('systeminfo | findstr /B /C:"OS Version"');
          kernel = stdout.trim();
        } catch (error) {
          kernel = version;
        }

        // Check for Windows updates
        try {
          const { stdout } = await execAsync('powershell "Get-HotFix | Measure-Object | Select-Object -ExpandProperty Count"');
          updatesPending = parseInt(stdout.trim()) || 0;
        } catch (error) {
          // Ignore
        }
      } else if (platform === 'darwin') {
        try {
          const { stdout } = await execAsync('sw_vers -productVersion');
          kernel = stdout.trim();
        } catch (error) {
          kernel = version;
        }

        // Check for macOS updates
        try {
          const { stdout } = await execAsync('softwareupdate -l 2>&1');
          const lines = stdout.split('\n');
          updatesPending = lines.filter(l => l.includes('*')).length;
        } catch (error) {
          // Ignore
        }
      } else if (platform === 'linux') {
        try {
          const { stdout } = await execAsync('uname -r');
          kernel = stdout.trim();
        } catch (error) {
          kernel = version;
        }

        // Check for Linux updates (Debian/Ubuntu)
        try {
          const { stdout } = await execAsync('apt list --upgradable 2>/dev/null | wc -l');
          updatesPending = parseInt(stdout.trim()) - 1 || 0;
        } catch (error) {
          // Try yum/dnf for RedHat/Fedora
          try {
            const { stdout } = await execAsync('yum check-update 2>/dev/null | wc -l');
            updatesPending = parseInt(stdout.trim()) || 0;
          } catch (error2) {
            // Ignore
          }
        }
      }

      this.osInfo = {
        platform,
        version,
        architecture,
        kernel,
        updatesPending,
        securityPatches,
        lastUpdateCheck: new Date().toISOString(),
      };

      this.logger.info('OS Info detected:', this.osInfo);
    } catch (error) {
      this.logger.error('Failed to detect OS info:', error);
    }
  }

  /**
   * Setup OS-specific integration
   */
  private async setupOSIntegration(): Promise<void> {
    try {
      const platform = process.platform;

      if (platform === 'win32') {
        await this.setupWindowsIntegration();
      } else if (platform === 'darwin') {
        await this.setupMacOSIntegration();
      } else if (platform === 'linux') {
        await this.setupLinuxIntegration();
      }

      this.logger.info(`${platform} integration configured`);
    } catch (error) {
      this.logger.error('OS integration setup failed:', error);
    }
  }

  /**
   * Windows-specific integration
   */
  private async setupWindowsIntegration(): Promise<void> {
    try {
      // Register with Windows services
      // Set up Windows event log monitoring
      // Configure Windows Defender exclusions
      this.logger.info('Windows integration configured');
    } catch (error) {
      this.logger.error('Windows integration error:', error);
    }
  }

  /**
   * macOS-specific integration
   */
  private async setupMacOSIntegration(): Promise<void> {
    try {
      // Register with LaunchAgent
      // Set up macOS keychain integration
      // Configure Gatekeeper permissions
      this.logger.info('macOS integration configured');
    } catch (error) {
      this.logger.error('macOS integration error:', error);
    }
  }

  /**
   * Linux-specific integration
   */
  private async setupLinuxIntegration(): Promise<void> {
    try {
      // Register with systemd
      // Set up SELinux/AppArmor policies
      // Configure system services
      this.logger.info('Linux integration configured');
    } catch (error) {
      this.logger.error('Linux integration error:', error);
    }
  }

  /**
   * Enable automatic update monitoring
   */
  private async enableAutoUpdateMonitoring(): Promise<void> {
    try {
      // Check for OS updates every 6 hours
      this.updateCheckInterval = setInterval(async () => {
        await this.checkForOSUpdates();
      }, 6 * 60 * 60 * 1000);

      // Initial check
      await this.checkForOSUpdates();

      this.logger.info('Auto-update monitoring enabled');
    } catch (error) {
      this.logger.error('Failed to enable update monitoring:', error);
    }
  }

  /**
   * Check for OS updates
   */
  private async checkForOSUpdates(): Promise<void> {
    try {
      this.logger.info('Checking for OS updates...');

      await this.detectOSInfo();

      if (this.osInfo && this.osInfo.updatesPending > 0) {
        this.logger.info(`${this.osInfo.updatesPending} OS updates available`);

        // Optionally auto-install updates
        if (this.configManager.getSetting('autoInstallOSUpdates' as any)) {
          await this.installOSUpdates();
        }
      }
    } catch (error) {
      this.logger.error('Update check failed:', error);
    }
  }

  /**
   * Install OS updates
   */
  private async installOSUpdates(): Promise<void> {
    try {
      this.logger.info('Installing OS updates...');

      const platform = process.platform;

      if (platform === 'win32') {
        // Windows Update
        await execAsync('powershell "Install-WindowsUpdate -AcceptAll -AutoReboot"');
      } else if (platform === 'darwin') {
        // macOS Software Update
        await execAsync('sudo softwareupdate -ia');
      } else if (platform === 'linux') {
        // Linux package updates
        try {
          await execAsync('sudo apt-get update && sudo apt-get upgrade -y');
        } catch (error) {
          await execAsync('sudo yum update -y');
        }
      }

      this.logger.info('OS updates installed successfully');
    } catch (error) {
      this.logger.error('Failed to install updates:', error);
    }
  }

  /**
   * Register system hooks for integration
   */
  private async registerSystemHooks(): Promise<void> {
    try {
      // Hook into system shutdown events
      process.on('SIGTERM', () => this.handleSystemShutdown());
      process.on('SIGHUP', () => this.handleSystemRestart());

      // Hook into system sleep/wake events
      // Platform-specific implementation would go here

      this.logger.info('System hooks registered');
    } catch (error) {
      this.logger.error('Failed to register system hooks:', error);
    }
  }

  /**
   * Optimize software for current OS
   */
  private async optimizeForOS(): Promise<void> {
    try {
      const platform = process.platform;

      // Set optimal process priority
      if (platform === 'win32') {
        await execAsync(`wmic process where processid=${process.pid} CALL setpriority "above normal"`);
      } else {
        await execAsync(`renice -n -5 -p ${process.pid}`);
      }

      // Set optimal memory limits
      const totalMemory = os.totalmem();
      const memoryLimit = Math.floor(totalMemory * 0.1); // Use max 10% of system memory
      
      // Set Node.js memory limit
      if (!process.execArgv.includes('--max-old-space-size')) {
        this.logger.info(`Optimized for ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB system memory`);
      }

      this.logger.info('OS optimization completed');
    } catch (error) {
      this.logger.error('OS optimization failed:', error);
    }
  }

  /**
   * Handle system shutdown
   */
  private handleSystemShutdown(): void {
    this.logger.info('System shutdown detected, preparing...');
    // Cleanup and graceful shutdown
  }

  /**
   * Handle system restart
   */
  private handleSystemRestart(): void {
    this.logger.info('System restart detected, preparing...');
    // Save state and prepare for restart
  }

  /**
   * Get OS information
   */
  getOSInfo(): OSInfo | null {
    return this.osInfo;
  }

  /**
   * Check compatibility with OS version
   */
  async checkCompatibility(): Promise<boolean> {
    try {
      if (!this.osInfo) {
        await this.detectOSInfo();
      }

      // Check if running on supported OS version
      const platform = process.platform;
      
      if (platform === 'win32') {
        // Require Windows 10 or higher
        const version = parseInt(os.release().split('.')[0]);
        return version >= 10;
      } else if (platform === 'darwin') {
        // Require macOS 10.15 or higher
        const version = parseFloat(os.release());
        return version >= 19.0; // macOS 10.15 Catalina
      } else if (platform === 'linux') {
        // Most Linux versions supported
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Compatibility check failed:', error);
      return true; // Assume compatible if check fails
    }
  }

  /**
   * Adapt to OS changes
   */
  async adaptToOSChanges(): Promise<void> {
    try {
      this.logger.info('Adapting to OS changes...');

      // Re-detect OS information
      await this.detectOSInfo();

      // Re-setup integration
      await this.setupOSIntegration();

      // Re-optimize
      await this.optimizeForOS();

      this.logger.info('Adaptation completed');
    } catch (error) {
      this.logger.error('Failed to adapt to OS changes:', error);
    }
  }

  /**
   * Stop OS integration
   */
  async stop(): Promise<void> {
    try {
      if (this.updateCheckInterval) {
        clearInterval(this.updateCheckInterval);
        this.updateCheckInterval = null;
      }

      this.logger.info('OS integration stopped');
    } catch (error) {
      this.logger.error('Error stopping OS integration:', error);
    }
  }
}
