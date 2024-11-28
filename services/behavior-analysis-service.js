const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const redis = require('../config/redis');
const { logSecurity } = require('./logging-service');

class BehaviorAnalysisService {
    constructor() {
        this.redis = redis;
        this.VELOCITY_WINDOW = 3600; // 1 heure
        this.MAX_LOGIN_VELOCITY = 10; // max 10 tentatives par heure
        this.LOCATION_CHANGE_THRESHOLD = 500; // km
    }

    async analyzeLoginAttempt(userId, ip, userAgent) {
        try {
            const riskFactors = [];
            let riskScore = 0;

            // Analyse de l'agent utilisateur
            const parser = new UAParser(userAgent);
            const deviceInfo = parser.getResult();

            // Analyse de la géolocalisation
            const geo = geoip.lookup(ip);
            if (!geo) {
                riskFactors.push('location_unknown');
                riskScore += 0.3;
            }

            // Vérifier les changements de localisation
            const lastLocation = await this.getLastLocation(userId);
            if (lastLocation && geo) {
                const distance = this.calculateDistance(
                    lastLocation.ll[0], lastLocation.ll[1],
                    geo.ll[0], geo.ll[1]
                );

                if (distance > this.LOCATION_CHANGE_THRESHOLD) {
                    riskFactors.push('location_change');
                    riskScore += 0.4;
                }
            }

            // Analyse de la vélocité des connexions
            const loginVelocity = await this.checkLoginVelocity(userId);
            if (loginVelocity > this.MAX_LOGIN_VELOCITY) {
                riskFactors.push('high_velocity');
                riskScore += 0.5;
            }

            // Vérification des appareils connus
            const isKnownDevice = await this.isKnownDevice(userId, deviceInfo);
            if (!isKnownDevice) {
                riskFactors.push('unknown_device');
                riskScore += 0.2;
            }

            // Vérification des heures habituelles
            const isUnusualTime = await this.isUnusualLoginTime(userId);
            if (isUnusualTime) {
                riskFactors.push('unusual_time');
                riskScore += 0.2;
            }

            // Enregistrer l'activité pour analyse future
            await this.recordLoginActivity(userId, {
                ip,
                geo,
                deviceInfo,
                timestamp: new Date(),
                riskScore,
                riskFactors
            });

            return {
                riskScore,
                riskFactors,
                requiresVerification: riskScore > 0.7,
                location: geo,
                device: deviceInfo
            };
        } catch (error) {
            console.error('Error analyzing login attempt:', error);
            throw error;
        }
    }

    async checkLoginVelocity(userId) {
        const key = `login_attempts:${userId}`;
        const now = Date.now();
        const windowStart = now - (this.VELOCITY_WINDOW * 1000);

        // Ajouter la tentative actuelle
        await this.redis.zadd(key, now, now.toString());
        // Supprimer les anciennes tentatives
        await this.redis.zremrangebyscore(key, 0, windowStart);
        // Compter les tentatives dans la fenêtre
        return await this.redis.zcard(key);
    }

    async isKnownDevice(userId, deviceInfo) {
        const devices = await this.redis.get(`known_devices:${userId}`);
        if (!devices) return false;

        const knownDevices = JSON.parse(devices);
        return knownDevices.some(device => 
            device.ua.browser.name === deviceInfo.browser.name &&
            device.ua.os.name === deviceInfo.os.name
        );
    }

    async isUnusualLoginTime(userId) {
        const now = new Date();
        const hour = now.getHours();

        // Charger l'historique des heures de connexion
        const loginHours = await this.redis.get(`login_hours:${userId}`);
        if (!loginHours) return false;

        const hours = JSON.parse(loginHours);
        // Considérer comme inhabituel si moins de 5% des connexions à cette heure
        return (hours[hour] || 0) < (hours.total * 0.05);
    }

    async recordLoginActivity(userId, activity) {
        try {
            // Enregistrer l'activité
            const key = `login_activity:${userId}`;
            const activities = JSON.parse(await this.redis.get(key) || '[]');
            activities.unshift(activity);
            // Garder seulement les 100 dernières activités
            activities.splice(100);
            await this.redis.set(key, JSON.stringify(activities));

            // Mettre à jour les statistiques d'heure de connexion
            const hour = new Date().getHours();
            const hoursKey = `login_hours:${userId}`;
            const hours = JSON.parse(await this.redis.get(hoursKey) || '{"total":0}');
            hours[hour] = (hours[hour] || 0) + 1;
            hours.total = (hours.total || 0) + 1;
            await this.redis.set(hoursKey, JSON.stringify(hours));

            // Logger l'activité si risquée
            if (activity.riskScore > 0.7) {
                logSecurity(userId, 'high_risk_login_attempt', 'warning', {
                    riskScore: activity.riskScore,
                    riskFactors: activity.riskFactors,
                    location: activity.geo,
                    device: activity.deviceInfo
                });
            }
        } catch (error) {
            console.error('Error recording login activity:', error);
            throw error;
        }
    }

    async getLastLocation(userId) {
        const activities = JSON.parse(
            await this.redis.get(`login_activity:${userId}`) || '[]'
        );
        return activities[0]?.geo || null;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Rayon de la Terre en km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(value) {
        return value * Math.PI / 180;
    }

    async analyzeUserBehavior(userId, timeWindow = 24 * 60 * 60 * 1000) { // 24h par défaut
        try {
            const activities = JSON.parse(
                await this.redis.get(`login_activity:${userId}`) || '[]'
            );

            const now = Date.now();
            const windowStart = now - timeWindow;

            // Filtrer les activités dans la fenêtre de temps
            const recentActivities = activities.filter(
                activity => new Date(activity.timestamp).getTime() > windowStart
            );

            // Analyser les patterns
            const analysis = {
                totalAttempts: recentActivities.length,
                uniqueLocations: new Set(
                    recentActivities.map(a => a.geo?.country).filter(Boolean)
                ).size,
                uniqueDevices: new Set(
                    recentActivities.map(a => 
                        `${a.deviceInfo.browser.name}-${a.deviceInfo.os.name}`
                    )
                ).size,
                averageRiskScore: recentActivities.reduce(
                    (acc, curr) => acc + curr.riskScore, 0
                ) / recentActivities.length || 0,
                riskFactorFrequency: recentActivities.reduce((acc, curr) => {
                    curr.riskFactors.forEach(factor => {
                        acc[factor] = (acc[factor] || 0) + 1;
                    });
                    return acc;
                }, {}),
                timeDistribution: recentActivities.reduce((acc, curr) => {
                    const hour = new Date(curr.timestamp).getHours();
                    acc[hour] = (acc[hour] || 0) + 1;
                    return acc;
                }, {})
            };

            // Calculer le score de risque global
            const riskIndicators = [
                analysis.uniqueLocations > 3 ? 0.3 : 0,
                analysis.uniqueDevices > 3 ? 0.3 : 0,
                analysis.averageRiskScore,
                analysis.totalAttempts > 20 ? 0.2 : 0
            ];

            analysis.globalRiskScore = riskIndicators.reduce((a, b) => a + b, 0);

            return analysis;
        } catch (error) {
            console.error('Error analyzing user behavior:', error);
            throw error;
        }
    }
}

module.exports = new BehaviorAnalysisService();
