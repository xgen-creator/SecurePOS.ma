const express = require('express');
const router = express.Router();
const { verifyToken, require2FA } = require('../middleware/auth');
const {
    setup2FA,
    disable2FA,
    generateBackupCodes,
    verify2FAStatus
} = require('../services/two-factor-auth');
const { getUserById, updateUserSecuritySettings } = require('../services/user-service');

// Obtenir les paramètres de sécurité
router.get('/security-settings/:userId', verifyToken, async (req, res, next) => {
    try {
        const { userId } = req.params;
        
        // Vérifier que l'utilisateur accède à ses propres paramètres
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        const user = await getUserById(userId);
        const status = await verify2FAStatus(userId);

        res.json({
            is2FAEnabled: status.required,
            current2FAMethod: user.twoFactorMethod || null,
            backupCodes: user.backupCodes || []
        });
    } catch (err) {
        next(err);
    }
});

// Configurer la 2FA
router.post('/setup-2fa', verifyToken, async (req, res, next) => {
    try {
        const { userId, method } = req.body;

        // Vérifier que l'utilisateur configure ses propres paramètres
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        // Configurer la 2FA avec la méthode choisie
        await setup2FA(userId, method);
        
        // Générer les codes de secours initiaux
        const backupCodes = await generateBackupCodes(userId);

        // Mettre à jour les paramètres de l'utilisateur
        await updateUserSecuritySettings(userId, {
            twoFactorMethod: method,
            backupCodes
        });

        res.json({
            message: 'Configuration 2FA réussie',
            backupCodes
        });
    } catch (err) {
        next(err);
    }
});

// Désactiver la 2FA
router.post('/disable-2fa', verifyToken, require2FA, async (req, res, next) => {
    try {
        const { userId } = req.body;

        // Vérifier que l'utilisateur désactive sa propre 2FA
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        await disable2FA(userId);
        
        // Réinitialiser les paramètres de sécurité
        await updateUserSecuritySettings(userId, {
            twoFactorMethod: null,
            backupCodes: []
        });

        res.json({ message: '2FA désactivée avec succès' });
    } catch (err) {
        next(err);
    }
});

// Régénérer les codes de secours
router.post('/regenerate-backup-codes', verifyToken, require2FA, async (req, res, next) => {
    try {
        const { userId } = req.body;

        // Vérifier que l'utilisateur régénère ses propres codes
        if (req.user.id !== userId) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }

        const newCodes = await generateBackupCodes(userId);
        
        // Mettre à jour les codes de secours de l'utilisateur
        await updateUserSecuritySettings(userId, {
            backupCodes: newCodes
        });

        res.json({
            message: 'Codes de secours régénérés',
            codes: newCodes
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
