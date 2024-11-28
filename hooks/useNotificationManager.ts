import { useState, useEffect, useCallback } from 'react';
import NotificationService, { 
  Notification, 
  NotificationType,
  NotificationSource,
  NotificationAction
} from '../services/automation/NotificationService';

interface UseNotificationManagerProps {
  source?: NotificationSource;
  autoMarkAsRead?: boolean;
  maxNotifications?: number;
}

interface NotificationOptions {
  type?: NotificationType;
  priority?: number;
  actions?: NotificationAction[];
  autoDismiss?: boolean;
  dismissTimeout?: number;
}

export function useNotificationManager({
  source = 'system',
  autoMarkAsRead = false,
  maxNotifications = 100
}: UseNotificationManagerProps = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadNotifications = () => {
      const allNotifications = NotificationService.getNotifications()
        .filter(n => !source || n.source === source)
        .slice(0, maxNotifications);
      
      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter(n => !n.read).length);
    };

    loadNotifications();

    NotificationService.on('notificationAdded', loadNotifications);
    NotificationService.on('notificationRemoved', loadNotifications);
    NotificationService.on('notificationsCleared', loadNotifications);
    NotificationService.on('notificationRead', loadNotifications);

    return () => {
      NotificationService.off('notificationAdded', loadNotifications);
      NotificationService.off('notificationRemoved', loadNotifications);
      NotificationService.off('notificationsCleared', loadNotifications);
      NotificationService.off('notificationRead', loadNotifications);
    };
  }, [source, maxNotifications]);

  const sendNotification = useCallback((
    title: string,
    message: string,
    options: NotificationOptions = {}
  ) => {
    const notification = NotificationService.sendNotification({
      title,
      message,
      type: options.type || 'info',
      source,
      priority: options.priority || 1,
      actions: options.actions,
      autoDismiss: options.autoDismiss,
      dismissTimeout: options.dismissTimeout
    });

    if (autoMarkAsRead) {
      setTimeout(() => {
        NotificationService.markAsRead(notification.id);
      }, 0);
    }

    return notification;
  }, [source, autoMarkAsRead]);

  const markAsRead = useCallback((notificationId: string) => {
    NotificationService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    const unreadNotifications = notifications.filter(n => !n.read);
    unreadNotifications.forEach(n => NotificationService.markAsRead(n.id));
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  }, [notifications]);

  const removeNotification = useCallback((notificationId: string) => {
    NotificationService.removeNotification(notificationId);
    const notification = notifications.find(n => n.id === notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, [notifications]);

  const clearNotifications = useCallback(() => {
    NotificationService.clearAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const sendSuccess = useCallback((
    title: string,
    message: string,
    options: Omit<NotificationOptions, 'type'> = {}
  ) => {
    return sendNotification(title, message, { ...options, type: 'success' });
  }, [sendNotification]);

  const sendError = useCallback((
    title: string,
    message: string,
    options: Omit<NotificationOptions, 'type'> = {}
  ) => {
    return sendNotification(title, message, { ...options, type: 'error' });
  }, [sendNotification]);

  const sendWarning = useCallback((
    title: string,
    message: string,
    options: Omit<NotificationOptions, 'type'> = {}
  ) => {
    return sendNotification(title, message, { ...options, type: 'warning' });
  }, [sendNotification]);

  const sendInfo = useCallback((
    title: string,
    message: string,
    options: Omit<NotificationOptions, 'type'> = {}
  ) => {
    return sendNotification(title, message, { ...options, type: 'info' });
  }, [sendNotification]);

  return {
    notifications,
    unreadCount,
    sendNotification,
    sendSuccess,
    sendError,
    sendWarning,
    sendInfo,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications
  };
}
