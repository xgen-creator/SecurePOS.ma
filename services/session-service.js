const { redisClient } = require('../config/redis');
const { logSecurity } = require('./logging-service');
const { getTrustedDeviceInfo } = require('./trusted-device-service');
const jwt = require('jsonwebtoken');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');

class SessionService {
    constructor() {
        this.SESSION_PREFIX = 'session:';
        this.SESSION_EXPIRY = 24 * 60 * 60; // 24 heures
    }

    /**
     * Crée une nouvelle session
     */
    async createSession(userId, userAgent, ip) {
        const sessionId = jwt.sign({ userId, timestamp: Date.now() }, process.env.JWT_SECRET);
        const parser = new UAParser(userAgent);
        const result = parser.getResult();
        const geo = geoip.lookup(ip);
        
        const deviceInfo = {
            browser: `${result.browser.name} ${result.browser.version}`,
            os: `${result.os.name} ${result.os.version}`,
            device: result.device.type || 'desktop'
        };

        const sessionData = {
            id: sessionId,
            userId,
            deviceInfo,
            ip,
            location: geo ? `${geo.city}, ${geo.country}` : 'Unknown',
            startTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        const key = `${this.SESSION_PREFIX}${sessionId}`;
        await redisClient.set(key, JSON.stringify(sessionData), 'EX', this.SESSION_EXPIRY);

        // Ajouter à l'index des sessions de l'utilisateur
        const userSessionsKey = `${this.SESSION_PREFIX}user:${userId}`;
        await redisClient.sadd(userSessionsKey, sessionId);

        logSecurity(userId, 'session_created', 'info', {
            sessionId,
            deviceInfo,
            location: sessionData.location
        });

        return sessionData;
    }

    /**
     * Récupère une session par son ID
     */
    async getSession(sessionId) {
        const key = `${this.SESSION_PREFIX}${sessionId}`;
        const session = await redisClient.get(key);
        return session ? JSON.parse(session) : null;
    }

    /**
     * Met à jour l'activité d'une session
     */
    async updateSessionActivity(sessionId) {
        const key = `${this.SESSION_PREFIX}${sessionId}`;
        const session = await this.getSession(sessionId);
        
        if (session) {
            session.lastActivity = new Date().toISOString();
            await redisClient.set(key, JSON.stringify(session), 'EX', this.SESSION_EXPIRY);
        }
    }

    /**
     * Récupère toutes les sessions actives d'un utilisateur
     */
    async getUserSessions(userId, currentSessionId = null) {
        const userSessionsKey = `${this.SESSION_PREFIX}user:${userId}`;
        const sessionIds = await redisClient.smembers(userSessionsKey);
        const sessions = [];

        for (const sessionId of sessionIds) {
            const session = await this.getSession(sessionId);
            if (session) {
                sessions.push({
                    ...session,
                    isCurrent: sessionId === currentSessionId
                });
            } else {
                // Nettoyer les sessions expirées
                await redisClient.srem(userSessionsKey, sessionId);
            }
        }

        return sessions;
    }

    /**
     * Termine une session spécifique
     */
    async terminateSession(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session) return false;

        const key = `${this.SESSION_PREFIX}${sessionId}`;
        const userSessionsKey = `${this.SESSION_PREFIX}user:${session.userId}`;

        await Promise.all([
            redisClient.del(key),
            redisClient.srem(userSessionsKey, sessionId)
        ]);

        logSecurity(session.userId, 'session_terminated', 'warning', {
            sessionId,
            deviceInfo: session.deviceInfo
        });

        return true;
    }

    /**
     * Termine toutes les sessions d'un utilisateur sauf la session courante
     */
    async terminateOtherSessions(userId, currentSessionId) {
        const sessions = await this.getUserSessions(userId);
        const terminationPromises = sessions
            .filter(session => session.id !== currentSessionId)
            .map(session => this.terminateSession(session.id));

        await Promise.all(terminationPromises);

        logSecurity(userId, 'all_other_sessions_terminated', 'warning', {
            currentSessionId
        });
    }

    /**
     * Vérifie si une session est valide
     */
    async isValidSession(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session) return false;

        // Vérifier si l'appareil est toujours de confiance
        const deviceInfo = await getTrustedDeviceInfo(session.userId, session.deviceInfo);
        return !!deviceInfo;
    }

    /**
     * Nettoie les sessions expirées
     */
    async cleanupExpiredSessions() {
        // Cette méthode peut être appelée périodiquement par un job
        const pattern = `${this.SESSION_PREFIX}*`;
        const keys = await redisClient.keys(pattern);
        
        for (const key of keys) {
            const session = await redisClient.get(key);
            if (!session) {
                const sessionId = key.replace(this.SESSION_PREFIX, '');
                await this.terminateSession(sessionId);
            }
        }
    }
}

module.exports = new SessionService();
