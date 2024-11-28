const express = require('express');
const router = express.Router();
const authService = require('../auth-service');
const twoFactorAuth = require('../services/two-factor-auth');

// Route de login initiale
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Vérifier les credentials
        const user = await authService.validateCredentials(email, password);
        
        if (user) {
            // Vérifier si 2FA est désactivé
            const is2FADisabled = await twoFactorAuth.redis.get(`2fa:disabled:${user.id}`);
            if (is2FADisabled) {
                const token = await authService.createAccessToken(user.id, user.role, null, '24h', false);
                return res.json({ token });
            }

            // Initialiser 2FA
            const setupResult = await twoFactorAuth.setupTwoFactor(user.id, user.preferredAuthMethod || 'email');
            res.json({ 
                status: 'pending_2fa',
                userId: user.id,
                backupCodes: setupResult.backupCodes,
                message: 'Code de vérification envoyé'
            });
        } else {
            res.status(401).json({ error: 'Identifiants invalides' });
        }
    } catch (error) {
        console.error('Erreur login:', error);
        res.status(500).json({ error: error.message });
    }
});

// Vérification du code 2FA
router.post('/verify-2fa', async (req, res) => {
    try {
        const { userId, code, type = '2fa' } = req.body;
        
        const isValid = await twoFactorAuth.verifyCode(userId, code, type);
        
        if (isValid) {
            // Marquer le 2FA comme vérifié
            await twoFactorAuth.redis.set(`2fa:verified:${userId}`, 'true', 'EX', 86400);
            
            // Créer le token d'accès
            const user = await getUserById(userId);
            const token = await authService.createAccessToken(userId, user.role);
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Code invalide' });
        }
    } catch (error) {
        console.error('Erreur vérification 2FA:', error);
        res.status(500).json({ error: error.message });
    }
});

// Configuration 2FA
router.post('/setup-2fa', async (req, res) => {
    try {
        const { userId, method } = req.body;
        const setupResult = await twoFactorAuth.setupTwoFactor(userId, method);
        
        if (setupResult.success) {
            res.json({ 
                message: 'Configuration 2FA réussie',
                backupCodes: setupResult.backupCodes
            });
        } else {
            res.status(400).json({ error: 'Échec de la configuration 2FA' });
        }
    } catch (error) {
        console.error('Erreur setup 2FA:', error);
        res.status(500).json({ error: error.message });
    }
});

// Désactivation 2FA
router.post('/disable-2fa', async (req, res) => {
    try {
        const { userId } = req.body;
        const success = await twoFactorAuth.disableTwoFactor(userId);
        
        if (success) {
            res.json({ message: '2FA désactivé avec succès' });
        } else {
            res.status(400).json({ error: 'Échec de la désactivation 2FA' });
        }
    } catch (error) {
        console.error('Erreur désactivation 2FA:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
