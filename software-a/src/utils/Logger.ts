import fs from 'fs';
import path from 'path';
import os from 'os';
import { AsyncLocalStorage } from 'async_hooks';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerOptions {
  context: string;
  minLevel?: LogLevel;
  logDir?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  bufferLimit?: number;
  flushIntervalMs?: number;
  syncOnError?: boolean;
  maxFileBytes?: number;
  maxBackupFiles?: number;
}

interface LogEntry {
  _ts: string;
  _ns: string;
  _seq: number;
  _pid: number;
  _tid: number;
  level: LogLevel;
  ctx: string;
  msg: string;
  data?: unknown;
}

export class Logger {
  private static readonly PRIORITY: Record<LogLevel, number> = {
    debug: 0, info: 1, warn: 2, error: 3, fatal: 4,
  };

  private static seqCounter = 0;
  private static readonly asyncStore = new AsyncLocalStorage<Record<string, unknown>>();

  private readonly opts: Required<LoggerOptions>;
  private readonly active: LogEntry[] = [];
  private flushBuf: LogEntry[] = [];
  private flushState: 'idle' | 'flushing' | 'pending' = 'idle';
  private stream: fs.WriteStream | null = null;
  private streamFd: number | null = null;
  private syncFd: number | null = null;
  private currentPath = '';
  private currentSize = 0;
  private timer: NodeJS.Timeout | null = null;
  private destroyed = false;
  private emergency = false;
  private drops = 0;
  private writeErrors = 0;

  constructor(context: string, minLevel?: LogLevel);
  constructor(options: LoggerOptions);
  constructor(ctxOrOpts: string | LoggerOptions, minLevel?: LogLevel) {
    if (typeof ctxOrOpts === 'string') {
      this.opts = {
        context: ctxOrOpts,
        minLevel: minLevel ?? 'info',
        logDir: this.defaultLogDir(),
        enableConsole: true,
        enableFile: true,
        bufferLimit: 100,
        flushIntervalMs: 2000,
        syncOnError: true,
        maxFileBytes: 50 * 1024 * 1024,
        maxBackupFiles: 5,
      };
    } else {
      this.opts = {
        minLevel: 'info',
        logDir: this.defaultLogDir(),
        enableConsole: true,
        enableFile: true,
        bufferLimit: 100,
        flushIntervalMs: 2000,
        syncOnError: true,
        maxFileBytes: 50 * 1024 * 1024,
        maxBackupFiles: 5,
        ...ctxOrOpts,
      };
    }

    this.resurrect();
    this.startTimer();
    this.hookTermination();
  }

  debug(msg: string, data?: unknown): void { this.enqueue('debug', msg, data); }
  info (msg: string, data?: unknown): void { this.enqueue('info',  msg, data); }
  warn (msg: string, data?: unknown): void { this.enqueue('warn',  msg, data); }
  error(msg: string, data?: unknown): void { this.enqueue('error', msg, data); }
  fatal(msg: string, data?: unknown): void { this.enqueue('fatal', msg, data); }

  withContext<T>(meta: Record<string, unknown>, fn: () => T): T {
    const existing = Logger.asyncStore.getStore() ?? {};
    return Logger.asyncStore.run({ ...existing, ...meta }, fn);
  }

  async flush(): Promise<void> {
    if (this.destroyed) return;
    return this.triggerFlush();
  }

  async close(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopTimer();
    await this.triggerFlush();
    this.closeStream();
    this.closeSyncFd();
  }

  status(): { healthy: boolean; emergency: boolean; pending: number; drops: number; file: string } {
    return {
      healthy: !this.emergency,
      emergency: this.emergency,
      pending: this.active.length + this.flushBuf.length,
      drops: this.drops,
      file: this.currentPath,
    };
  }

  private enqueue(level: LogLevel, msg: string, data?: unknown): void {
    if (this.destroyed || !this.shouldLog(level)) return;

    const entry = this.buildEntry(level, msg, data);

    if (this.opts.syncOnError && (level === 'error' || level === 'fatal')) {
      this.syncWrite(entry);
    }

    this.active.push(entry);

    if (this.active.length >= this.opts.bufferLimit) {
      this.triggerFlush().catch(() => {});
    }
  }

  private buildEntry(level: LogLevel, msg: string, data?: unknown): LogEntry {
    const asyncCtx = Logger.asyncStore.getStore();
    return {
      _ts: new Date().toISOString(),
      _ns: process.hrtime.bigint().toString(),
      _seq: ++Logger.seqCounter,
      _pid: process.pid,
      _tid: this.getThreadId(),
      level,
      ctx: this.opts.context,
      msg,
      data: data ?? asyncCtx ?? undefined,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return Logger.PRIORITY[level] >= Logger.PRIORITY[this.opts.minLevel];
  }

  private async triggerFlush(): Promise<void> {
    if (this.flushState === 'flushing') {
      this.flushState = 'pending';
      return;
    }
    if (this.flushState === 'pending') return;
    if (this.active.length === 0) return;

    this.flushState = 'flushing';
    this.flushBuf = this.active.splice(0);

    try {
      await this.writeBatch(this.flushBuf);
    } catch (err) {
      this.handleStreamError(err);
    } finally {
      const hadPending = this.flushState === 'pending';
      this.flushBuf = [];
      this.flushState = 'idle';

      if (this.active.length > 0 || hadPending) {
        return this.triggerFlush();
      }
    }
  }

  private async writeBatch(entries: LogEntry[]): Promise<void> {
    if (entries.length === 0) return;

    if (this.opts.enableConsole) {
      for (const e of entries) {
        const line = this.stringify(e);
        const fn = e.level === 'debug' ? console.debug
          : e.level === 'info'  ? console.info
          : e.level === 'warn'  ? console.warn
          : console.error;
        try { fn(line); } catch {}
      }
    }

    if (!this.opts.enableFile || this.emergency) return;

    this.resurrect();
    if (!this.stream || this.stream.destroyed) {
      throw new Error('Stream unavailable');
    }

    this.checkRotation();

    const payload = entries.map(e => this.stringify(e)).join('\n') + '\n';
    const buf = Buffer.from(payload, 'utf8');

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Write timeout')), 5000);
      const ok = this.stream!.write(buf, (err) => {
        clearTimeout(t);
        if (err) return reject(err);
        this.currentSize += buf.length;
        resolve();
      });
      if (!ok) {}
    });
  }

  private syncWrite(entry: LogEntry): void {
    if (!this.opts.enableFile) return;

    try {
      this.resurrect();
      const line = this.stringify(entry) + '\n';
      const buf = Buffer.from(line, 'utf8');

      const fd = this.getSyncFd();
      fs.writeSync(fd, buf);
      fs.fsyncSync(fd);

      this.currentSize += buf.length;
    } catch (err) {
      this.enterEmergencyMode('syncWrite failure', err);
      try { console.error('[LOGGER-SYNC-FAILURE]', entry, err); } catch {}
    }
  }

  private syncFlush(): void {
    const all = [...this.flushBuf, ...this.active];
    this.flushBuf = [];
    this.active.length = 0;
    for (const entry of all) this.syncWrite(entry);
  }

  private defaultLogDir(): string {
    const base =
      process.env.APPDATA ||
      (process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support')
        : path.join(os.homedir(), '.config'));
    return path.join(base, 'bixtx.comLink', 'logs');
  }

  private buildPath(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.opts.logDir, `bixtx-link-${date}.log`);
  }

  private resurrect(): void {
    if (!this.opts.enableFile || this.emergency) return;

    try {
      if (!fs.existsSync(this.opts.logDir)) {
        fs.mkdirSync(this.opts.logDir, { recursive: true });
      }
      this.openStream();
    } catch (err) {
      this.enterEmergencyMode('resurrect failed', err);
    }
  }

  private openStream(): void {
    const target = this.buildPath();
    if (this.stream && !this.stream.destroyed && this.currentPath === target) return;

    this.closeStream();
    this.currentPath = target;

    try {
      const stat = fs.statSync(target);
      this.currentSize = stat.size;
    } catch {
      this.currentSize = 0;
    }

    this.stream = fs.createWriteStream(target, { flags: 'a', encoding: 'utf8', autoClose: false });
    this.stream.on('error', (e) => this.handleStreamError(e));
    this.stream.on('open', (fd) => { this.streamFd = fd; });
  }

  private closeStream(): void {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
      this.streamFd = null;
    }
  }

  private getSyncFd(): number {
    if (this.syncFd != null) return this.syncFd;
    this.syncFd = fs.openSync(this.buildPath(), 'a');
    return this.syncFd;
  }

  private closeSyncFd(): void {
    if (this.syncFd != null) {
      fs.closeSync(this.syncFd);
      this.syncFd = null;
    }
  }

  private checkRotation(): void {
    if (this.currentSize < this.opts.maxFileBytes) return;
    this.rotate();
  }

  private rotate(): void {
    this.closeStream();
    this.closeSyncFd();

    for (let i = this.opts.maxBackupFiles; i > 1; i--) {
      const older = `${this.currentPath}.${i - 1}`;
      const newer = `${this.currentPath}.${i}`;
      try {
        if (fs.existsSync(older)) fs.renameSync(older, newer);
      } catch {}
    }
    try {
      if (fs.existsSync(this.currentPath)) {
        fs.renameSync(this.currentPath, `${this.currentPath}.1`);
      }
    } catch {}

    this.currentSize = 0;
    this.openStream();
  }

  private startTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (this.active.length) this.triggerFlush().catch(() => {});
    }, this.opts.flushIntervalMs);
    this.timer.unref?.();
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private hookTermination(): void {
    const die = () => {
      this.destroyed = true;
      this.stopTimer();
      this.syncFlush();
      this.closeStream();
      this.closeSyncFd();
    };

    process.once('SIGINT', die);
    process.once('SIGTERM', die);
    process.once('exit', die);
    process.on('beforeExit', () => this.flush());
  }

  private handleStreamError(err: unknown): void {
    this.writeErrors++;
    if (this.writeErrors > 5) {
      this.enterEmergencyMode('too many stream errors', err);
    } else {
      this.closeStream();
      this.resurrect();
    }
  }

  private enterEmergencyMode(reason: string, err: unknown): void {
    if (this.emergency) return;
    this.emergency = true;
    try { console.error(`[LOGGER-EMERGENCY] ${reason}`, err); } catch {}
  }

  private stringify(obj: unknown): string {
    try {
      return JSON.stringify(obj, (_k, v) => {
        if (typeof v === 'bigint') return v.toString();
        if (v instanceof Error) return { name: v.name, message: v.message, stack: v.stack };
        return v;
      });
    } catch {
      return '{"__error":"unserializable"}';
    }
  }

  private getThreadId(): number {
    try {
      const { threadId } = require('worker_threads');
      return threadId as number;
    } catch {
      return 0;
    }
  }
}
