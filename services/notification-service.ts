import { WebSocket } from 'ws';
import nodemailer from 'nodemailer';
import { Redis } from 'ioredis';
import { Notification } from '../models/notification.model';
import { User } from '../models/user.model';
import { Template } from '../models/template.model';
import { AuditService } from './audit-service';

interface NotificationOptions {
  title: string;
  message: string;
  type: 'ALERT' | 'INFO' | 'WARNING';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  userId?: string;
  metadata?: any;
}

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  context: any;
}

export class NotificationService {
  private static redis = new Redis(process.env.REDIS_URL);
  private static wsClients = new Map<string, WebSocket>();
  private static emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  static async initialize() {
    // Verify email configuration
    await this.emailTransporter.verify();

    // Start cleanup job
    setInterval(() => this.cleanupOldNotifications(), 24 * 60 * 60 * 1000); // Daily
  }

  static async sendNotification(options: NotificationOptions): Promise<boolean> {
    try {
      // Create notification record
      const notification = await Notification.create({
        title: options.title,
        message: options.message,
        type: options.type,
        priority: options.priority,
        userId: options.userId,
        metadata: options.metadata,
        createdAt: new Date()
      });

      // Send to connected WebSocket clients
      if (options.userId) {
        const wsClient = this.wsClients.get(options.userId);
        if (wsClient && wsClient.readyState === WebSocket.OPEN) {
          wsClient.send(JSON.stringify(notification));
        }
      }

      // Store in Redis for real-time access
      await this.redis.set(
        `notification:${notification._id}`,
        JSON.stringify(notification),
        'EX',
        86400 // 24 hours
      );

      // Send push notification if enabled
      if (options.userId) {
        const user = await User.findById(options.userId);
        if (user?.notificationSettings?.push) {
          await this.sendPushNotification(user.pushToken, options);
        }
      }

      // Log notification
      await AuditService.logEvent({
        eventType: 'NOTIFICATION_SENT',
        userId: options.userId,
        details: {
          notificationId: notification._id,
          type: options.type,
          priority: options.priority
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  static async sendEmailNotification(options: EmailOptions): Promise<boolean> {
    try {
      // Get email template
      const template = await Template.findOne({ name: options.template });
      if (!template) {
        throw new Error(`Email template ${options.template} not found`);
      }

      // Render template with context
      const html = this.renderTemplate(template.content, options.context);

      // Send email
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: options.to,
        subject: options.subject,
        html: html
      });

      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  private static async sendPushNotification(
    token: string,
    options: NotificationOptions
  ): Promise<boolean> {
    try {
      // Implement push notification logic here
      // This could use Firebase Cloud Messaging, OneSignal, etc.
      return true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  static async getNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      type?: string;
      priority?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<Notification[]> {
    const query: any = { userId };

    if (options.type) {
      query.type = options.type;
    }

    if (options.priority) {
      query.priority = options.priority;
    }

    if (options.startDate || options.endDate) {
      query.createdAt = {};
      if (options.startDate) {
        query.createdAt.$gte = options.startDate;
      }
      if (options.endDate) {
        query.createdAt.$lte = options.endDate;
      }
    }

    return Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(options.offset || 0)
      .limit(options.limit || 50);
  }

  static async markAsRead(
    userId: string,
    notificationIds: string[]
  ): Promise<boolean> {
    try {
      await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          userId: userId
        },
        {
          $set: { read: true, readAt: new Date() }
        }
      );

      return true;
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      return false;
    }
  }

  static async deleteNotifications(
    userId: string,
    notificationIds: string[]
  ): Promise<boolean> {
    try {
      await Notification.deleteMany({
        _id: { $in: notificationIds },
        userId: userId
      });

      // Remove from Redis
      for (const id of notificationIds) {
        await this.redis.del(`notification:${id}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete notifications:', error);
      return false;
    }
  }

  private static async cleanupOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        read: true
      });
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
    }
  }

  static registerWebSocket(userId: string, ws: WebSocket): void {
    this.wsClients.set(userId, ws);

    ws.on('close', () => {
      this.wsClients.delete(userId);
    });
  }

  private static renderTemplate(template: string, context: any): string {
    // Simple template rendering
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] || '');
  }

  static async getNotificationPreferences(userId: string): Promise<any> {
    const user = await User.findById(userId);
    return user?.notificationSettings || {};
  }

  static async updateNotificationPreferences(
    userId: string,
    preferences: any
  ): Promise<boolean> {
    try {
      await User.findByIdAndUpdate(userId, {
        $set: { notificationSettings: preferences }
      });
      return true;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return false;
    }
  }
}
