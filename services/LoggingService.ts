import { eventService, SystemEvent } from './EventService';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error';
  message: string;
  context?: Record<string, any>;
}

class LoggingService {
  private static instance: LoggingService;
  private readonly logDir: string;
  private readonly logFile: string;
  private readonly errorLogFile: string;

  private constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'app.log');
    this.errorLogFile = path.join(this.logDir, 'error.log');
    this.initializeLogDirectory();
    this.setupEventListeners();
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private initializeLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private setupEventListeners(): void {
    eventService.subscribe({
      id: 'logging-service',
      eventTypes: ['*'],
      callback: this.handleSystemEvent.bind(this)
    });
  }

  private handleSystemEvent(event: SystemEvent): void {
    this.info(`Event received: ${event.type}`, {
      eventData: event.data,
      source: event.source
    });
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(7);
    const context = entry.context ? ` | Context: ${JSON.stringify(entry.context)}` : '';
    return `[${timestamp}] ${level} | ${entry.message}${context}\n`;
  }

  private async writeToLog(entry: LogEntry, file: string): Promise<void> {
    const logEntry = this.formatLogEntry(entry);
    
    try {
      await fs.promises.appendFile(file, logEntry);
    } catch (error) {
      console.error('Error writing to log file:', error);
      // En cas d'erreur d'écriture, on essaie d'écrire dans la console
      console.log(logEntry);
    }
  }

  public debug(message: string, context?: Record<string, any>): void {
    if (config.logging.level === 'debug') {
      const entry: LogEntry = {
        timestamp: new Date(),
        level: 'debug',
        message,
        context
      };
      this.writeToLog(entry, this.logFile);
    }
  }

  public info(message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'info',
      message,
      context
    };
    this.writeToLog(entry, this.logFile);
  }

  public warning(message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'warning',
      message,
      context
    };
    this.writeToLog(entry, this.logFile);
  }

  public error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level: 'error',
      message,
      context: {
        ...context,
        error: error ? {
          message: error.message,
          stack: error.stack
        } : undefined
      }
    };
    
    // Écrire dans les deux fichiers de log
    this.writeToLog(entry, this.logFile);
    this.writeToLog(entry, this.errorLogFile);
  }

  public async getLogEntries(
    options: {
      level?: LogEntry['level'];
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      search?: string;
    } = {}
  ): Promise<LogEntry[]> {
    try {
      const logContent = await fs.promises.readFile(this.logFile, 'utf-8');
      let entries = logContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => this.parseLogEntry(line))
        .filter(entry => entry !== null) as LogEntry[];

      // Appliquer les filtres
      if (options.level) {
        entries = entries.filter(entry => entry.level === options.level);
      }

      if (options.startDate) {
        entries = entries.filter(entry => entry.timestamp >= options.startDate!);
      }

      if (options.endDate) {
        entries = entries.filter(entry => entry.timestamp <= options.endDate!);
      }

      if (options.search) {
        const searchLower = options.search.toLowerCase();
        entries = entries.filter(entry => 
          entry.message.toLowerCase().includes(searchLower) ||
          JSON.stringify(entry.context).toLowerCase().includes(searchLower)
        );
      }

      // Trier par date décroissante
      entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Limiter le nombre de résultats
      if (options.limit) {
        entries = entries.slice(0, options.limit);
      }

      return entries;
    } catch (error) {
      console.error('Error reading log file:', error);
      return [];
    }
  }

  private parseLogEntry(line: string): LogEntry | null {
    try {
      const match = line.match(/\[(.*?)\]\s+(\w+)\s+\|\s+(.*?)(?:\s+\|\s+Context:\s+(.*))?$/);
      if (!match) return null;

      const [, timestamp, level, message, contextStr] = match;
      const context = contextStr ? JSON.parse(contextStr) : undefined;

      return {
        timestamp: new Date(timestamp),
        level: level.toLowerCase() as LogEntry['level'],
        message,
        context
      };
    } catch {
      return null;
    }
  }

  public async clearLogs(): Promise<void> {
    try {
      await fs.promises.writeFile(this.logFile, '');
      await fs.promises.writeFile(this.errorLogFile, '');
    } catch (error) {
      console.error('Error clearing log files:', error);
    }
  }
}

export const loggingService = LoggingService.getInstance();
