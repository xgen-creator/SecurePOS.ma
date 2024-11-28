const socketIo = require('socket.io');
const { redisClient } = require('../config/redis');
const { logSecurity } = require('./logging-service');

class RealTimeNotificationService {
    constructor() {
        this.io = null;
        this.userSockets = new Map(); // userId -> Set of socket ids
        this.NOTIFICATION_PREFIX = 'notification:';
        this.NOTIFICATION_EXPIRY = 30 * 24 * 60 * 60; // 30 jours
    }

    initialize(server) {
        this.io = socketIo(server, {
            cors: {
                origin: process.env.CLIENT_URL,
                methods: ['GET', 'POST']
            }
        });

        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    async handleConnection(socket) {
        const userId = socket.handshake.auth.userId;
        if (!userId) return;

        // Ajouter le socket à la collection de l'utilisateur
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socket.id);

        // Charger les notifications non lues
        const notifications = await this.getUnreadNotifications(userId);
        socket.emit('notifications:unread', notifications);

        socket.on('disconnect', () => {
            const userSockets = this.userSockets.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    this.userSockets.delete(userId);
                }
            }
        });

        socket.on('notifications:read', async (notificationId) => {
            await this.markAsRead(userId, notificationId);
        });

        socket.on('notifications:readAll', async () => {
            await this.markAllAsRead(userId);
        });
    }

    async sendNotification(userId, notification) {
        const notificationData = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            read: false,
            ...notification
        };

        // Sauvegarder la notification
        const key = `${this.NOTIFICATION_PREFIX}${userId}:${notificationData.id}`;
        await redisClient.set(key, JSON.stringify(notificationData), 'EX', this.NOTIFICATION_EXPIRY);

        // Ajouter à l'index des notifications de l'utilisateur
        const userNotificationsKey = `${this.NOTIFICATION_PREFIX}${userId}`;
        await redisClient.zadd(userNotificationsKey, Date.now(), notificationData.id);

        // Envoyer en temps réel si l'utilisateur est connecté
        const userSockets = this.userSockets.get(userId);
        if (userSockets) {
            userSockets.forEach(socketId => {
                this.io.to(socketId).emit('notification:new', notificationData);
            });
        }

        // Logger l'événement
        logSecurity(userId, 'notification_sent', 'info', {
            notificationId: notificationData.id,
            type: notification.type
        });

        return notificationData;
    }

    async getUnreadNotifications(userId) {
        const userNotificationsKey = `${this.NOTIFICATION_PREFIX}${userId}`;
        const notificationIds = await redisClient.zrange(userNotificationsKey, 0, -1);
        const notifications = [];

        for (const notificationId of notificationIds) {
            const key = `${this.NOTIFICATION_PREFIX}${userId}:${notificationId}`;
            const notification = await redisClient.get(key);
            if (notification) {
                const parsedNotification = JSON.parse(notification);
                if (!parsedNotification.read) {
                    notifications.push(parsedNotification);
                }
            }
        }

        return notifications;
    }

    async markAsRead(userId, notificationId) {
        const key = `${this.NOTIFICATION_PREFIX}${userId}:${notificationId}`;
        const notification = await redisClient.get(key);
        
        if (notification) {
            const parsedNotification = JSON.parse(notification);
            parsedNotification.read = true;
            await redisClient.set(key, JSON.stringify(parsedNotification), 'EX', this.NOTIFICATION_EXPIRY);

            // Notifier les clients connectés
            const userSockets = this.userSockets.get(userId);
            if (userSockets) {
                userSockets.forEach(socketId => {
                    this.io.to(socketId).emit('notification:read', notificationId);
                });
            }
        }
    }

    async markAllAsRead(userId) {
        const userNotificationsKey = `${this.NOTIFICATION_PREFIX}${userId}`;
        const notificationIds = await redisClient.zrange(userNotificationsKey, 0, -1);

        for (const notificationId of notificationIds) {
            await this.markAsRead(userId, notificationId);
        }

        // Notifier les clients connectés
        const userSockets = this.userSockets.get(userId);
        if (userSockets) {
            userSockets.forEach(socketId => {
                this.io.to(socketId).emit('notifications:allRead');
            });
        }
    }

    async getNotificationHistory(userId, page = 1, limit = 20) {
        const userNotificationsKey = `${this.NOTIFICATION_PREFIX}${userId}`;
        const start = (page - 1) * limit;
        const end = start + limit - 1;

        const notificationIds = await redisClient.zrevrange(userNotificationsKey, start, end);
        const notifications = [];

        for (const notificationId of notificationIds) {
            const key = `${this.NOTIFICATION_PREFIX}${userId}:${notificationId}`;
            const notification = await redisClient.get(key);
            if (notification) {
                notifications.push(JSON.parse(notification));
            }
        }

        const total = await redisClient.zcard(userNotificationsKey);

        return {
            notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async deleteNotification(userId, notificationId) {
        const key = `${this.NOTIFICATION_PREFIX}${userId}:${notificationId}`;
        const userNotificationsKey = `${this.NOTIFICATION_PREFIX}${userId}`;

        await Promise.all([
            redisClient.del(key),
            redisClient.zrem(userNotificationsKey, notificationId)
        ]);

        // Notifier les clients connectés
        const userSockets = this.userSockets.get(userId);
        if (userSockets) {
            userSockets.forEach(socketId => {
                this.io.to(socketId).emit('notification:deleted', notificationId);
            });
        }
    }

    // Méthodes utilitaires pour différents types de notifications
    async notifyNewLogin(userId, deviceInfo, location) {
        return this.sendNotification(userId, {
            type: 'security',
            title: 'Nouvelle connexion détectée',
            message: `Connexion depuis ${deviceInfo.browser} à ${location}`,
            severity: 'info',
            metadata: { deviceInfo, location }
        });
    }

    async notifySuspiciousActivity(userId, activity, location) {
        return this.sendNotification(userId, {
            type: 'security',
            title: 'Activité suspecte détectée',
            message: `${activity} détectée depuis ${location}`,
            severity: 'warning',
            metadata: { activity, location }
        });
    }

    async notifySecurityEvent(userId, event, details) {
        return this.sendNotification(userId, {
            type: 'security',
            title: 'Événement de sécurité',
            message: event,
            severity: 'info',
            metadata: details
        });
    }

    async notifyPasswordChanged(userId) {
        return this.sendNotification(userId, {
            type: 'security',
            title: 'Mot de passe modifié',
            message: 'Votre mot de passe a été modifié avec succès',
            severity: 'success'
        });
    }

    async notifyTwoFactorEnabled(userId) {
        return this.sendNotification(userId, {
            type: 'security',
            title: 'Double authentification activée',
            message: 'La double authentification a été activée sur votre compte',
            severity: 'success'
        });
    }
}

module.exports = new RealTimeNotificationService();
