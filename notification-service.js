// notificationService.js
const admin = require('firebase-admin');
const AWS = require('aws-sdk');
const sns = new AWS.SNS();

class NotificationService {
  constructor() {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }

  async sendPushNotification(userId, notification) {
    try {
      const user = await User.findById(userId);
      if (user.deviceToken) {
        await admin.messaging().send({
          token: user.deviceToken,
          notification: {
            title: notification.title,
            body: notification.body
          },
          data: notification.data
        });
      }
    } catch (error) {
      console.error('Erreur notification push:', error);
    }
  }

  async sendSMS(phoneNumber, message) {
    const params = {
      Message: message,
      PhoneNumber: phoneNumber
    };
    try {
      await sns.publish(params).promise();
    } catch (error) {
      console.error('Erreur SMS:', error);
    }
  }

  async handleDoorbell(deviceId) {
    const device = await Device.findOne({ deviceId });
    if (device) {
      const notification = {
        title: 'Visiteur à la porte',
        body: 'Quelqu\'un sonne à votre porte',
        data: {
          type: 'DOORBELL',
          deviceId: deviceId
        }
      };
      await this.sendPushNotification(device.owner, notification);
    }
  }

  async handleDelivery(deviceId, courier) {
    const device = await Device.findOne({ deviceId });
    if (device) {
      const notification = {
        title: 'Livraison en cours',
        body: `${courier} est à votre porte`,
        data: {
          type: 'DELIVERY',
          deviceId: deviceId,
          courier: courier
        }
      };
      await this.sendPushNotification(device.owner, notification);
    }
  }
}

module.exports = new NotificationService();
