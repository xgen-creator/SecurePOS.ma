import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';
import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';
import { AuditService } from './audit-service';

const redis = new Redis(process.env.REDIS_URL);

export class ThreatDetectionService {
  private static readonly SUSPICIOUS_COUNTRIES = ['XX', 'YY']; // Add high-risk countries
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly BLOCK_DURATION = 3600; // 1 hour in seconds
  private static readonly RATE_LIMIT_WINDOW = 60; // 1 minute
  private static readonly RATE_LIMIT_MAX_REQUESTS = 100;

  static async analyzeRequest(req: Request): Promise<boolean> {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || '';
    
    const threats = await Promise.all([
      this.checkIPReputation(ip),
      this.checkUserAgentReputation(userAgent),
      this.checkGeoLocation(ip),
      this.checkRateLimit(ip),
      this.checkBruteForceAttempts(ip),
      this.checkSuspiciousPatterns(req),
    ]);

    const isThreat = threats.some(threat => threat);
    
    if (isThreat) {
      await this.logThreat(req);
      await this.updateThreatScore(ip);
    }

    return isThreat;
  }

  private static async checkIPReputation(ip: string): Promise<boolean> {
    const threatScore = await redis.get(`threat:ip:${ip}`);
    if (threatScore && parseInt(threatScore) > 50) {
      return true;
    }

    // Check against IP reputation databases
    try {
      const response = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}`, {
        headers: {
          'Key': process.env.ABUSEIPDB_API_KEY!
        }
      });
      const data = await response.json();
      return data.abuseConfidenceScore > 80;
    } catch (error) {
      console.error('IP reputation check failed:', error);
      return false;
    }
  }

  private static async checkUserAgentReputation(userAgent: string): Promise<boolean> {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Check for suspicious user agents
    const suspicious = [
      'curl',
      'python-requests',
      'wget',
      'bot',
      'crawler',
      'scanner'
    ];

    return suspicious.some(s => userAgent.toLowerCase().includes(s)) ||
           !result.browser.name ||
           !result.os.name;
  }

  private static async checkGeoLocation(ip: string): Promise<boolean> {
    const geo = geoip.lookup(ip);
    if (!geo) return false;

    return this.SUSPICIOUS_COUNTRIES.includes(geo.country);
  }

  private static async checkRateLimit(ip: string): Promise<boolean> {
    const key = `ratelimit:${ip}`;
    const requests = await redis.incr(key);
    
    if (requests === 1) {
      await redis.expire(key, this.RATE_LIMIT_WINDOW);
    }

    return requests > this.RATE_LIMIT_MAX_REQUESTS;
  }

  private static async checkBruteForceAttempts(ip: string): Promise<boolean> {
    const key = `bruteforce:${ip}`;
    const attempts = await redis.get(key);
    
    return attempts ? parseInt(attempts) >= this.MAX_FAILED_ATTEMPTS : false;
  }

  private static async checkSuspiciousPatterns(req: Request): Promise<boolean> {
    const patterns = [
      // SQL Injection
      /'.*--/,
      /union.*select/i,
      // XSS
      /<script.*>/i,
      /javascript:/i,
      // Directory Traversal
      /\.\.\//,
      // Command Injection
      /;\s*(\$|`)/,
      // File Inclusion
      /\.(php|asp|jsp)$/i,
    ];

    const checkValue = (value: any): boolean => {
      if (typeof value !== 'string') return false;
      return patterns.some(pattern => pattern.test(value));
    };

    return Object.values(req.query).some(checkValue) ||
           Object.values(req.body).some(checkValue) ||
           Object.values(req.params).some(checkValue);
  }

  private static async logThreat(req: Request): Promise<void> {
    const threatData = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      timestamp: new Date(),
      headers: req.headers
    };

    await AuditService.logSecurityEvent(req, {
      eventType: 'THREAT_DETECTED',
      details: threatData
    } as any);
  }

  private static async updateThreatScore(ip: string): Promise<void> {
    const key = `threat:ip:${ip}`;
    const currentScore = parseInt(await redis.get(key) || '0');
    const newScore = Math.min(currentScore + 10, 100);
    
    await redis.set(key, newScore, 'EX', this.BLOCK_DURATION);
  }

  static async recordFailedAttempt(ip: string): Promise<void> {
    const key = `bruteforce:${ip}`;
    const attempts = await redis.incr(key);
    
    if (attempts === 1) {
      await redis.expire(key, this.BLOCK_DURATION);
    }

    if (attempts >= this.MAX_FAILED_ATTEMPTS) {
      await this.blockIP(ip);
    }
  }

  private static async blockIP(ip: string): Promise<void> {
    await redis.set(`blocked:${ip}`, '1', 'EX', this.BLOCK_DURATION);
  }

  static async isIPBlocked(ip: string): Promise<boolean> {
    return Boolean(await redis.get(`blocked:${ip}`));
  }

  static getMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (await this.isIPBlocked(req.ip)) {
        return res.status(403).json({
          error: 'Access denied due to suspicious activity'
        });
      }

      const isThreat = await this.analyzeRequest(req);
      if (isThreat) {
        return res.status(403).json({
          error: 'Request blocked due to security concerns'
        });
      }

      next();
    };
  }
}
