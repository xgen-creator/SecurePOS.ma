import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, Session } from '../database/models/security';
import { twoFactorAuth } from './two-factor-auth';
import { behaviorAnalysis } from './behavior-analysis-service';
import { redis } from '../config/redis';
import { logSecurity, logError } from './logging-service';

interface LoginResponse {
  requiresTwoFactor?: boolean;
  tempToken?: string;
  token?: string;
  refreshToken?: string;
  sessionId?: string;
}

interface DeviceInfo {
  deviceId: string;
  ipAddress: string;
  userAgent: string;
}

class AuthService {
  private readonly JWT_SECRET: string = process.env.JWT_SECRET || 'default-secret-key';
  private readonly JWT_EXPIRATION: string = '24h';
  private readonly BCRYPT_ROUNDS: number = parseInt(process.env.BCRYPT_ROUNDS || '12');
  private readonly TEMP_TOKEN_EXPIRATION: string = '5m';

  async register(username: string, email: string, password: string) {
    try {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        throw new Error('Username or email already exists');
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, this.BCRYPT_ROUNDS);

      // Créer le nouvel utilisateur
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role: 'user',
        twoFactorEnabled: false
      });

      await logSecurity('user_registered', {
        userId: user._id,
        email: user.email,
        username: user.username
      });

      return this.generateTokens(user);
    } catch (error) {
      await logError(error as Error);
      throw error;
    }
  }

  async login(email: string, password: string, deviceInfo: DeviceInfo): Promise<LoginResponse> {
    try {
      // Trouver l'utilisateur
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Vérifier le mot de passe
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Analyser le risque de connexion
      const riskAnalysis = await behaviorAnalysis.analyzeLoginAttempt(
        user._id.toString(),
        deviceInfo.ipAddress,
        deviceInfo.userAgent
      );

      // Si le risque est élevé, forcer la 2FA
      if (riskAnalysis.requiresVerification && !user.twoFactorEnabled) {
        await this.enableTwoFactorTemp(user._id.toString());
      }

      // Vérifier si 2FA est activé
      if (user.twoFactorEnabled) {
        const tempToken = this.generateTempToken(user._id);
        
        // Stocker les informations de l'appareil pour la vérification finale
        await redis.setex(
          `temp_device:${user._id}`,
          300, // 5 minutes
          JSON.stringify(deviceInfo)
        );

        return {
          requiresTwoFactor: true,
          tempToken
        };
      }

      // Créer une nouvelle session
      const session = await this.createSession(user._id, deviceInfo);

      await logSecurity('user_login', {
        userId: user._id,
        deviceInfo,
        riskAnalysis
      });

      const tokens = this.generateTokens(user);
      return {
        ...tokens,
        sessionId: session._id
      };
    } catch (error) {
      await logError(error as Error);
      throw error;
    }
  }

  async initTwoFactor(userId: string, method: '2fa_totp' | '2fa_sms' | '2fa_email') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let setupData;
      switch (method) {
        case '2fa_totp':
          setupData = await twoFactorAuth.generateTOTP(user.email);
          break;
        case '2fa_sms':
          // Vérifier si le numéro de téléphone est configuré
          if (!user.phoneNumber) {
            throw new Error('Phone number not configured');
          }
          setupData = { phoneNumber: user.phoneNumber };
          break;
        case '2fa_email':
          setupData = { email: user.email };
          break;
        default:
          throw new Error('Invalid 2FA method');
      }

      // Stocker les informations temporaires
      await redis.setex(
        `2fa_setup:${userId}`,
        300, // 5 minutes
        JSON.stringify({ method, ...setupData })
      );

      return setupData;
    } catch (error) {
      await logError(error as Error);
      throw error;
    }
  }

  async verifyAndEnableTwoFactor(
    userId: string,
    method: string,
    code: string,
    secret?: string
  ) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const setupData = await redis.get(`2fa_setup:${userId}`);
      if (!setupData) {
        throw new Error('Setup session expired');
      }

      const { method: storedMethod, ...data } = JSON.parse(setupData);
      if (method !== storedMethod) {
        throw new Error('Method mismatch');
      }

      let isValid = false;
      switch (method) {
        case '2fa_totp':
          isValid = twoFactorAuth.verifyTOTP(secret || '', code);
          if (isValid) {
            user.twoFactorSecret = secret;
            user.twoFactorMethod = method;
          }
          break;
        case '2fa_sms':
        case '2fa_email':
          // Vérifier le code stocké dans Redis
          const storedCode = await redis.get(`2fa_code:${userId}`);
          isValid = storedCode === code;
          if (isValid) {
            user.twoFactorMethod = method;
          }
          break;
      }

      if (!isValid) {
        throw new Error('Invalid verification code');
      }

      // Générer les codes de secours
      const backupCodes = await twoFactorAuth.generateBackupCodes(userId);

      user.twoFactorEnabled = true;
      user.backupCodes = backupCodes;
      await user.save();

      // Nettoyer les données temporaires
      await redis.del(`2fa_setup:${userId}`);
      await redis.del(`2fa_code:${userId}`);

      await logSecurity('2fa_enabled', {
        userId,
        method,
        timestamp: new Date()
      });

      return { success: true, backupCodes };
    } catch (error) {
      await logError(error as Error);
      throw error;
    }
  }

  async disableTwoFactor(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.twoFactorEnabled = false;
      user.twoFactorSecret = undefined;
      user.twoFactorMethod = undefined;
      user.backupCodes = [];
      await user.save();

      await logSecurity('2fa_disabled', {
        userId,
        timestamp: new Date()
      });

      return { success: true };
    } catch (error) {
      await logError(error as Error);
      throw error;
    }
  }

  async getBackupCodes(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.twoFactorEnabled) {
        throw new Error('2FA not enabled');
      }

      return user.backupCodes || [];
    } catch (error) {
      await logError(error as Error);
      throw error;
    }
  }

  async regenerateBackupCodes(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.twoFactorEnabled) {
        throw new Error('2FA not enabled');
      }

      const newCodes = await twoFactorAuth.generateBackupCodes(userId);
      user.backupCodes = newCodes;
      await user.save();

      await logSecurity('backup_codes_regenerated', {
        userId,
        timestamp: new Date()
      });

      return newCodes;
    } catch (error) {
      await logError(error as Error);
      throw error;
    }
  }

  private async createSession(userId: string, deviceInfo: DeviceInfo) {
    return Session.create({
      userId,
      deviceId: deviceInfo.deviceId,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      lastActivity: new Date()
    });
  }

  private generateTokens(user: any) {
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRATION }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, version: user.tokenVersion },
      this.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { token, refreshToken };
  }

  private generateTempToken(userId: string) {
    return jwt.sign(
      { userId, temp: true },
      this.JWT_SECRET,
      { expiresIn: this.TEMP_TOKEN_EXPIRATION }
    );
  }

  private async enableTwoFactorTemp(userId: string) {
    const user = await User.findById(userId);
    if (user) {
      user.twoFactorEnabled = true;
      user.twoFactorMethod = '2fa_email'; // Par défaut, utiliser l'email
      await user.save();
    }
  }
}

export const authService = new AuthService();
