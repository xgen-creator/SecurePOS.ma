import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ApiError } from '../utils/ApiError';
import { Session } from '../database/models/security';

// Interface pour étendre Request avec les informations utilisateur
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        sessionId?: string;
      };
    }
  }
}

// Middleware principal d'authentification
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.security.jwtSecret) as jwt.JwtPayload;

    // Vérifier si c'est un token temporaire (pour 2FA)
    if (decoded.temp) {
      req.user = {
        userId: decoded.userId,
        role: 'temp',
      };
      return next();
    }

    // Vérifier la session si présente
    if (decoded.sessionId) {
      const session = await Session.findById(decoded.sessionId);
      if (!session || session.expiresAt < new Date()) {
        throw new ApiError(401, 'Session expired');
      }
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      sessionId: decoded.sessionId
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid token'));
    } else {
      next(error);
    }
  }
};

// Middleware de vérification des rôles
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Insufficient permissions');
    }

    next();
  };
};

// Middleware de vérification de session active
export const requireActiveSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.sessionId) {
      throw new ApiError(401, 'No active session');
    }

    const session = await Session.findById(req.user.sessionId);
    if (!session || session.expiresAt < new Date()) {
      throw new ApiError(401, 'Session expired');
    }

    next();
  } catch (error) {
    next(error);
  }
};
