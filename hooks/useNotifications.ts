import { useState, useEffect } from 'react';
import NotificationService, { Notification } from '../services/automation/NotificationService';

interface UseNotificationsOptions {
  source?: string;
  autoDissmissAfter?: number;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<Notification[]>(() => 
    options.source 
      ? NotificationService.getNotificationsBySource(options.source)
      : NotificationService.getAllNotifications()
  );

  useEffect(() => {
    const handleNewNotification = (notification: Notification) => {
      if (!options.source || notification.source === options.source) {
        setNotifications(prev => [notification, ...prev]);

        // Auto-dismiss si configuré
        if (options.autoDissmissAfter) {
          setTimeout(() => {
            NotificationService.dismissNotification(notification.id);
          }, options.autoDissmissAfter);
        }
      }
    };

    const handleDismissed = ({ notificationId }: { notificationId: string }) => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    };

    NotificationService.on('newNotification', handleNewNotification);
    NotificationService.on('notificationDismissed', handleDismissed);

    return () => {
      NotificationService.off('newNotification', handleNewNotification);
      NotificationService.off('notificationDismissed', handleDismissed);
    };
  }, [options.source, options.autoDissmissAfter]);

  const sendNotification = async (
    title: string,
    message: string,
    type: Notification['type'] = 'info',
    actions?: Notification['actions']
  ) => {
    return NotificationService.sendNotification({
      title,
      message,
      type,
      source: options.source || 'app',
      priority: 1,
      actions
    });
  };

  const sendDeviceNotification = async (
    deviceId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'info'
  ) => {
    return NotificationService.sendDeviceNotification(deviceId, title, message, type);
  };

  const sendAutomationNotification = async (
    ruleId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'info'
  ) => {
    return NotificationService.sendAutomationNotification(ruleId, title, message, type);
  };

  const sendSecurityNotification = async (
    title: string,
    message: string,
    type: Notification['type'] = 'warning'
  ) => {
    return NotificationService.sendSecurityNotification(title, message, type);
  };

  const dismissNotification = (id: string) => {
    NotificationService.dismissNotification(id);
  };

  const dismissAllNotifications = () => {
    NotificationService.dismissAllNotifications();
  };

  return {
    notifications,
    sendNotification,
    sendDeviceNotification,
    sendAutomationNotification,
    sendSecurityNotification,
    dismissNotification,
    dismissAllNotifications
  };
}

export default useNotifications;
