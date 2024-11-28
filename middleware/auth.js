const jwt = require('jsonwebtoken');
const { getUserById } = require('../services/user-service');
const { verify2FAStatus } = require('../services/two-factor-auth');

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token non fourni' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await getUserById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token invalide' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expiré' });
        }
        next(err);
    }
};

const require2FA = async (req, res, next) => {
    try {
        const { user } = req;
        if (!user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }

        const status = await verify2FAStatus(user.id);
        if (status.required && !status.verified) {
            return res.status(403).json({
                error: 'Vérification 2FA requise',
                status: 'pending_2fa',
                userId: user.id
            });
        }

        next();
    } catch (err) {
        next(err);
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Accès non autorisé' });
    }
    next();
};

module.exports = {
    verifyToken,
    require2FA,
    requireAdmin
};
