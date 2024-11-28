import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Configuration des niveaux de log personnalisés
const levels = {
  error: 0,
  warn: 1,
  security: 2,
  info: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  security: 'magenta',
  info: 'green',
  debug: 'blue',
};

// Configuration du format des logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Création des transports
const createTransports = () => {
  const logsDir = path.join(process.cwd(), 'logs');
  
  const transports: winston.transport[] = [
    // Logs de sécurité
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'security',
      maxFiles: '30d',
      maxSize: '20m',
      format: format,
    }),

    // Logs d'erreurs
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '20m',
      format: format,
    }),

    // Logs généraux
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      format: format,
    }),
  ];

  // Ajouter la console en développement
  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      })
    );
  }

  return transports;
};

// Création du logger
const logger = winston.createLogger({
  levels,
  format,
  transports: createTransports(),
});

// Ajouter les couleurs
winston.addColors(colors);

// Types pour les événements de sécurité
interface SecurityEvent {
  userId?: string;
  action?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
  timestamp?: Date;
}

interface ErrorDetails {
  userId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
}

// Fonction pour les logs de sécurité
export const logSecurity = async (
  event: string,
  data: SecurityEvent
): Promise<void> => {
  try {
    const logData = {
      event,
      ...data,
      timestamp: data.timestamp || new Date(),
    };

    logger.log('security', logData);
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Fonction pour les logs d'erreur
export const logError = async (
  error: Error,
  details?: ErrorDetails
): Promise<void> => {
  try {
    const logData = {
      message: error.message,
      stack: error.stack,
      ...details,
      timestamp: new Date(),
    };

    logger.error(logData);
  } catch (err) {
    console.error('Failed to log error:', err);
  }
};

// Fonction pour les logs d'information
export const logInfo = async (
  message: string,
  data?: any
): Promise<void> => {
  try {
    const logData = {
      message,
      ...data,
      timestamp: new Date(),
    };

    logger.info(logData);
  } catch (error) {
    console.error('Failed to log info:', error);
  }
};

// Fonction pour les logs de debug
export const logDebug = async (
  message: string,
  data?: any
): Promise<void> => {
  try {
    const logData = {
      message,
      ...data,
      timestamp: new Date(),
    };

    logger.debug(logData);
  } catch (error) {
    console.error('Failed to log debug:', error);
  }
};

// Fonction pour les logs d'avertissement
export const logWarning = async (
  message: string,
  data?: any
): Promise<void> => {
  try {
    const logData = {
      message,
      ...data,
      timestamp: new Date(),
    };

    logger.warn(logData);
  } catch (error) {
    console.error('Failed to log warning:', error);
  }
};

// Middleware pour logger les requêtes HTTP
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    };

    if (res.statusCode >= 400) {
      logger.warn(logData);
    } else {
      logger.info(logData);
    }
  });

  next();
};

export default logger;
