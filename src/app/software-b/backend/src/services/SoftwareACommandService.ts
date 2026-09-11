/**
 * Software A Command Service
 * Handles admin commands to Software A instances
 * Provides real-time command execution and response handling
 */

import { Logger } from '../utils/Logger';
import { db } from '../config/database';

export interface Command {
  id: string;
  adminId: string;
  deviceId: string;
  command: string;
  parameters?: Record<string, any>;
  timestamp: Date;
  status: 'pending' | 'sent' | 'executing' | 'completed' | 'failed';
  response?: string;
  executionTime?: number;
  error?: string;
}

export interface CommandResponse {
  commandId: string;
  success: boolean;
  response: string;
  executionTime: number;
  timestamp: Date;
}

export class SoftwareACommandService {
  private logger: Logger;
  private pendingCommands: Map<string, Command>;

  constructor() {
    this.logger = new Logger('SoftwareACommandService');
    this.pendingCommands = new Map();
  }

  /**
   * Send command to Software A
   */
  async sendCommand(
    adminId: string,
    deviceId: string,
    command: string,
    parameters?: Record<string, any>
  ): Promise<Command> {
    try {
      this.logger.info(`Sending command to device ${deviceId}: ${command}`);

      // Create command record
      const cmd: Command = {
        id: this.generateCommandId(),
        adminId,
        deviceId,
        command,
        parameters,
        timestamp: new Date(),
        status: 'pending',
      };

      // Store in pending commands
      this.pendingCommands.set(cmd.id, cmd);

      // Save to database
      await db.commands.create(cmd);

      // Send to Software A via WebSocket
      await this.dispatchCommand(cmd);

      // Update status
      cmd.status = 'sent';
      await db.commands.update(cmd.id, { status: 'sent' });

      this.logger.info(`Command ${cmd.id} sent successfully`);
      return cmd;
    } catch (error) {
      this.logger.error('Failed to send command:', error);
      throw error;
    }
  }

  /**
   * Dispatch command to Software A instance
   */
  private async dispatchCommand(command: Command): Promise<void> {
    try {
      // Get WebSocket connection for device
      const connection = await this.getDeviceConnection(command.deviceId);

      if (!connection) {
        throw new Error('Device not connected');
      }

      // Send command via WebSocket
      connection.send(JSON.stringify({
        type: 'command',
        commandId: command.id,
        command: command.command,
        parameters: command.parameters,
        timestamp: command.timestamp,
      }));

      this.logger.info(`Command dispatched to device ${command.deviceId}`);
    } catch (error) {
      this.logger.error('Failed to dispatch command:', error);
      throw error;
    }
  }

  /**
   * Handle command response from Software A
   */
  async handleCommandResponse(response: CommandResponse): Promise<void> {
    try {
      const command = this.pendingCommands.get(response.commandId);

      if (!command) {
        this.logger.warn(`Received response for unknown command: ${response.commandId}`);
        return;
      }

      // Update command status
      command.status = response.success ? 'completed' : 'failed';
      command.response = response.response;
      command.executionTime = response.executionTime;
      command.error = response.success ? undefined : response.response;

      // Update database
      await db.commands.update(command.id, {
        status: command.status,
        response: command.response,
        executionTime: command.executionTime,
        error: command.error,
      });

      // Remove from pending
      this.pendingCommands.delete(command.id);

      // Notify admin via WebSocket
      await this.notifyAdmin(command.adminId, command);

      this.logger.info(`Command ${command.id} ${command.status}`);
    } catch (error) {
      this.logger.error('Failed to handle command response:', error);
      throw error;
    }
  }

  /**
   * Get command history for device
   */
  async getCommandHistory(deviceId: string, limit = 100): Promise<Command[]> {
    try {
      return await db.commands.findMany({
        deviceId,
        limit,
        orderBy: { timestamp: 'desc' },
      });
    } catch (error) {
      this.logger.error('Failed to get command history:', error);
      throw error;
    }
  }

  /**
   * Get pending commands for device
   */
  async getPendingCommands(deviceId: string): Promise<Command[]> {
    try {
      return await db.commands.findMany({
        deviceId,
        status: { $in: ['pending', 'sent', 'executing'] },
      });
    } catch (error) {
      this.logger.error('Failed to get pending commands:', error);
      throw error;
    }
  }

  /**
   * Cancel command
   */
  async cancelCommand(commandId: string): Promise<void> {
    try {
      const command = this.pendingCommands.get(commandId);

      if (command && command.status !== 'completed') {
        command.status = 'failed';
        command.error = 'Cancelled by admin';

        await db.commands.update(commandId, {
          status: 'failed',
          error: 'Cancelled by admin',
        });

        this.pendingCommands.delete(commandId);
        this.logger.info(`Command ${commandId} cancelled`);
      }
    } catch (error) {
      this.logger.error('Failed to cancel command:', error);
      throw error;
    }
  }

  /**
   * Execute predefined command templates
   */
  async executeTemplate(
    adminId: string,
    deviceId: string,
    templateName: string,
    parameters?: Record<string, any>
  ): Promise<Command> {
    try {
      const template = this.getCommandTemplate(templateName);

      if (!template) {
        throw new Error(`Unknown template: ${templateName}`);
      }

      return await this.sendCommand(
        adminId,
        deviceId,
        template.command,
        { ...template.defaultParameters, ...parameters }
      );
    } catch (error) {
      this.logger.error('Failed to execute template:', error);
      throw error;
    }
  }

  /**
   * Get command templates
   */
  private getCommandTemplate(name: string): any {
    const templates: Record<string, any> = {
      screenshot: {
        command: '/screenshot',
        defaultParameters: { quality: 'high' },
      },
      startRecording: {
        command: '/record start',
        defaultParameters: { codec: 'h264', quality: 'high' },
      },
      stopRecording: {
        command: '/record stop',
        defaultParameters: {},
      },
      enableCamera: {
        command: '/camera on',
        defaultParameters: { resolution: '1280x720', fps: 30 },
      },
      disableCamera: {
        command: '/camera off',
        defaultParameters: {},
      },
      enableMicrophone: {
        command: '/mic on',
        defaultParameters: { sampleRate: 48000 },
      },
      disableMicrophone: {
        command: '/mic off',
        defaultParameters: {},
      },
      lockScreen: {
        command: '/screen lock',
        defaultParameters: {},
      },
      unlockScreen: {
        command: '/screen unlock',
        defaultParameters: {},
      },
      getStatus: {
        command: '/status',
        defaultParameters: {},
      },
      getSystemInfo: {
        command: '/sysinfo',
        defaultParameters: {},
      },
    };

    return templates[name];
  }

  /**
   * Get device connection (mock - would be WebSocket in production)
   */
  private async getDeviceConnection(deviceId: string): Promise<any> {
    // In production, this would return the actual WebSocket connection
    // For now, return a mock connection
    return {
      send: (data: string) => {
        this.logger.debug(`Sending to ${deviceId}:`, data);
      },
    };
  }

  /**
   * Notify admin of command completion (mock)
   */
  private async notifyAdmin(adminId: string, command: Command): Promise<void> {
    // In production, this would send via WebSocket to admin
    this.logger.info(`Notifying admin ${adminId} of command ${command.id} completion`);
  }

  /**
   * Generate unique command ID
   */
  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get command statistics
   */
  async getStatistics(deviceId?: string): Promise<any> {
    try {
      const query = deviceId ? { deviceId } : {};
      const commands = await db.commands.findMany(query);

      return {
        total: commands.length,
        completed: commands.filter(c => c.status === 'completed').length,
        failed: commands.filter(c => c.status === 'failed').length,
        pending: commands.filter(c => ['pending', 'sent', 'executing'].includes(c.status)).length,
        averageExecutionTime: this.calculateAverageExecutionTime(commands),
        successRate: this.calculateSuccessRate(commands),
        commandTypes: this.getCommandTypeDistribution(commands),
      };
    } catch (error) {
      this.logger.error('Failed to get statistics:', error);
      throw error;
    }
  }

  private calculateAverageExecutionTime(commands: Command[]): number {
    const completedCommands = commands.filter(c => c.executionTime);
    if (completedCommands.length === 0) return 0;

    const total = completedCommands.reduce((sum, c) => sum + (c.executionTime || 0), 0);
    return total / completedCommands.length;
  }

  private calculateSuccessRate(commands: Command[]): number {
    const finishedCommands = commands.filter(c => ['completed', 'failed'].includes(c.status));
    if (finishedCommands.length === 0) return 0;

    const successful = finishedCommands.filter(c => c.status === 'completed').length;
    return (successful / finishedCommands.length) * 100;
  }

  private getCommandTypeDistribution(commands: Command[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    commands.forEach(cmd => {
      const type = cmd.command.split(' ')[0]; // Get base command
      distribution[type] = (distribution[type] || 0) + 1;
    });

    return distribution;
  }
}
