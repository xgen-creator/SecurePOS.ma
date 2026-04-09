import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Request, Response } from 'express';

// Create logger instance
const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

interface AuditEvent {
  eventType: string;
  userId: string;
  action: string;
  resource: string;
  details: any;
  ip: string;
  userAgent: string;
  status: string;
  timestamp: Date;
}

export class AuditService {
  static async logEvent(event: AuditEvent) {
    try {
      await logger.info('audit_event', event);
      
      // Store in database for querying
      await AuditEvent.create(event);
      
      // If high-risk event, send alert
      if (this.isHighRiskEvent(event)) {
        await this.sendAlert(event);
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Fallback to file system logging
      this.fallbackLog(event);
    }
  }

  static async logSecurityEvent(req: Request, res: Response, event: Partial<AuditEvent>) {
    const securityEvent = {
      eventType: 'SECURITY',
      userId: req.user?.id || 'anonymous',
      action: event.action,
      resource: req.originalUrl,
      details: {
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
        ...event.details
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      status: res.statusCode.toString(),
      timestamp: new Date()
    };

    await this.logEvent(securityEvent);
  }

  static async logAccessEvent(req: Request, res: Response, accessType: string) {
    const accessEvent = {
      eventType: 'ACCESS',
      userId: req.user?.id || 'anonymous',
      action: accessType,
      resource: req.originalUrl,
      details: {
        method: req.method,
        accessType
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      status: res.statusCode.toString(),
      timestamp: new Date()
    };

    await this.logEvent(accessEvent);
  }

  static async logDataEvent(req: Request, res: Response, dataOperation: string) {
    const dataEvent = {
      eventType: 'DATA',
      userId: req.user?.id || 'anonymous',
      action: dataOperation,
      resource: req.originalUrl,
      details: {
        method: req.method,
        operation: dataOperation,
        data: req.body
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      status: res.statusCode.toString(),
      timestamp: new Date()
    };

    await this.logEvent(dataEvent);
  }

  private static isHighRiskEvent(event: AuditEvent): boolean {
    const highRiskActions = [
      'DELETE',
      'BULK_DELETE',
      'PERMISSION_CHANGE',
      'ROLE_CHANGE',
      'SECURITY_SETTING_CHANGE',
      'FAILED_LOGIN_ATTEMPT',
      'PASSWORD_CHANGE',
      'API_KEY_CHANGE'
    ];

    return highRiskActions.includes(event.action) ||
           event.eventType === 'SECURITY' ||
           event.status === 'error';
  }

  private static async sendAlert(event: AuditEvent) {
    // Implement alert notification (email, SMS, Slack, etc.)
    try {
      await NotificationService.sendAlert({
        type: 'SECURITY_ALERT',
        title: `High Risk Event Detected: ${event.action}`,
        message: `User ${event.userId} performed ${event.action} on ${event.resource}`,
        details: event
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  private static fallbackLog(event: AuditEvent) {
    const fallbackLogger = createLogger({
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      transports: [
        new transports.File({
          filename: 'logs/audit-fallback.log'
        })
      ]
    });

    fallbackLogger.info('audit_event_fallback', event);
  }
}
