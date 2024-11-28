import { eventService, SystemEvent } from './EventService';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  metadata?: Record<string, any>;
}

export interface NotificationSubscriber {
  id: string;
  callback: (notification: Notification) => void;
}

class NotificationService {
  private static instance: NotificationService;
  private notifications: Map<string, Notification>;
  private subscribers: Map<string, NotificationSubscriber>;
  private readonly MAX_NOTIFICATIONS = 100;

  private constructor() {
    this.notifications = new Map();
    this.subscribers = new Map();
    this.setupEventListeners();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private setupEventListeners(): void {
    // S'abonner aux événements système qui nécessitent des notifications
    eventService.subscribe({
      id: 'notification-service',
      eventTypes: ['face-detected', 'scene-activated', 'scene-error', 'security-alert'],
      callback: this.handleSystemEvent.bind(this)
    });
  }

  private handleSystemEvent(event: SystemEvent): void {
    switch (event.type) {
      case 'face-detected':
        this.createNotification({
          type: 'face-detection',
          title: 'Visage détecté',
          message: `Un visage a été détecté : ${event.data.name || 'Inconnu'}`,
          severity: 'info',
          metadata: event.data
        });
        break;

      case 'scene-activated':
        this.createNotification({
          type: 'scene-activation',
          title: 'Scène activée',
          message: `La scène "${event.data.name}" a été activée`,
          severity: 'success',
          metadata: event.data
        });
        break;

      case 'scene-error':
        this.createNotification({
          type: 'scene-error',
          title: 'Erreur de scène',
          message: `Erreur lors de l'exécution de la scène : ${event.data.error}`,
          severity: 'error',
          metadata: event.data
        });
        break;

      case 'security-alert':
        this.createNotification({
          type: 'security',
          title: 'Alerte de sécurité',
          message: event.data.message,
          severity: 'warning',
          metadata: event.data
        });
        break;
    }
  }

  public createNotification(params: {
    type: string;
    title: string;
    message: string;
    severity: Notification['severity'];
    metadata?: Record<string, any>;
  }): Notification {
    const notification: Notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...params,
      timestamp: new Date(),
      read: false
    };

    this.notifications.set(notification.id, notification);
    this.pruneOldNotifications();
    this.notifySubscribers(notification);

    return notification;
  }

  private pruneOldNotifications(): void {
    if (this.notifications.size > this.MAX_NOTIFICATIONS) {
      const sortedNotifications = Array.from(this.notifications.values())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      this.notifications.clear();
      sortedNotifications
        .slice(0, this.MAX_NOTIFICATIONS)
        .forEach(notification => this.notifications.set(notification.id, notification));
    }
  }

  public subscribe(subscriber: NotificationSubscriber): void {
    this.subscribers.set(subscriber.id, subscriber);
  }

  public unsubscribe(subscriberId: string): void {
    this.subscribers.delete(subscriberId);
  }

  private notifySubscribers(notification: Notification): void {
    this.subscribers.forEach(subscriber => {
      subscriber.callback(notification);
    });
  }

  public markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      this.notifications.set(notificationId, notification);
    }
  }

  public markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
  }

  public getNotifications(filter?: {
    read?: boolean;
    type?: string;
    severity?: Notification['severity'];
    startDate?: Date;
    endDate?: Date;
  }): Notification[] {
    let filteredNotifications = Array.from(this.notifications.values());

    if (filter) {
      if (filter.read !== undefined) {
        filteredNotifications = filteredNotifications.filter(n => n.read === filter.read);
      }

      if (filter.type) {
        filteredNotifications = filteredNotifications.filter(n => n.type === filter.type);
      }

      if (filter.severity) {
        filteredNotifications = filteredNotifications.filter(n => n.severity === filter.severity);
      }

      if (filter.startDate) {
        filteredNotifications = filteredNotifications.filter(n => n.timestamp >= filter.startDate!);
      }

      if (filter.endDate) {
        filteredNotifications = filteredNotifications.filter(n => n.timestamp <= filter.endDate!);
      }
    }

    return filteredNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public deleteNotification(notificationId: string): void {
    this.notifications.delete(notificationId);
  }

  public clearNotifications(): void {
    this.notifications.clear();
  }
}

export const notificationService = NotificationService.getInstance();
