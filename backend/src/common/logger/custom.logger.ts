import { ConsoleLogger, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CustomLogger extends ConsoleLogger {
  private logDirectory = path.join(process.cwd(), 'logs');

  constructor() {
    super();
    // Ensure logs directory exists
    try {
      if (!fs.existsSync(this.logDirectory)) {
        fs.mkdirSync(this.logDirectory);
      }
    } catch (e) {}
  }

  log(message: any, context?: string) {
    super.log(message, context);
    this.writeToFile('INFO', message, context);
  }

  error(message: any, stack?: string, context?: string) {
    super.error(message, stack, context);
    this.writeToFile('ERROR', message, context, stack);
  }

  warn(message: any, context?: string) {
    super.warn(message, context);
    this.writeToFile('WARN', message, context);
  }

  debug(message: any, context?: string) {
    super.debug(message, context);
    this.writeToFile('DEBUG', message, context);
  }

  verbose(message: any, context?: string) {
    super.verbose(message, context);
    this.writeToFile('VERBOSE', message, context);
  }

  private writeToFile(level: string, message: any, context?: string, stack?: string) {
    const timestamp = new Date().toISOString();
    const cleanMessage = typeof message === 'object' ? JSON.stringify(message) : message;
    const logLine = `[${timestamp}] [${level}] [${context || 'Application'}] ${cleanMessage}${
      stack ? `\nStack: ${stack}` : ''
    }\n`;

    const logFile = path.join(this.logDirectory, `${new Date().toISOString().slice(0, 10)}.log`);
    try {
      fs.appendFileSync(logFile, logLine, 'utf8');
    } catch (e) {
      // Suppress log file write errors in test or read-only environments
    }
  }
}
