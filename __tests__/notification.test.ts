import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { NotificationService } from '../services/notification-service';
import { PushNotification } from '../models/push-notification.model';
import { User } from '../models/user.model';

jest.mock('../services/push-service');

describe('Notification Service', () => {
  let testUser: any;
  
  beforeEach(() => {
    testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      notificationSettings: {
        push: true,
        email: true,
        sms: false
      }
    };
  });

  describe('Push Notifications', () => {
    test('should send push notification successfully', async () => {
      const notification = {
        title: 'Test Notification',
        body: 'This is a test notification',
        userId: testUser.id,
        type: 'VISITOR_DETECTED'
      };

      const result = await NotificationService.sendPushNotification(notification);
      expect(result.success).toBeTruthy();
      expect(result.notificationId).toBeDefined();
    });

    test('should respect user notification preferences', async () => {
      testUser.notificationSettings.push = false;
      
      const notification = {
        title: 'Test Notification',
        body: 'This should not be sent',
        userId: testUser.id,
        type: 'VISITOR_DETECTED'
      };

      const result = await NotificationService.sendPushNotification(notification);
      expect(result.success).toBeFalsy();
      expect(result.reason).toBe('Push notifications disabled by user');
    });

    test('should handle multiple device tokens', async () => {
      const devices = ['token1', 'token2', 'token3'];
      const notification = {
        title: 'Multi-device Test',
        body: 'Should be sent to all devices',
        userId: testUser.id,
        type: 'SECURITY_ALERT'
      };

      const results = await NotificationService.sendToMultipleDevices(testUser.id, notification);
      expect(results.length).toBe(devices.length);
      expect(results.every(r => r.success)).toBeTruthy();
    });
  });

  describe('Email Notifications', () => {
    test('should send email notification successfully', async () => {
      const emailData = {
        to: testUser.email,
        subject: 'Test Email',
        template: 'visitor-alert',
        context: {
          visitorName: 'John Doe',
          timestamp: new Date().toISOString()
        }
      };

      const result = await NotificationService.sendEmailNotification(emailData);
      expect(result.success).toBeTruthy();
      expect(result.messageId).toBeDefined();
    });

    test('should handle email template rendering', async () => {
      const template = await NotificationService.renderEmailTemplate('visitor-alert', {
        visitorName: 'John Doe',
        timestamp: new Date().toISOString()
      });

      expect(template).toContain('John Doe');
      expect(template).toContain('visitor-alert');
    });
  });

  describe('Notification History', () => {
    test('should store notification in history', async () => {
      const notification = {
        title: 'History Test',
        body: 'Test notification for history',
        userId: testUser.id,
        type: 'TEST'
      };

      await NotificationService.sendPushNotification(notification);
      
      const history = await NotificationService.getNotificationHistory(testUser.id);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].title).toBe(notification.title);
    });

    test('should clean up old notifications', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31); // 31 days old

      await PushNotification.create({
        title: 'Old Notification',
        body: 'Should be cleaned up',
        userId: testUser.id,
        createdAt: oldDate
      });

      await NotificationService.cleanupOldNotifications();
      
      const oldNotification = await PushNotification.findOne({
        title: 'Old Notification'
      });
      expect(oldNotification).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle failed push notification', async () => {
      const notification = {
        title: 'Error Test',
        body: 'Should handle error',
        userId: 'invalid-user-id',
        type: 'TEST'
      };

      await expect(NotificationService.sendPushNotification(notification))
        .rejects.toThrow('User not found');
    });

    test('should handle invalid email templates', async () => {
      await expect(NotificationService.renderEmailTemplate('non-existent', {}))
        .rejects.toThrow('Template not found');
    });

    test('should handle notification rate limiting', async () => {
      const notifications = Array(11).fill({
        title: 'Rate Limit Test',
        body: 'Should be rate limited',
        userId: testUser.id,
        type: 'TEST'
      });

      const results = await Promise.all(
        notifications.map(n => NotificationService.sendPushNotification(n))
      );

      const rateLimited = results.filter(r => !r.success);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});
