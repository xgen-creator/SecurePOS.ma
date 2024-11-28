import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';
import { redis } from '../config/redis';
import { logSecurity, logWarning } from './logging-service';

interface RiskAnalysis {
  score: number;
  factors: string[];
  requiresVerification: boolean;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  device?: {
    browser?: string;
    os?: string;
    device?: string;
  };
}

interface LoginAttempt {
  timestamp: number;
  ip: string;
  userAgent: string;
  success: boolean;
  location?: {
    country?: string;
    city?: string;
  };
}

class BehaviorAnalysisService {
  private readonly RISK_THRESHOLD = 70; // Score à partir duquel une vérification est requise
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly ATTEMPT_WINDOW = 300; // 5 minutes
  private readonly LOCATION_WEIGHT = 35;
  private readonly TIME_WEIGHT = 25;
  private readonly DEVICE_WEIGHT = 20;
  private readonly VELOCITY_WEIGHT = 20;

  async analyzeLoginAttempt(
    userId: string,
    ip: string,
    userAgent: string
  ): Promise<RiskAnalysis> {
    try {
      const riskFactors: string[] = [];
      let riskScore = 0;

      // Analyser la localisation
      const locationRisk = await this.analyzeLocation(userId, ip);
      riskScore += locationRisk.score;
      riskFactors.push(...locationRisk.factors);

      // Analyser l'appareil
      const deviceRisk = await this.analyzeDevice(userId, userAgent);
      riskScore += deviceRisk.score;
      riskFactors.push(...deviceRisk.factors);

      // Analyser la vitesse de connexion
      const velocityRisk = await this.analyzeLoginVelocity(userId, ip);
      riskScore += velocityRisk.score;
      riskFactors.push(...velocityRisk.factors);

      // Analyser l'heure de connexion
      const timeRisk = this.analyzeLoginTime(userId);
      riskScore += timeRisk.score;
      riskFactors.push(...timeRisk.factors);

      // Enregistrer la tentative
      await this.recordLoginAttempt(userId, ip, userAgent, true);

      const analysis: RiskAnalysis = {
        score: riskScore,
        factors: riskFactors,
        requiresVerification: riskScore >= this.RISK_THRESHOLD,
        location: locationRisk.details,
        device: deviceRisk.details
      };

      await logSecurity('login_risk_analysis', {
        userId,
        ip,
        riskScore,
        factors: riskFactors,
      });

      return analysis;
    } catch (error) {
      await logWarning('Risk analysis failed', { error, userId, ip });
      // En cas d'erreur, retourner une analyse conservatrice
      return {
        score: this.RISK_THRESHOLD,
        factors: ['Error during risk analysis'],
        requiresVerification: true
      };
    }
  }

  private async analyzeLocation(userId: string, ip: string) {
    const geo = geoip.lookup(ip);
    const result = {
      score: 0,
      factors: [] as string[],
      details: {
        country: geo?.country,
        city: geo?.city,
        timezone: geo?.timezone
      }
    };

    if (!geo) {
      result.score = this.LOCATION_WEIGHT;
      result.factors.push('Unknown location');
      return result;
    }

    // Vérifier les localisations précédentes
    const lastLocation = await redis.get(`last_location:${userId}`);
    if (lastLocation) {
      const prev = JSON.parse(lastLocation);
      if (prev.country !== geo.country) {
        result.score += this.LOCATION_WEIGHT;
        result.factors.push(`Location change: ${prev.country} -> ${geo.country}`);
      }
    }

    // Mettre à jour la dernière localisation
    await redis.setex(
      `last_location:${userId}`,
      86400 * 30, // 30 jours
      JSON.stringify({
        country: geo.country,
        city: geo.city,
        timestamp: Date.now()
      })
    );

    return result;
  }

  private async analyzeDevice(userId: string, userAgent: string) {
    const parser = new UAParser(userAgent);
    const result = {
      score: 0,
      factors: [] as string[],
      details: {
        browser: parser.getBrowser().name,
        os: parser.getOS().name,
        device: parser.getDevice().type
      }
    };

    // Vérifier les appareils précédents
    const lastDevice = await redis.get(`last_device:${userId}`);
    if (lastDevice) {
      const prev = JSON.parse(lastDevice);
      if (
        prev.browser !== result.details.browser ||
        prev.os !== result.details.os
      ) {
        result.score += this.DEVICE_WEIGHT;
        result.factors.push('New device detected');
      }
    }

    // Mettre à jour le dernier appareil
    await redis.setex(
      `last_device:${userId}`,
      86400 * 30, // 30 jours
      JSON.stringify({
        ...result.details,
        timestamp: Date.now()
      })
    );

    return result;
  }

  private async analyzeLoginVelocity(userId: string, ip: string) {
    const result = {
      score: 0,
      factors: [] as string[]
    };

    const attempts = await this.getRecentLoginAttempts(userId);
    
    // Vérifier la fréquence des tentatives
    if (attempts.length >= this.MAX_LOGIN_ATTEMPTS) {
      const timeWindow = Date.now() - attempts[attempts.length - 1].timestamp;
      if (timeWindow < this.ATTEMPT_WINDOW * 1000) {
        result.score += this.VELOCITY_WEIGHT;
        result.factors.push('Too many login attempts');
      }
    }

    // Vérifier les connexions simultanées depuis différentes localisations
    const uniqueIPs = new Set(attempts.map(a => a.ip));
    if (uniqueIPs.size > 2) {
      result.score += this.VELOCITY_WEIGHT / 2;
      result.factors.push('Multiple locations');
    }

    return result;
  }

  private analyzeLoginTime(userId: string) {
    const result = {
      score: 0,
      factors: [] as string[]
    };

    const hour = new Date().getHours();
    
    // Considérer les heures inhabituelles (entre 23h et 5h)
    if (hour >= 23 || hour <= 5) {
      result.score += this.TIME_WEIGHT;
      result.factors.push('Unusual login time');
    }

    return result;
  }

  private async recordLoginAttempt(
    userId: string,
    ip: string,
    userAgent: string,
    success: boolean
  ) {
    const attempt: LoginAttempt = {
      timestamp: Date.now(),
      ip,
      userAgent,
      success,
      location: geoip.lookup(ip)
    };

    const key = `login_attempts:${userId}`;
    const attempts = JSON.parse(await redis.get(key) || '[]');
    
    attempts.push(attempt);
    
    // Garder seulement les 10 dernières tentatives
    if (attempts.length > 10) {
      attempts.shift();
    }

    await redis.setex(key, 86400, JSON.stringify(attempts)); // Expire après 24h
  }

  private async getRecentLoginAttempts(userId: string): Promise<LoginAttempt[]> {
    const attempts = await redis.get(`login_attempts:${userId}`);
    return attempts ? JSON.parse(attempts) : [];
  }

  async getSecuritySuggestions(userId: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Vérifier l'historique des connexions
    const attempts = await this.getRecentLoginAttempts(userId);
    const failedAttempts = attempts.filter(a => !a.success);
    
    if (failedAttempts.length > 3) {
      suggestions.push('Consider enabling two-factor authentication for additional security.');
    }

    const uniqueIPs = new Set(attempts.map(a => a.ip));
    if (uniqueIPs.size > 2) {
      suggestions.push('Multiple login locations detected. Review your active sessions and sign out from unfamiliar devices.');
    }

    const unusualTimes = attempts.filter(a => {
      const hour = new Date(a.timestamp).getHours();
      return hour >= 23 || hour <= 5;
    });

    if (unusualTimes.length > 0) {
      suggestions.push('Unusual login times detected. Consider reviewing your account activity.');
    }

    return suggestions;
  }
}

export const behaviorAnalysis = new BehaviorAnalysisService();
