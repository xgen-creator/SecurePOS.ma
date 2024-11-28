import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { User, Session, SecurityAlert } from '../database/models/security';

const router = express.Router();

// Route de test publique
router.get('/public', (req, res) => {
  res.json({
    message: 'Cette route est publique',
    timestamp: new Date()
  });
});

// Route protégée - requiert authentification
router.get('/protected', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user?.userId).select('-password');
    res.json({
      message: 'Cette route est protégée',
      user,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route admin - requiert rôle admin
router.get('/admin', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const stats = {
      users: await User.countDocuments(),
      sessions: await Session.countDocuments(),
      alerts: await SecurityAlert.countDocuments()
    };

    res.json({
      message: 'Route admin',
      stats,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de test des sessions
router.get('/session-info', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findById(req.user?.sessionId);
    res.json({
      message: 'Informations de session',
      session,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de test des alertes
router.post('/trigger-alert', authenticateToken, async (req, res) => {
  try {
    const alert = await SecurityAlert.create({
      userId: req.user?.userId,
      type: 'suspicious_activity',
      severity: 'medium',
      details: {
        description: 'Test d\'alerte de sécurité',
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Alerte créée avec succès',
      alert,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
