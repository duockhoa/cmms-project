import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrowserSessionService } from './browser-session.service';

@Injectable()
export class SessionMaintenanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionMaintenanceService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(private config: ConfigService, private sessions: BrowserSessionService) {}

  onModuleInit() {
    if (this.config.get<string>('SESSION_MAINTENANCE_ENABLED') !== 'true') return;
    const seconds = Number(this.config.get<string>('SESSION_MAINTENANCE_INTERVAL_SECONDS') || 3600);
    if (!Number.isInteger(seconds) || seconds < 60 || seconds > 86400) throw new Error('Invalid SESSION_MAINTENANCE_INTERVAL_SECONDS');
    this.timer = setInterval(() => { void this.run(); }, seconds * 1000);
    this.timer.unref();
  }

  async run() {
    if (this.running) return;
    this.running = true;
    try { await this.sessions.maintain(true); }
    catch { this.logger.error('session_maintenance_failed'); }
    finally { this.running = false; }
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
}
