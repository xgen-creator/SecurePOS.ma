import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import cors from 'cors';
import { createHash } from 'crypto';

// Rate limiting configuration
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Enhanced security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

// CORS configuration
export const corsOptions = cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 600, // 10 minutes
});

// Parameter pollution protection
export const parameterProtection = hpp();

// SQL Injection protection
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|WHERE)\b)|(['"])/gi;
  
  const checkForSQLInjection = (value: any): boolean => {
    if (typeof value === 'string' && sqlPattern.test(value)) {
      return true;
    }
    return false;
  };

  const hasSQLInjection = Object.values(req.body).some(checkForSQLInjection) ||
                         Object.values(req.query).some(checkForSQLInjection) ||
                         Object.values(req.params).some(checkForSQLInjection);

  if (hasSQLInjection) {
    return res.status(403).json({ error: 'Potential SQL injection detected' });
  }

  next();
};

// JWT Token validation
export const validateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify token and add user to request
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Request sanitization
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters
      return value.replace(/[<>]/g, '');
    }
    return value;
  };

  req.body = Object.keys(req.body).reduce((acc: any, key) => {
    acc[key] = sanitizeValue(req.body[key]);
    return acc;
  }, {});

  req.query = Object.keys(req.query).reduce((acc: any, key) => {
    acc[key] = sanitizeValue(req.query[key]);
    return acc;
  }, {});

  next();
};

// API Key validation for external services
export const validateAPIKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const hashedKey = createHash('sha256').update(apiKey as string).digest('hex');
  
  if (hashedKey !== process.env.API_KEY_HASH) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
};

// Audit logging middleware
export const auditLog = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request
  const requestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id || 'anonymous',
  };

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseLog = {
      ...requestLog,
      statusCode: res.statusCode,
      duration,
    };

    // Save to database or log file
    console.log(JSON.stringify(responseLog));
  });

  next();
};

// Export combined middleware
export const securityMiddleware = [
  rateLimiter,
  securityHeaders,
  corsOptions,
  parameterProtection,
  sqlInjectionProtection,
  sanitizeRequest,
  auditLog,
];
