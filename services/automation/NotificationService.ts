import { EventEmitter } from 'events';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: number;
  source: string;
  priority: number;
  icon?: string;
  actions?: Array<{
    label: string;
    action: () => Promise<void>;
  }>;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Map<string, Notification>;
  private eventEmitter: EventEmitter;
  private notificationHistory: Notification[];
  private maxHistorySize: number = 1000;

  private constructor() {
    this.notifications = new Map();
    this.eventEmitter = new EventEmitter();
    this.notificationHistory = [];
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async sendNotification(notification: Omit<Notification, 'id' | 'timestamp'>): Promise<string> {
    const id = this.generateNotificationId();
    const timestamp = Date.now();

    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp
    };

    this.notifications.set(id, fullNotification);
    this.notificationHistory.push(fullNotification);

    // Limiter la taille de l'historique
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory.shift();
    }

    // Émettre l'événement de nouvelle notification
    this.eventEmitter.emit('newNotification', fullNotification);

    // Si la notification a des actions, les rendre disponibles
    if (fullNotification.actions) {
      this.eventEmitter.emit('notificationActions', {
        notificationId: id,
        actions: fullNotification.actions
      });
    }

    return id;
  }

  public async sendDeviceNotification(
    deviceId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'info'
  ): Promise<string> {
    return this.sendNotification({
      title,
      message,
      type,
      source: 'device',
      priority: 1,
      metadata: { deviceId }
    });
  }

  public async sendAutomationNotification(
    ruleId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'info'
  ): Promise<string> {
    return this.sendNotification({
      title,
      message,
      type,
      source: 'automation',
      priority: 2,
      metadata: { ruleId }
    });
  }

  public async sendSecurityNotification(
    title: string,
    message: string,
    type: Notification['type'] = 'warning'
  ): Promise<string> {
    return this.sendNotification({
      title,
      message,
      type,
      source: 'security',
      priority: 3
    });
  }

  public dismissNotification(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) {
      return false;
    }

    this.notifications.delete(id);
    this.eventEmitter.emit('notificationDismissed', { notificationId: id });
    return true;
  }

  public dismissAllNotifications(): void {
    const notificationIds = Array.from(this.notifications.keys());
    notificationIds.forEach(id => this.dismissNotification(id));
  }

  public getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  public getAllNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  public getNotificationsBySource(source: string): Notification[] {
    return this.getAllNotifications()
      .filter(notification => notification.source === source);
  }

  public getNotificationHistory(): Notification[] {
    return [...this.notificationHistory]
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default NotificationService.getInstance();
