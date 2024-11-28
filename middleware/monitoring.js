const { logHttp, logError } = require('../services/logging-service');

// Middleware pour mesurer le temps de réponse
const responseTime = (req, res, next) => {
    const start = process.hrtime();

    res.on('finish', () => {
        const diff = process.hrtime(start);
        const time = diff[0] * 1e3 + diff[1] * 1e-6; // en millisecondes
        logHttp(req, res, time);
    });

    next();
};

// Middleware pour capturer les erreurs
const errorHandler = (err, req, res, next) => {
    logError(err, {
        url: req.url,
        method: req.method,
        userId: req.user?.id
    });

    // Ne pas exposer les détails de l'erreur en production
    const message = process.env.NODE_ENV === 'production'
        ? 'Une erreur est survenue'
        : err.message;

    res.status(err.status || 500).json({
        error: message
    });
};

// Middleware pour les routes non trouvées
const notFound = (req, res) => {
    logHttp(req, res, 0);
    res.status(404).json({
        error: 'Route non trouvée'
    });
};

module.exports = {
    responseTime,
    errorHandler,
    notFound
};
