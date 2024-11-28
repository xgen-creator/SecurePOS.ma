const express = require('express');
const router = express.Router();
const sessionService = require('../services/session-service');
const { authenticateToken } = require('../middleware/auth');
const { logSecurity } = require('../services/logging-service');

// Middleware pour extraire les informations du client
const extractClientInfo = (req, res, next) => {
    req.clientInfo = {
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
    };
    next();
};

// Obtenir toutes les sessions actives de l'utilisateur
router.get('/sessions', authenticateToken, async (req, res) => {
    try {
        const sessions = await sessionService.getUserSessions(req.user.id, req.sessionId);
        res.json(sessions);
    } catch (error) {
        logSecurity(req.user.id, 'session_list_error', 'error', { error: error.message });
        res.status(500).json({ error: 'Erreur lors de la récupération des sessions' });
    }
});

// Créer une nouvelle session
router.post('/sessions', authenticateToken, extractClientInfo, async (req, res) => {
    try {
        const session = await sessionService.createSession(
            req.user.id,
            req.clientInfo.userAgent,
            req.clientInfo.ip
        );
        res.json(session);
    } catch (error) {
        logSecurity(req.user.id, 'session_creation_error', 'error', { error: error.message });
        res.status(500).json({ error: 'Erreur lors de la création de la session' });
    }
});

// Terminer une session spécifique
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Vérifier que l'utilisateur ne tente pas de terminer sa session courante
        if (sessionId === req.sessionId) {
            return res.status(400).json({ error: 'Impossible de terminer la session courante' });
        }

        // Vérifier que la session appartient à l'utilisateur
        const session = await sessionService.getSession(sessionId);
        if (!session || session.userId !== req.user.id) {
            return res.status(403).json({ error: 'Session non autorisée' });
        }

        await sessionService.terminateSession(sessionId);
        res.json({ message: 'Session terminée avec succès' });
    } catch (error) {
        logSecurity(req.user.id, 'session_termination_error', 'error', {
            sessionId: req.params.sessionId,
            error: error.message
        });
        res.status(500).json({ error: 'Erreur lors de la terminaison de la session' });
    }
});

// Terminer toutes les autres sessions
router.delete('/sessions', authenticateToken, async (req, res) => {
    try {
        await sessionService.terminateOtherSessions(req.user.id, req.sessionId);
        res.json({ message: 'Toutes les autres sessions ont été terminées' });
    } catch (error) {
        logSecurity(req.user.id, 'all_sessions_termination_error', 'error', {
            error: error.message
        });
        res.status(500).json({ error: 'Erreur lors de la terminaison des sessions' });
    }
});

// Vérifier la validité d'une session
router.get('/sessions/:sessionId/validate', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const isValid = await sessionService.isValidSession(sessionId);
        res.json({ valid: isValid });
    } catch (error) {
        logSecurity(req.user.id, 'session_validation_error', 'error', {
            sessionId: req.params.sessionId,
            error: error.message
        });
        res.status(500).json({ error: 'Erreur lors de la validation de la session' });
    }
});

module.exports = router;
