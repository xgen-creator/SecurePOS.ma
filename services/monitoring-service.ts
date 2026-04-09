import os from 'os';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { NotificationService } from './notification-service';
import { AuditService } from './audit-service';

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  uptime: number;
}

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  lastCheck: Date;
  message?: string;
}

export class MonitoringService extends EventEmitter {
  private static instance: MonitoringService;
  private redis: Redis;
  private serviceChecks: Map<string, () => Promise<boolean>>;
  private metrics: SystemMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkLatency: 0,
    uptime: 0
  };
  private serviceStatus: Map<string, ServiceStatus> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL);
    this.serviceChecks = new Map();
    this.initializeServiceChecks();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private initializeServiceChecks() {
    // Add default service checks
    this.addServiceCheck('database', async () => {
      try {
        // Add your database health check logic here
        return true;
      } catch (error) {
        return false;
      }
    });

    this.addServiceCheck('redis', async () => {
      try {
        await this.redis.ping();
        return true;
      } catch (error) {
        return false;
      }
    });

    this.addServiceCheck('facial-recognition', async () => {
      try {
        // Add your facial recognition service health check logic here
        return true;
      } catch (error) {
        return false;
      }
    });
  }

  async start(checkIntervalMs: number = 60000): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      await this.checkAll();
    }, checkIntervalMs);

    // Initial check
    await this.checkAll();
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  addServiceCheck(serviceName: string, checkFn: () => Promise<boolean>): void {
    this.serviceChecks.set(serviceName, checkFn);
  }

  private async checkAll(): Promise<void> {
    await Promise.all([
      this.updateSystemMetrics(),
      this.checkServices()
    ]);

    this.emit('metrics-updated', this.metrics);
    this.emit('status-updated', Array.from(this.serviceStatus.values()));

    // Store metrics in Redis for historical analysis
    await this.storeMetrics();
  }

  private async updateSystemMetrics(): Promise<void> {
    try {
      // CPU Usage
      const cpus = os.cpus();
      const cpuUsage = cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b);
        const idle = cpu.times.idle;
        return acc + ((total - idle) / total);
      }, 0) / cpus.length * 100;

      // Memory Usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

      // Disk Usage (example implementation)
      const diskUsage = await this.checkDiskUsage();

      // Network Latency (example implementation)
      const networkLatency = await this.checkNetworkLatency();

      this.metrics = {
        cpuUsage,
        memoryUsage,
        diskUsage,
        networkLatency,
        uptime: os.uptime()
      };

      // Check for concerning metrics
      this.checkMetricThresholds();
    } catch (error) {
      console.error('Failed to update system metrics:', error);
    }
  }

  private async checkServices(): Promise<void> {
    for (const [serviceName, checkFn] of this.serviceChecks.entries()) {
      try {
        const isOperational = await checkFn();
        const currentStatus = this.serviceStatus.get(serviceName);
        const newStatus: ServiceStatus = {
          name: serviceName,
          status: isOperational ? 'operational' : 'down',
          lastCheck: new Date()
        };

        if (currentStatus?.status === 'operational' && !isOperational) {
          // Service just went down
          await this.handleServiceDown(serviceName);
        } else if (currentStatus?.status === 'down' && isOperational) {
          // Service recovered
          await this.handleServiceRecovery(serviceName);
        }

        this.serviceStatus.set(serviceName, newStatus);
      } catch (error) {
        console.error(`Failed to check service ${serviceName}:`, error);
        this.serviceStatus.set(serviceName, {
          name: serviceName,
          status: 'degraded',
          lastCheck: new Date(),
          message: error.message
        });
      }
    }
  }

  private async handleServiceDown(serviceName: string): Promise<void> {
    // Log incident
    await AuditService.logEvent({
      eventType: 'SERVICE_DOWN',
      details: {
        serviceName,
        timestamp: new Date()
      }
    });

    // Send notification
    await NotificationService.sendNotification({
      title: 'Service Down',
      message: `${serviceName} service is not responding`,
      type: 'ALERT',
      priority: 'HIGH',
      metadata: {
        serviceName,
        metrics: this.metrics
      }
    });
  }

  private async handleServiceRecovery(serviceName: string): Promise<void> {
    // Log recovery
    await AuditService.logEvent({
      eventType: 'SERVICE_RECOVERED',
      details: {
        serviceName,
        timestamp: new Date()
      }
    });

    // Send notification
    await NotificationService.sendNotification({
      title: 'Service Recovered',
      message: `${serviceName} service is now operational`,
      type: 'INFO',
      priority: 'MEDIUM',
      metadata: {
        serviceName,
        metrics: this.metrics
      }
    });
  }

  private async checkMetricThresholds(): Promise<void> {
    const thresholds = {
      cpuUsage: 80,
      memoryUsage: 85,
      diskUsage: 90
    };

    if (this.metrics.cpuUsage > thresholds.cpuUsage) {
      await this.handleHighCPUUsage();
    }

    if (this.metrics.memoryUsage > thresholds.memoryUsage) {
      await this.handleHighMemoryUsage();
    }

    if (this.metrics.diskUsage > thresholds.diskUsage) {
      await this.handleHighDiskUsage();
    }
  }

  private async handleHighCPUUsage(): Promise<void> {
    await NotificationService.sendNotification({
      title: 'High CPU Usage',
      message: `CPU usage is at ${this.metrics.cpuUsage.toFixed(1)}%`,
      type: 'WARNING',
      priority: 'HIGH',
      metadata: {
        metrics: this.metrics
      }
    });
  }

  private async handleHighMemoryUsage(): Promise<void> {
    await NotificationService.sendNotification({
      title: 'High Memory Usage',
      message: `Memory usage is at ${this.metrics.memoryUsage.toFixed(1)}%`,
      type: 'WARNING',
      priority: 'HIGH',
      metadata: {
        metrics: this.metrics
      }
    });
  }

  private async handleHighDiskUsage(): Promise<void> {
    await NotificationService.sendNotification({
      title: 'High Disk Usage',
      message: `Disk usage is at ${this.metrics.diskUsage.toFixed(1)}%`,
      type: 'WARNING',
      priority: 'HIGH',
      metadata: {
        metrics: this.metrics
      }
    });
  }

  private async storeMetrics(): Promise<void> {
    const timestamp = new Date().getTime();
    const metricsKey = `metrics:${timestamp}`;
    
    await this.redis.setex(
      metricsKey,
      86400, // Store for 24 hours
      JSON.stringify(this.metrics)
    );

    // Store in time series for historical analysis
    await this.redis.zadd('metrics:history', timestamp, metricsKey);

    // Cleanup old metrics
    const oneDayAgo = timestamp - (24 * 60 * 60 * 1000);
    await this.redis.zremrangebyscore('metrics:history', 0, oneDayAgo);
  }

  private async checkDiskUsage(): Promise<number> {
    // Implement disk usage check logic here
    // This is a placeholder implementation
    return 65.5;
  }

  private async checkNetworkLatency(): Promise<number> {
    // Implement network latency check logic here
    // This is a placeholder implementation
    return 50; // ms
  }

  async getMetrics(): Promise<SystemMetrics> {
    return this.metrics;
  }

  async getServiceStatus(): Promise<ServiceStatus[]> {
    return Array.from(this.serviceStatus.values());
  }

  async getHistoricalMetrics(
    startTime: Date,
    endTime: Date
  ): Promise<SystemMetrics[]> {
    const start = startTime.getTime();
    const end = endTime.getTime();

    const metricKeys = await this.redis.zrangebyscore(
      'metrics:history',
      start,
      end
    );

    const metrics = await Promise.all(
      metricKeys.map(async key => {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      })
    );

    return metrics.filter(m => m !== null);
  }
}
