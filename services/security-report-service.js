const { redisClient } = require('../config/redis');
const { logSecurity } = require('./logging-service');
const notificationService = require('./real-time-notification-service');

class SecurityReportService {
    constructor() {
        this.REPORT_PREFIX = 'security_report:';
        this.REPORT_EXPIRY = 30 * 24 * 60 * 60; // 30 jours
    }

    async generateSecurityReport(userId) {
        const reportId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const report = await this.collectSecurityData(userId);
        
        // Sauvegarder le rapport
        const key = `${this.REPORT_PREFIX}${userId}:${reportId}`;
        await redisClient.set(key, JSON.stringify(report), 'EX', this.REPORT_EXPIRY);

        // Logger la génération du rapport
        logSecurity(userId, 'report_generated', 'info', {
            reportId,
            securityScore: report.securityScore
        });

        // Notifier l'utilisateur
        if (report.securityScore < 70) {
            await notificationService.sendNotification(userId, {
                type: 'security',
                title: 'Rapport de sécurité disponible',
                message: 'Votre score de sécurité nécessite votre attention',
                severity: 'warning',
                metadata: {
                    reportId,
                    securityScore: report.securityScore
                }
            });
        }

        return report;
    }

    async collectSecurityData(userId) {
        const [
            loginHistory,
            deviceInfo,
            securitySettings,
            recentIncidents
        ] = await Promise.all([
            this.getLoginHistory(userId),
            this.getDeviceInfo(userId),
            this.getSecuritySettings(userId),
            this.getRecentIncidents(userId)
        ]);

        const securityScore = this.calculateSecurityScore({
            loginHistory,
            deviceInfo,
            securitySettings,
            recentIncidents
        });

        const recommendations = this.generateRecommendations({
            loginHistory,
            deviceInfo,
            securitySettings,
            recentIncidents,
            securityScore
        });

        return {
            timestamp: new Date().toISOString(),
            securityScore,
            summary: {
                totalLogins: loginHistory.length,
                activeDevices: deviceInfo.length,
                recentIncidents: recentIncidents.length,
                securityLevel: this.getSecurityLevel(securityScore)
            },
            details: {
                loginHistory,
                deviceInfo,
                securitySettings,
                recentIncidents
            },
            recommendations,
            riskAreas: this.identifyRiskAreas({
                loginHistory,
                deviceInfo,
                securitySettings,
                recentIncidents
            })
        };
    }

    async getLoginHistory(userId, days = 30) {
        // Récupérer l'historique des connexions depuis Redis ou la base de données
        const loginPattern = `login_history:${userId}:*`;
        const keys = await redisClient.keys(loginPattern);
        const logins = [];

        for (const key of keys) {
            const login = await redisClient.get(key);
            if (login) {
                logins.push(JSON.parse(login));
            }
        }

        return logins
            .filter(login => {
                const loginDate = new Date(login.timestamp);
                const daysAgo = (Date.now() - loginDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysAgo <= days;
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    async getDeviceInfo(userId) {
        const deviceKey = `known_devices:${userId}`;
        const devices = await redisClient.smembers(deviceKey);
        return devices.map(device => {
            const [browser, browserVersion, os, osVersion, vendor, model] = device.split('|');
            return {
                browser,
                browserVersion,
                os,
                osVersion,
                vendor,
                model,
                lastSeen: new Date().toISOString() // À améliorer avec le stockage réel de la dernière utilisation
            };
        });
    }

    async getSecuritySettings(userId) {
        // Récupérer les paramètres de sécurité de l'utilisateur
        const settingsKey = `user_settings:${userId}`;
        const settings = await redisClient.get(settingsKey);
        return settings ? JSON.parse(settings) : {
            twoFactorEnabled: false,
            passwordLastChanged: null,
            notificationsEnabled: false,
            securityQuestionsSet: false
        };
    }

    async getRecentIncidents(userId, days = 30) {
        // Récupérer les incidents de sécurité récents
        const incidentPattern = `security_incident:${userId}:*`;
        const keys = await redisClient.keys(incidentPattern);
        const incidents = [];

        for (const key of keys) {
            const incident = await redisClient.get(key);
            if (incident) {
                incidents.push(JSON.parse(incident));
            }
        }

        return incidents
            .filter(incident => {
                const incidentDate = new Date(incident.timestamp);
                const daysAgo = (Date.now() - incidentDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysAgo <= days;
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    calculateSecurityScore({ loginHistory, deviceInfo, securitySettings, recentIncidents }) {
        let score = 100;

        // Paramètres de sécurité (-30 points max)
        if (!securitySettings.twoFactorEnabled) score -= 15;
        if (!securitySettings.securityQuestionsSet) score -= 5;
        if (!securitySettings.notificationsEnabled) score -= 5;
        if (!securitySettings.passwordLastChanged || this.isPasswordOld(securitySettings.passwordLastChanged)) {
            score -= 5;
        }

        // Incidents récents (-40 points max)
        const recentIncidentsScore = Math.min(40, recentIncidents.length * 10);
        score -= recentIncidentsScore;

        // Appareils multiples (-15 points max)
        if (deviceInfo.length > 5) {
            score -= Math.min(15, (deviceInfo.length - 5) * 3);
        }

        // Tentatives de connexion suspectes (-15 points max)
        const suspiciousLogins = loginHistory.filter(login => login.riskScore >= 0.7);
        score -= Math.min(15, suspiciousLogins.length * 3);

        return Math.max(0, Math.min(100, score));
    }

    generateRecommendations({ securitySettings, securityScore, recentIncidents }) {
        const recommendations = [];

        if (!securitySettings.twoFactorEnabled) {
            recommendations.push({
                priority: 'high',
                action: 'Activer la double authentification',
                impact: 'Augmente significativement la sécurité de votre compte'
            });
        }

        if (!securitySettings.securityQuestionsSet) {
            recommendations.push({
                priority: 'medium',
                action: 'Configurer les questions de sécurité',
                impact: 'Permet la récupération sécurisée du compte'
            });
        }

        if (this.isPasswordOld(securitySettings.passwordLastChanged)) {
            recommendations.push({
                priority: 'high',
                action: 'Changer votre mot de passe',
                impact: 'Réduit les risques de compromission du compte'
            });
        }

        if (recentIncidents.length > 0) {
            recommendations.push({
                priority: 'high',
                action: 'Examiner les incidents de sécurité récents',
                impact: 'Identifier et corriger les vulnérabilités'
            });
        }

        if (securityScore < 50) {
            recommendations.push({
                priority: 'critical',
                action: 'Revoir l'ensemble des paramètres de sécurité',
                impact: 'Amélioration globale de la sécurité du compte'
            });
        }

        return recommendations.sort((a, b) => {
            const priority = { critical: 0, high: 1, medium: 2, low: 3 };
            return priority[a.priority] - priority[b.priority];
        });
    }

    identifyRiskAreas({ loginHistory, deviceInfo, securitySettings, recentIncidents }) {
        const risks = [];

        // Analyse des connexions
        const suspiciousLogins = loginHistory.filter(login => login.riskScore >= 0.7);
        if (suspiciousLogins.length > 0) {
            risks.push({
                area: 'Connexions',
                level: 'high',
                details: `${suspiciousLogins.length} tentatives de connexion suspectes détectées`
            });
        }

        // Analyse des appareils
        if (deviceInfo.length > 5) {
            risks.push({
                area: 'Appareils',
                level: 'medium',
                details: `Nombre élevé d'appareils connectés (${deviceInfo.length})`
            });
        }

        // Analyse des paramètres de sécurité
        if (!securitySettings.twoFactorEnabled) {
            risks.push({
                area: 'Authentification',
                level: 'high',
                details: 'Double authentification non activée'
            });
        }

        // Analyse des incidents
        if (recentIncidents.length > 0) {
            risks.push({
                area: 'Incidents',
                level: 'high',
                details: `${recentIncidents.length} incidents de sécurité récents`
            });
        }

        return risks.sort((a, b) => {
            const level = { critical: 0, high: 1, medium: 2, low: 3 };
            return level[a.level] - level[b.level];
        });
    }

    getSecurityLevel(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 70) return 'Bon';
        if (score >= 50) return 'Moyen';
        return 'Faible';
    }

    isPasswordOld(lastChanged) {
        if (!lastChanged) return true;
        const monthsAgo = (Date.now() - new Date(lastChanged).getTime()) / (1000 * 60 * 60 * 24 * 30);
        return monthsAgo >= 3; // Considérer le mot de passe comme ancien après 3 mois
    }
}

module.exports = new SecurityReportService();
