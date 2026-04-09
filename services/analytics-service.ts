import { AccessLog } from '../models/access-log.model';
import { Visitor } from '../models/visitor.model';
import { AuditLog } from '../models/audit-log.model';
import { NotificationService } from './notification-service';
import { MonitoringService } from './monitoring-service';

interface TimeRange {
  start: Date;
  end: Date;
}

interface VisitorAnalytics {
  totalVisitors: number;
  activeVisitors: number;
  visitorsByAccessLevel: Record<string, number>;
  averageDuration: number;
  peakHours: Array<{ hour: number; count: number }>;
}

interface SecurityAnalytics {
  totalAccesses: number;
  deniedAccesses: number;
  suspiciousActivities: number;
  averageConfidence: number;
  locationActivity: Record<string, number>;
}

interface SystemAnalytics {
  uptime: number;
  averageCpuUsage: number;
  averageMemoryUsage: number;
  serviceHealth: Record<string, number>;
  incidentCount: number;
}

export class AnalyticsService {
  static async generateDailyReport(): Promise<any> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeRange = { start: yesterday, end: today };

    const [visitorAnalytics, securityAnalytics, systemAnalytics] = await Promise.all([
      this.getVisitorAnalytics(timeRange),
      this.getSecurityAnalytics(timeRange),
      this.getSystemAnalytics(timeRange)
    ]);

    const report = {
      date: yesterday,
      visitors: visitorAnalytics,
      security: securityAnalytics,
      system: systemAnalytics,
      generatedAt: new Date()
    };

    // Store report in database
    // await Report.create(report);

    // Send notification
    await NotificationService.sendNotification({
      title: 'Daily Security Report Available',
      message: 'The security report for yesterday is now available',
      type: 'INFO',
      priority: 'LOW',
      metadata: {
        reportDate: yesterday,
        highlights: this.getReportHighlights(report)
      }
    });

    return report;
  }

  private static async getVisitorAnalytics(timeRange: TimeRange): Promise<VisitorAnalytics> {
    const accessLogs = await AccessLog.find({
      timestamp: { $gte: timeRange.start, $lt: timeRange.end }
    });

    const visitors = await Visitor.find({
      createdAt: { $lte: timeRange.end }
    });

    const activeVisitors = visitors.filter(v => v.active).length;

    const visitorsByAccessLevel = visitors.reduce((acc, visitor) => {
      acc[visitor.accessLevel] = (acc[visitor.accessLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const peakHours = await this.calculatePeakHours(accessLogs);

    return {
      totalVisitors: visitors.length,
      activeVisitors,
      visitorsByAccessLevel,
      averageDuration: this.calculateAverageDuration(accessLogs),
      peakHours
    };
  }

  private static async getSecurityAnalytics(timeRange: TimeRange): Promise<SecurityAnalytics> {
    const accessLogs = await AccessLog.find({
      timestamp: { $gte: timeRange.start, $lt: timeRange.end }
    });

    const deniedAccesses = accessLogs.filter(log => log.status === 'DENIED').length;

    const locationActivity = accessLogs.reduce((acc, log) => {
      acc[log.location] = (acc[log.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const auditLogs = await AuditLog.find({
      timestamp: { $gte: timeRange.start, $lt: timeRange.end },
      eventType: { $regex: /SUSPICIOUS|THREAT|ALERT/ }
    });

    const averageConfidence = accessLogs.reduce((acc, log) => acc + log.confidence, 0) / accessLogs.length;

    return {
      totalAccesses: accessLogs.length,
      deniedAccesses,
      suspiciousActivities: auditLogs.length,
      averageConfidence,
      locationActivity
    };
  }

  private static async getSystemAnalytics(timeRange: TimeRange): Promise<SystemAnalytics> {
    const monitoringService = MonitoringService.getInstance();
    const metrics = await monitoringService.getHistoricalMetrics(timeRange.start, timeRange.end);

    const averageCpuUsage = metrics.reduce((acc, m) => acc + m.cpuUsage, 0) / metrics.length;
    const averageMemoryUsage = metrics.reduce((acc, m) => acc + m.memoryUsage, 0) / metrics.length;

    const serviceStatus = await monitoringService.getServiceStatus();
    const serviceHealth = serviceStatus.reduce((acc, status) => {
      acc[status.name] = status.status === 'operational' ? 100 : status.status === 'degraded' ? 50 : 0;
      return acc;
    }, {} as Record<string, number>);

    const incidentLogs = await AuditLog.find({
      timestamp: { $gte: timeRange.start, $lt: timeRange.end },
      eventType: { $regex: /ERROR|FAILURE|DOWN/ }
    });

    return {
      uptime: metrics[metrics.length - 1]?.uptime || 0,
      averageCpuUsage,
      averageMemoryUsage,
      serviceHealth,
      incidentCount: incidentLogs.length
    };
  }

  private static calculatePeakHours(accessLogs: any[]): Array<{ hour: number; count: number }> {
    const hourCounts = new Array(24).fill(0);

    accessLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourCounts[hour]++;
    });

    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private static calculateAverageDuration(accessLogs: any[]): number {
    const durations: number[] = [];
    const logsByVisitor = new Map<string, Date[]>();

    accessLogs.forEach(log => {
      if (!logsByVisitor.has(log.visitorId)) {
        logsByVisitor.set(log.visitorId, []);
      }
      logsByVisitor.get(log.visitorId)?.push(new Date(log.timestamp));
    });

    logsByVisitor.forEach(timestamps => {
      timestamps.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 0; i < timestamps.length - 1; i += 2) {
        const duration = timestamps[i + 1].getTime() - timestamps[i].getTime();
        durations.push(duration);
      }
    });

    return durations.length > 0
      ? durations.reduce((acc, dur) => acc + dur, 0) / durations.length / (60 * 1000) // Convert to minutes
      : 0;
  }

  private static getReportHighlights(report: any): any {
    return {
      totalVisitors: report.visitors.totalVisitors,
      deniedAccesses: report.security.deniedAccesses,
      suspiciousActivities: report.security.suspiciousActivities,
      systemHealth: Object.values(report.system.serviceHealth).every(health => health === 100)
        ? 'Healthy'
        : 'Needs Attention'
    };
  }

  static async generateCustomReport(
    timeRange: TimeRange,
    options: {
      includeVisitors?: boolean;
      includeSecurity?: boolean;
      includeSystem?: boolean;
    } = {}
  ): Promise<any> {
    const report: any = {
      timeRange,
      generatedAt: new Date()
    };

    if (options.includeVisitors) {
      report.visitors = await this.getVisitorAnalytics(timeRange);
    }

    if (options.includeSecurity) {
      report.security = await this.getSecurityAnalytics(timeRange);
    }

    if (options.includeSystem) {
      report.system = await this.getSystemAnalytics(timeRange);
    }

    return report;
  }

  static async detectAnomalies(timeRange: TimeRange): Promise<any> {
    const accessLogs = await AccessLog.find({
      timestamp: { $gte: timeRange.start, $lt: timeRange.end }
    });

    const anomalies = {
      unusualAccessPatterns: this.detectUnusualAccessPatterns(accessLogs),
      suspiciousVisitors: await this.detectSuspiciousVisitors(timeRange),
      systemAnomalies: await this.detectSystemAnomalies(timeRange)
    };

    if (Object.values(anomalies).some(a => a.length > 0)) {
      await NotificationService.sendNotification({
        title: 'Security Anomalies Detected',
        message: 'Multiple security anomalies have been detected in the system',
        type: 'WARNING',
        priority: 'HIGH',
        metadata: anomalies
      });
    }

    return anomalies;
  }

  private static detectUnusualAccessPatterns(accessLogs: any[]): any[] {
    // Implement unusual access pattern detection logic
    return [];
  }

  private static async detectSuspiciousVisitors(timeRange: TimeRange): Promise<any[]> {
    // Implement suspicious visitor detection logic
    return [];
  }

  private static async detectSystemAnomalies(timeRange: TimeRange): Promise<any[]> {
    // Implement system anomaly detection logic
    return [];
  }
}
