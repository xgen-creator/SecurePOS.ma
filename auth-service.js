// authorizationService.js
const jwt = require('jsonwebtoken');
const redis = require('redis');
const twoFactorAuth = require('./services/two-factor-auth');

class AuthorizationService {
  constructor() {
    this.redis = redis.createClient();
    this.permissions = {
      ADMIN: ['all'],
      OWNER: ['manage', 'view', 'share'],
      FAMILY: ['view', 'answer'],
      GUEST: ['view'],
      DELIVERY: ['ring', 'leave_package']
    };
  }

  async createAccessToken(userId, role, deviceId = null, expiresIn = '24h', require2FA = true) {
    // Vérifier si 2FA est requis et validé
    if (require2FA) {
      const is2FAVerified = await this.redis.get(`2fa:verified:${userId}`);
      if (!is2FAVerified) {
        throw new Error('2FA required');
      }
    }

    const permissions = this.permissions[role];
    const token = jwt.sign(
      { userId, role, deviceId, permissions },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    // Stocker le token dans Redis pour révocation rapide
    await this.redis.set(`token:${token}`, 'valid', 'EX', 86400);
    return token;
  }

  async createTemporaryAccess(deviceId, permissions, duration) {
    const accessCode = this.generateAccessCode();
    const expiresAt = Date.now() + duration;

    await this.redis.set(
      `temp:${accessCode}`,
      JSON.stringify({ deviceId, permissions, expiresAt }),
      'EX',
      duration / 1000
    );

    return accessCode;
  }

  async validateAccess(token, requiredPermission, deviceId) {
    try {
      // Vérifier si le token est révoqué
      const isValid = await this.redis.get(`token:${token}`);
      if (!isValid) throw new Error('Token révoqué');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Vérifier les permissions
      if (!this.hasPermission(decoded.permissions, requiredPermission)) {
        throw new Error('Permission refusée');
      }

      // Vérifier l'accès au dispositif
      if (deviceId && decoded.deviceId !== deviceId && !decoded.permissions.includes('all')) {
        throw new Error('Accès non autorisé à ce dispositif');
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async revokeAccess(token) {
    await this.redis.del(`token:${token}`);
  }
}

module.exports = new AuthorizationService();
