const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const { redisClient } = require('../config/redis');
const notificationService = require('./real-time-notification-service');
const { logSecurity } = require('./logging-service');

class IntrusionDetectionService {
    constructor() {
        this.LOGIN_ATTEMPTS_PREFIX = 'login_attempts:';
        this.KNOWN_DEVICES_PREFIX = 'known_devices:';
        this.BLOCKED_IPS_PREFIX = 'blocked_ips:';
        this.MAX_LOGIN_ATTEMPTS = 5;
        this.BLOCK_DURATION = 30 * 60; // 30 minutes
        this.SUSPICIOUS_COUNTRIES = new Set(['CN', 'RU', 'KP']); // Pays considérés comme suspects
    }

    async analyzeLoginAttempt(userId, ip, userAgent) {
        const results = await Promise.all([
            this.checkLoginAttempts(ip),
            this.checkBlockedStatus(ip),
            this.analyzeLocation(ip),
            this.analyzeDevice(userId, userAgent),
            this.checkVelocityAnomaly(userId, ip)
        ]);

        const [
            loginAttempts,
            isBlocked,
            locationRisk,
            deviceRisk,
            velocityRisk
        ] = results;

        const riskScore = this.calculateRiskScore({
            loginAttempts,
            isBlocked,
            locationRisk,
            deviceRisk,
            velocityRisk
        });

        await this.logAttempt(userId, ip, userAgent, riskScore);

        return {
            allowed: riskScore < 0.7,
            riskScore,
            reasons: this.getRiskReasons(results)
        };
    }

    async checkLoginAttempts(ip) {
        const key = `${this.LOGIN_ATTEMPTS_PREFIX}${ip}`;
        const attempts = await redisClient.incr(key);
        await redisClient.expire(key, this.BLOCK_DURATION);
        
        if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
            await this.blockIP(ip);
            return 1;
        }

        return attempts / this.MAX_LOGIN_ATTEMPTS;
    }

    async checkBlockedStatus(ip) {
        const key = `${this.BLOCKED_IPS_PREFIX}${ip}`;
        return await redisClient.exists(key);
    }

    async analyzeLocation(ip) {
        const geo = geoip.lookup(ip);
        if (!geo) return 0;

        let riskScore = 0;

        // Pays suspects
        if (this.SUSPICIOUS_COUNTRIES.has(geo.country)) {
            riskScore += 0.5;
        }

        // Proxy/VPN detection (simplifié)
        if (geo.proxy) {
            riskScore += 0.3;
        }

        return Math.min(riskScore, 1);
    }

    async analyzeDevice(userId, userAgent) {
        const parser = new UAParser(userAgent);
        const deviceInfo = parser.getResult();
        const deviceKey = `${this.KNOWN_DEVICES_PREFIX}${userId}`;
        const deviceHash = this.generateDeviceHash(deviceInfo);

        const isKnownDevice = await redisClient.sismember(deviceKey, deviceHash);
        if (!isKnownDevice) {
            await redisClient.sadd(deviceKey, deviceHash);
            return 0.5; // Nouveau dispositif
        }

        return 0;
    }

    async checkVelocityAnomaly(userId, ip) {
        const key = `last_login:${userId}`;
        const lastLogin = await redisClient.get(key);
        
        if (!lastLogin) {
            await redisClient.set(key, JSON.stringify({ ip, timestamp: Date.now() }));
            return 0;
        }

        const { ip: lastIp, timestamp } = JSON.parse(lastLogin);
        const timeDiff = Date.now() - timestamp;
        const impossibleTravel = await this.checkImpossibleTravel(lastIp, ip, timeDiff);

        await redisClient.set(key, JSON.stringify({ ip, timestamp: Date.now() }));

        return impossibleTravel ? 1 : 0;
    }

    async checkImpossibleTravel(ip1, ip2, timeDiff) {
        const geo1 = geoip.lookup(ip1);
        const geo2 = geoip.lookup(ip2);

        if (!geo1 || !geo2) return false;

        const distance = this.calculateDistance(
            geo1.ll[0], geo1.ll[1],
            geo2.ll[0], geo2.ll[1]
        );

        // Vitesse maximale possible (en km/h)
        const MAX_SPEED = 1000;
        const hours = timeDiff / (1000 * 60 * 60);
        const speed = distance / hours;

        return speed > MAX_SPEED;
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

    generateDeviceHash(deviceInfo) {
        const { browser, os, device } = deviceInfo;
        return `${browser.name}|${browser.version}|${os.name}|${os.version}|${device.vendor}|${device.model}`;
    }

    calculateRiskScore({ loginAttempts, isBlocked, locationRisk, deviceRisk, velocityRisk }) {
        if (isBlocked) return 1;

        return Math.min(
            1,
            loginAttempts * 0.3 +
            locationRisk * 0.3 +
            deviceRisk * 0.2 +
            velocityRisk * 0.2
        );
    }

    getRiskReasons(results) {
        const [
            loginAttempts,
            isBlocked,
            locationRisk,
            deviceRisk,
            velocityRisk
        ] = results;

        const reasons = [];

        if (isBlocked) reasons.push('IP bloquée');
        if (loginAttempts > 0.6) reasons.push('Trop de tentatives de connexion');
        if (locationRisk > 0.3) reasons.push('Localisation suspecte');
        if (deviceRisk > 0) reasons.push('Nouvel appareil');
        if (velocityRisk > 0) reasons.push('Déplacement impossible');

        return reasons;
    }

    async blockIP(ip) {
        const key = `${this.BLOCKED_IPS_PREFIX}${ip}`;
        await redisClient.set(key, '1', 'EX', this.BLOCK_DURATION);
    }

    async logAttempt(userId, ip, userAgent, riskScore) {
        const geo = geoip.lookup(ip);
        const parser = new UAParser(userAgent);
        const deviceInfo = parser.getResult();

        const logData = {
            userId,
            ip,
            location: geo ? `${geo.city}, ${geo.country}` : 'Unknown',
            deviceInfo: {
                browser: `${deviceInfo.browser.name} ${deviceInfo.browser.version}`,
                os: `${deviceInfo.os.name} ${deviceInfo.os.version}`,
                device: deviceInfo.device.type || 'desktop'
            },
            riskScore,
            timestamp: new Date().toISOString()
        };

        // Logger l'événement
        logSecurity(userId, 'login_attempt', riskScore >= 0.7 ? 'warning' : 'info', logData);

        // Notifier l'utilisateur si le risque est élevé
        if (riskScore >= 0.7) {
            await notificationService.notifySuspiciousActivity(
                userId,
                'Tentative de connexion suspecte',
                logData.location
            );
        }
    }
}

module.exports = new IntrusionDetectionService();
