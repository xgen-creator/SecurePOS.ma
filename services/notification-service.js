const webpush = require('web-push');
const firebase = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

class NotificationService {
    constructor() {
        // Configuration Web Push
        webpush.setVapidDetails(
            'mailto:support@scanbell.com',
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );

        // Configuration Firebase
        firebase.initializeApp({
            credential: firebase.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY
            })
        });

        // Configuration Expo
        this.expo = new Expo();
        
        // Cache des préférences utilisateur
        this.userPreferences = new Map();
    }

    async registerDevice(userId, deviceToken, platform) {
        try {
            await firebase.firestore().collection('devices').add({
                userId,
                deviceToken,
                platform,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Erreur enregistrement device:', error);
            return false;
        }
    }

    async getUserPreferences(userId) {
        if (this.userPreferences.has(userId)) {
            return this.userPreferences.get(userId);
        }

        const doc = await firebase.firestore()
            .collection('userPreferences')
            .doc(userId)
            .get();

        const prefs = doc.data() || {
            doNotDisturb: false,
            doNotDisturbStart: '22:00',
            doNotDisturbEnd: '07:00',
            notificationTypes: {
                visits: true,
                deliveries: true,
                messages: true,
                calls: true
            }
        };

        this.userPreferences.set(userId, prefs);
        return prefs;
    }

    async updatePreferences(userId, preferences) {
        await firebase.firestore()
            .collection('userPreferences')
            .doc(userId)
            .set(preferences, { merge: true });
        
        this.userPreferences.set(userId, preferences);
    }

    async sendNotification(userId, notification) {
        try {
            const prefs = await this.getUserPreferences(userId);
            
            // Vérifier le mode Ne pas déranger
            if (this.isInDoNotDisturbPeriod(prefs)) {
                if (!notification.priority === 'high') {
                    return false;
                }
            }

            // Vérifier si le type de notification est activé
            if (!prefs.notificationTypes[notification.type]) {
                return false;
            }

            const devices = await this.getUserDevices(userId);
            const promises = devices.map(device => {
                switch (device.platform) {
                    case 'web':
                        return this.sendWebPushNotification(device.token, notification);
                    case 'ios':
                    case 'android':
                        return this.sendMobileNotification(device.token, notification);
                    case 'expo':
                        return this.sendExpoNotification(device.token, notification);
                }
            });

            await Promise.all(promises);
            await this.logNotification(userId, notification);
            return true;
        } catch (error) {
            console.error('Erreur envoi notification:', error);
            return false;
        }
    }

    async sendWebPushNotification(subscription, notification) {
        const payload = JSON.stringify({
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/icons/notification.png',
            badge: notification.badge || '/icons/badge.png',
            data: notification.data
        });

        try {
            await webpush.sendNotification(subscription, payload);
            return true;
        } catch (error) {
            console.error('Erreur web push:', error);
            return false;
        }
    }

    async sendMobileNotification(token, notification) {
        try {
            await firebase.messaging().send({
                token,
                notification: {
                    title: notification.title,
                    body: notification.body
                },
                data: notification.data,
                android: {
                    priority: notification.priority === 'high' ? 'high' : 'normal',
                    notification: {
                        icon: notification.icon,
                        color: '#4A90E2',
                        sound: notification.sound || 'default'
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: notification.sound || 'default',
                            badge: 1
                        }
                    }
                }
            });
            return true;
        } catch (error) {
            console.error('Erreur firebase push:', error);
            return false;
        }
    }

    async sendExpoNotification(token, notification) {
        if (!Expo.isExpoPushToken(token)) {
            console.error(`Token Expo invalide ${token}`);
            return false;
        }

        const message = {
            to: token,
            sound: notification.sound || 'default',
            title: notification.title,
            body: notification.body,
            data: notification.data,
            priority: notification.priority === 'high' ? 'high' : 'default'
        };

        try {
            const chunks = this.expo.chunkPushNotifications([message]);
            for (let chunk of chunks) {
                await this.expo.sendPushNotificationsAsync(chunk);
            }
            return true;
        } catch (error) {
            console.error('Erreur expo push:', error);
            return false;
        }
    }

    isInDoNotDisturbPeriod(preferences) {
        if (!preferences.doNotDisturb) return false;

        const now = new Date();
        const currentTime = now.getHours() * 100 + now.getMinutes();
        
        const start = parseInt(preferences.doNotDisturbStart.replace(':', ''));
        const end = parseInt(preferences.doNotDisturbEnd.replace(':', ''));
        
        if (start < end) {
            return currentTime >= start && currentTime < end;
        } else {
            return currentTime >= start || currentTime < end;
        }
    }

    async getUserDevices(userId) {
        const snapshot = await firebase.firestore()
            .collection('devices')
            .where('userId', '==', userId)
            .get();

        return snapshot.docs.map(doc => doc.data());
    }

    async logNotification(userId, notification) {
        await firebase.firestore().collection('notificationLogs').add({
            userId,
            notification,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

module.exports = new NotificationService();
