const winston = require('winston');
const { format } = winston;

// Configuration des niveaux de log personnalisés
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Configuration des couleurs pour chaque niveau
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Définition du format
const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// Création du logger
const logger = winston.createLogger({
    levels,
    format: logFormat,
    transports: [
        // Logs d'erreur
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: format.combine(
                format.errors({ stack: true }),
                logFormat
            )
        }),
        // Logs d'authentification
        new winston.transports.File({
            filename: 'logs/auth.log',
            level: 'info',
            format: logFormat
        }),
        // Logs de sécurité
        new winston.transports.File({
            filename: 'logs/security.log',
            level: 'warn',
            format: logFormat
        }),
        // Logs HTTP
        new winston.transports.File({
            filename: 'logs/http.log',
            level: 'http',
            format: logFormat
        })
    ],
});

// Ajouter les logs console en développement
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: format.combine(
                format.colorize({ all: true }),
                logFormat
            ),
        })
    );
}

// Fonctions d'aide pour le logging
const logAuth = (userId, action, status, details = {}) => {
    logger.info({
        type: 'auth',
        userId,
        action,
        status,
        timestamp: new Date(),
        ...details
    });
};

const logSecurity = (userId, event, severity, details = {}) => {
    logger.warn({
        type: 'security',
        userId,
        event,
        severity,
        timestamp: new Date(),
        ...details
    });
};

const logError = (error, context = {}) => {
    logger.error({
        type: 'error',
        error: error.message,
        stack: error.stack,
        timestamp: new Date(),
        ...context
    });
};

const logHttp = (req, res, responseTime) => {
    logger.http({
        type: 'http',
        method: req.method,
        url: req.url,
        status: res.statusCode,
        responseTime,
        ip: req.ip,
        timestamp: new Date()
    });
};

module.exports = {
    logger,
    logAuth,
    logSecurity,
    logError,
    logHttp
};
