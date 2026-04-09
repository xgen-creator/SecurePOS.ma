/**
 * ScanBell Logger Service
 * Remplace console.log par un vrai système de logging structuré
 * Compatible avec Pino/Winston pour production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  requestId?: string
  [key: string]: any
}

class Logger {
  private service: string

  constructor(service: string) {
    this.service = service
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      service: this.service,
      message,
      context,
      env: process.env.NODE_ENV || 'development'
    }

    // En production, envoyer vers un service d'agrégation (Datadog, etc.)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Envoyer vers Datadog/New Relic
      // await sendToLogAggregator(logEntry)
    }

    // En développement, pretty print
    if (process.env.NODE_ENV !== 'production') {
      const color = this.getColor(level)
      console.log(
        `${color}[${timestamp}] ${level.toUpperCase()} [${this.service}]${'\x1b[0m'} ${message}`,
        context ? JSON.stringify(context, null, 2) : ''
      )
    }
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case 'debug': return '\x1b[36m' // Cyan
      case 'info': return '\x1b[32m'  // Green
      case 'warn': return '\x1b[33m'  // Yellow
      case 'error': return '\x1b[31m' // Red
      default: return '\x1b[0m'
    }
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.DEBUG === 'true') {
      this.log('debug', message, context)
    }
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context)
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context)
    // En production, alerter immédiatement sur les erreurs critiques
    if (process.env.NODE_ENV === 'production' && context?.alert) {
      // TODO: Send alert to PagerDuty/Opsgenie
    }
  }
}

// Export factory pour créer des loggers par service
export function createLogger(service: string): Logger {
  return new Logger(service)
}

// Logger global pour usage rapide
export const logger = createLogger('ScanBell')

export default logger
