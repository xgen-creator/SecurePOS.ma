// pushNotificationService.js
const admin = require('firebase-admin');
const webpush = require('web-push');

class PushNotificationService {
  constructor() {
    this.initialize();
    this.notificationQueue = new Map();
    this.retryAttempts = 3;
  }

  initialize() {
    // Initialiser Firebase Admin
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID
    });

    // Configurer Web Push
    webpush.setVapidDetails(
      'mailto:support@scanbell.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  async sendNotification(userId, notification, options = {}) {
    try {
      const userDevices = await this.getUserDevices(userId);
      const notificationId = this.generateNotificationId();

      // Préparer la notification
      const payload = this.prepareNotificationPayload(notification);

      // Envoyer à tous les appareils de l'utilisateur
      const sendPromises = userDevices.map(device => 
        this.sendToDevice(device, payload, options)
      );

      // Gérer les résultats
      const results = await Promise.allSettled(sendPromises);
      await this.handleSendResults(results, userId, notificationId);

      return {
        success: true,
        notificationId,
        delivered: results.filter(r => r.status === 'fulfilled').length
      };
    } catch (error) {
      console.error('Erreur envoi notification:', error);
      throw error;
    }
  }

  prepareNotificationPayload(notification) {
    return {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon.png',
        badge: notification.badge || '/badge.png',
        vibrate: notification.vibrate || [100, 50, 100],
        data: {
          ...notification.data,
          timestamp: Date.now()
        },
        actions: notification.actions || []
      }
    };
  }

  async sendToDevice(device, payload, options) {
    switch (device.type) {
      case 'android':
      case 'ios':
        return await admin.messaging().send({
          token: device.token,
          ...payload,
          android: options.android,
          apns: options.apns
        });

      case 'web':
        return await webpush.sendNotification(
          device.subscription,
          JSON.stringify(payload)
        );
    }
  }

  async handleSendResults(results, userId, notificationId) {
    const failedDeliveries = results
      .filter(r => r.status === 'rejected')
      .length;

    if (failedDeliveries > 0) {
      await this.queueForRetry({
        userId,
        notificationId,
        failedCount: failedDeliveries
      });
    }

    // Enregistrer les statistiques
    await this.logNotificationStats({
      notificationId,
      userId,
      totalDevices: results.length,
      successCount: results.length - failedDeliveries,
      failedCount: failedDeliveries,
      timestamp: new Date()
    });
  }

  async queueForRetry(notificationInfo) {
    const retryDelay = Math.pow(2, notificationInfo.attempts || 0) * 1000;
    
    setTimeout(async () => {
      try {
        await this.retryFailedNotification(notificationInfo);
      } catch (error) {
        console.error('Erreur retry notification:', error);
      }
    }, retryDelay);
  }

  async scheduleNotification(notification, scheduledTime) {
    const delay = scheduledTime - Date.now();
    if (delay < 0) return;

    setTimeout(async () => {
      await this.sendNotification(
        notification.userId,
        notification,
        notification.options
      );
    }, delay);
  }
}

export default new PushNotificationService();
