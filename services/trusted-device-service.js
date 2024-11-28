const { redisClient } = require('../config/redis');
const { logSecurity } = require('./logging-service');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');

class TrustedDeviceService {
    constructor() {
        this.DEVICE_PREFIX = 'trusted_device:';
        this.DEVICE_EXPIRY = 30 * 24 * 60 * 60; // 30 jours
    }

    /**
     * Génère un identifiant unique pour l'appareil
     */
    generateDeviceId(userAgent, ip) {
        const parser = new UAParser(userAgent);
        const result = parser.getResult();
        const deviceInfo = {
            browser: result.browser.name,
            os: result.os.name,
            device: result.device.type || 'desktop',
            ip: ip
        };
        return Buffer.from(JSON.stringify(deviceInfo)).toString('base64');
    }

    /**
     * Vérifie si l'appareil est de confiance
     */
    async isTrustedDevice(userId, deviceId) {
        const key = `${this.DEVICE_PREFIX}${userId}:${deviceId}`;
        const device = await redisClient.get(key);
        return !!device;
    }

    /**
     * Ajoute un appareil de confiance
     */
    async addTrustedDevice(userId, userAgent, ip) {
        const deviceId = this.generateDeviceId(userAgent, ip);
        const key = `${this.DEVICE_PREFIX}${userId}:${deviceId}`;
        
        const parser = new UAParser(userAgent);
        const result = parser.getResult();
        const geo = geoip.lookup(ip);
        
        const deviceInfo = {
            id: deviceId,
            browser: `${result.browser.name} ${result.browser.version}`,
            os: `${result.os.name} ${result.os.version}`,
            device: result.device.type || 'desktop',
            ip: ip,
            location: geo ? `${geo.city}, ${geo.country}` : 'Unknown',
            lastUsed: new Date().toISOString(),
            trusted: true
        };

        await redisClient.set(key, JSON.stringify(deviceInfo), 'EX', this.DEVICE_EXPIRY);
        
        logSecurity(userId, 'device_trusted', 'info', {
            deviceId,
            deviceInfo
        });

        return deviceInfo;
    }

    /**
     * Révoque un appareil de confiance
     */
    async revokeTrustedDevice(userId, deviceId) {
        const key = `${this.DEVICE_PREFIX}${userId}:${deviceId}`;
        await redisClient.del(key);
        
        logSecurity(userId, 'device_revoked', 'warning', {
            deviceId
        });
    }

    /**
     * Liste tous les appareils de confiance d'un utilisateur
     */
    async listTrustedDevices(userId) {
        const pattern = `${this.DEVICE_PREFIX}${userId}:*`;
        const keys = await redisClient.keys(pattern);
        const devices = [];

        for (const key of keys) {
            const device = await redisClient.get(key);
            if (device) {
                devices.push(JSON.parse(device));
            }
        }

        return devices;
    }

    /**
     * Met à jour les informations d'un appareil de confiance
     */
    async updateDeviceInfo(userId, deviceId, userAgent, ip) {
        const key = `${this.DEVICE_PREFIX}${userId}:${deviceId}`;
        const deviceData = await redisClient.get(key);
        
        if (!deviceData) return null;

        const device = JSON.parse(deviceData);
        const geo = geoip.lookup(ip);
        
        const updatedDevice = {
            ...device,
            ip: ip,
            location: geo ? `${geo.city}, ${geo.country}` : 'Unknown',
            lastUsed: new Date().toISOString()
        };

        await redisClient.set(key, JSON.stringify(updatedDevice), 'EX', this.DEVICE_EXPIRY);
        return updatedDevice;
    }

    /**
     * Vérifie si une connexion est suspecte
     */
    async isSuspiciousLogin(userId, userAgent, ip) {
        const deviceId = this.generateDeviceId(userAgent, ip);
        const device = await this.isTrustedDevice(userId, deviceId);

        if (!device) {
            const geo = geoip.lookup(ip);
            const devices = await this.listTrustedDevices(userId);
            
            // Vérifie si la localisation est différente des appareils de confiance
            const suspiciousLocation = devices.some(d => {
                const deviceGeo = geoip.lookup(d.ip);
                return deviceGeo && geo && deviceGeo.country !== geo.country;
            });

            if (suspiciousLocation) {
                logSecurity(userId, 'suspicious_login', 'warning', {
                    deviceId,
                    ip,
                    location: geo ? `${geo.city}, ${geo.country}` : 'Unknown'
                });
                return true;
            }
        }

        return false;
    }
}

module.exports = new TrustedDeviceService();
