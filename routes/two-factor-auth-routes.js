const express = require('express');
const router = express.Router();
const twoFactorAuthService = require('../services/two-factor-auth.js');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body } = require('express-validator');
const UAParser = require('ua-parser-js');

/**
 * Get client information from request
 * @param {Object} req - Express request object
 * @returns {Object} Client information
 */
const getClientInfo = (req) => {
    const parser = new UAParser(req.headers['user-agent']);
    const result = parser.getResult();
    
    return {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        browser: result.browser.name,
        os: result.os.name,
        country: req.headers['cf-ipcountry'] || 'unknown', // Assuming Cloudflare
        name: req.body.deviceName || `${result.browser.name} on ${result.os.name}`
    };
};

// Setup 2FA
router.post('/setup', 
    authenticateToken,
    [
        body('method').isIn(['sms', 'email', 'totp']),
        body('phoneNumber').optional().isMobilePhone('any'),
        body('email').optional().isEmail()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { method } = req.body;
            const userId = req.user.id;

            if (await twoFactorAuthService.isSuspiciousRequest(userId, getClientInfo(req))) {
                return res.status(403).json({ 
                    error: 'Suspicious activity detected. Please contact support.' 
                });
            }

            let result;
            if (method === 'totp') {
                result = await twoFactorAuthService.setupTOTP(userId);
            } else {
                result = await twoFactorAuthService.setupTwoFactor(userId, method);
            }

            res.json(result);
        } catch (error) {
            console.error('Error in 2FA setup:', error);
            res.status(500).json({ error: 'Failed to setup 2FA' });
        }
    }
);

// Verify 2FA code
router.post('/verify',
    authenticateToken,
    [
        body('code').isString().isLength({ min: 6, max: 8 }),
        body('type').optional().isIn(['2fa', 'backup', 'totp']),
        body('deviceName').optional().isString()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { code, type = '2fa' } = req.body;
            const userId = req.user.id;
            const clientInfo = getClientInfo(req);

            // Check for suspicious activity
            if (await twoFactorAuthService.isSuspiciousRequest(userId, clientInfo)) {
                await twoFactorAuthService.trackSuspiciousActivity(userId, {
                    type: 'suspicious_verification_attempt',
                    ...clientInfo
                });
            }

            let verified = false;
            if (type === 'totp') {
                verified = await twoFactorAuthService.verifyTOTP(userId, code);
            } else {
                verified = await twoFactorAuthService.verifyCode(userId, code, type);
            }

            if (verified) {
                const deviceId = await twoFactorAuthService.addTrustedDevice(userId, clientInfo);
                await twoFactorAuthService.track2FASession(userId, deviceId);
                
                res.json({ 
                    success: true,
                    deviceId,
                    message: 'Verification successful'
                });
            } else {
                res.status(401).json({ 
                    error: 'Invalid verification code'
                });
            }
        } catch (error) {
            console.error('Error in 2FA verification:', error);
            if (error.message.includes('Too many')) {
                res.status(429).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Verification failed' });
            }
        }
    }
);

// Get 2FA status
router.get('/status',
    authenticateToken,
    async (req, res) => {
        try {
            const status = await twoFactorAuthService.get2FAStatus(req.user.id);
            res.json(status);
        } catch (error) {
            console.error('Error getting 2FA status:', error);
            res.status(500).json({ error: 'Failed to get 2FA status' });
        }
    }
);

// Disable 2FA
router.post('/disable',
    authenticateToken,
    [body('code').isString().isLength({ min: 6, max: 8 })],
    validateRequest,
    async (req, res) => {
        try {
            const { code } = req.body;
            const userId = req.user.id;

            const verified = await twoFactorAuthService.verifyCode(userId, code);
            if (!verified) {
                return res.status(401).json({ error: 'Invalid verification code' });
            }

            await twoFactorAuthService.disableTwoFactor(userId);
            res.json({ message: '2FA disabled successfully' });
        } catch (error) {
            console.error('Error disabling 2FA:', error);
            res.status(500).json({ error: 'Failed to disable 2FA' });
        }
    }
);

// List trusted devices
router.get('/devices',
    authenticateToken,
    async (req, res) => {
        try {
            const devices = await twoFactorAuthService.listTrustedDevices(req.user.id);
            res.json(devices);
        } catch (error) {
            console.error('Error listing trusted devices:', error);
            res.status(500).json({ error: 'Failed to list trusted devices' });
        }
    }
);

// Remove trusted device
router.delete('/devices/:deviceId',
    authenticateToken,
    async (req, res) => {
        try {
            const { deviceId } = req.params;
            await twoFactorAuthService.removeTrustedDevice(req.user.id, deviceId);
            res.json({ message: 'Device removed successfully' });
        } catch (error) {
            console.error('Error removing trusted device:', error);
            res.status(500).json({ error: 'Failed to remove trusted device' });
        }
    }
);

// Generate new recovery codes
router.post('/recovery-codes',
    authenticateToken,
    [body('code').isString().isLength({ min: 6, max: 8 })],
    validateRequest,
    async (req, res) => {
        try {
            const { code } = req.body;
            const userId = req.user.id;

            const verified = await twoFactorAuthService.verifyCode(userId, code);
            if (!verified) {
                return res.status(401).json({ error: 'Invalid verification code' });
            }

            const recoveryCodes = await twoFactorAuthService.generateRecoveryCodes(userId);
            res.json({ recoveryCodes });
        } catch (error) {
            console.error('Error generating recovery codes:', error);
            res.status(500).json({ error: 'Failed to generate recovery codes' });
        }
    }
);

module.exports = router;
