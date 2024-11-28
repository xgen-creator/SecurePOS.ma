import express from 'express';
import { authService } from '../services/auth-service';
import { validateRegistration, validateLogin } from '../validations/auth';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Route d'inscription
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const result = await authService.register(username, email, password);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Route de connexion
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const deviceInfo = {
      deviceId: req.headers['device-id'] || 'unknown',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    const result = await authService.login(email, password, deviceInfo);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// Route de vérification 2FA
router.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, token } = req.body;
    const result = await authService.verifyTwoFactor(userId, token);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// Route d'activation 2FA (protégée)
router.post('/enable-2fa', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await authService.enableTwoFactor(userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Route d'initialisation 2FA
router.post('/2fa/init', authenticateToken, async (req, res) => {
  try {
    const { method } = req.body;
    const userId = req.user.userId;
    const result = await authService.initTwoFactor(userId, method);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Route de vérification et activation 2FA
router.post('/2fa/verify', authenticateToken, async (req, res) => {
  try {
    const { method, code, secret } = req.body;
    const userId = req.user.userId;
    const result = await authService.verifyAndEnableTwoFactor(userId, method, code, secret);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Route de désactivation 2FA
router.post('/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await authService.disableTwoFactor(userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Route de récupération des codes de secours
router.get('/2fa/backup-codes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const codes = await authService.getBackupCodes(userId);
    res.json({ codes });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Route de régénération des codes de secours
router.post('/2fa/backup-codes/regenerate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const codes = await authService.regenerateBackupCodes(userId);
    res.json({ codes });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Route de vérification de token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

export default router;
