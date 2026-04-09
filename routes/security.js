const express = require('express');
const router = express.Router();
const TwoFactorAuthService = require('../services/two-factor-auth');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

// Initialize services
const twoFactorAuth = new TwoFactorAuthService(require('../config/security'));

// Rate limiters
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many verification attempts, please try again later'
});

const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  message: 'Too many setup attempts, please try again later'
});

// 2FA Setup Routes
router.post('/2fa/setup/totp', authenticate, setupLimiter, async (req, res) => {
  try {
    const setup = await twoFactorAuth.setupTOTP(req.user.id);
    res.json(setup);
  } catch (error) {
    res.status(500).json({ error: 'Failed to setup TOTP' });
  }
});

router.post('/2fa/setup/sms', authenticate, setupLimiter, validate('phone'), async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const setup = await twoFactorAuth.setupSMS(req.user.id, phoneNumber);
    res.json(setup);
  } catch (error) {
    res.status(500).json({ error: 'Failed to setup SMS verification' });
  }
});

router.post('/2fa/setup/email', authenticate, setupLimiter, validate('email'), async (req, res) => {
  try {
    const { email } = req.body;
    const setup = await twoFactorAuth.setupEmail(req.user.id, email);
    res.json(setup);
  } catch (error) {
    res.status(500).json({ error: 'Failed to setup email verification' });
  }
});

// 2FA Verification Routes
router.post('/2fa/verify', authenticate, verifyLimiter, async (req, res) => {
  try {
    const { method, code, tempToken } = req.body;
    let verified = false;

    switch (method) {
      case 'totp':
        verified = await twoFactorAuth.verifyTOTP(code, req.user.id);
        break;
      case 'sms':
      case 'email':
        verified = await twoFactorAuth.verifyCode(code, tempToken, req.user.id);
        break;
      default:
        return res.status(400).json({ error: 'Invalid verification method' });
    }

    if (verified) {
      // Track the verified device
      const deviceInfo = await twoFactorAuth.trackDevice(req.user.id, req);
      
      // Generate recovery codes if they don't exist
      const { plainCodes } = await twoFactorAuth.generateRecoveryCodes();
      
      res.json({ 
        success: true,
        deviceInfo,
        recoveryCodes: plainCodes
      });
    } else {
      res.status(401).json({ error: 'Invalid verification code' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Device Management Routes
router.get('/devices', authenticate, async (req, res) => {
  try {
    const devices = await twoFactorAuth.getDevices(req.user.id);
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

router.get('/devices/stats', authenticate, async (req, res) => {
  try {
    const stats = await twoFactorAuth.getDeviceStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch device statistics' });
  }
});

router.post('/devices/:deviceId/revoke', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.params;
    await twoFactorAuth.revokeDevice(req.user.id, deviceId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

router.post('/devices/revoke-all', authenticate, async (req, res) => {
  try {
    await twoFactorAuth.revokeAllDevices(req.user.id, req.headers['user-agent']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke all devices' });
  }
});

// Recovery Code Routes
router.post('/recovery/generate', authenticate, async (req, res) => {
  try {
    const { plainCodes } = await twoFactorAuth.generateRecoveryCodes();
    res.json({ recoveryCodes: plainCodes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate recovery codes' });
  }
});

router.post('/recovery/verify', authenticate, verifyLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    const verified = await twoFactorAuth.verifyRecoveryCode(req.user.id, code);
    
    if (verified) {
      // Track recovery code usage
      await twoFactorAuth.sendSecurityAlert(
        req.user.id,
        'recovery_code_used',
        'A recovery code was used to access your account'
      );
      
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Invalid recovery code' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Recovery code verification failed' });
  }
});

// Security Status Routes
router.get('/status', authenticate, async (req, res) => {
  try {
    const [devices, stats] = await Promise.all([
      twoFactorAuth.getDevices(req.user.id),
      twoFactorAuth.getDeviceStats(req.user.id)
    ]);

    const securityScore = await twoFactorAuth.calculateSecurityScore(req.user.id);
    
    res.json({
      devices,
      stats,
      securityScore,
      hasTwoFactor: true, // User must have 2FA to access these routes
      hasRecoveryCodes: stats.recoveryCodes > 0,
      riskLevel: stats.riskySessions > 0 ? 'high' : 'low'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch security status' });
  }
});

// Security Alert Routes
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const alerts = await twoFactorAuth.getSecurityAlerts(req.user.id);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch security alerts' });
  }
});

router.post('/alerts/:alertId/dismiss', authenticate, async (req, res) => {
  try {
    const { alertId } = req.params;
    await twoFactorAuth.dismissSecurityAlert(req.user.id, alertId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dismiss security alert' });
  }
});

module.exports = router;
