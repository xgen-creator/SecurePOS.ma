import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import { redis } from '../config/redis';
import { sendEmail } from './email-service';
import { sendSMS } from './sms-service';
import { logSecurity, logError } from './logging-service';

interface TOTPSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes?: string[];
}

class TwoFactorAuthService {
  private readonly BACKUP_CODES_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 10;
  private readonly CODE_EXPIRATION = 300; // 5 minutes
  private readonly ISSUER = process.env.TWO_FACTOR_ISSUER || 'ScanBell';

  async generateTOTP(email: string): Promise<TOTPSetup> {
    try {
      // Générer un secret TOTP
      const secret = speakeasy.generateSecret({
        name: `${this.ISSUER}:${email}`,
        issuer: this.ISSUER,
      });

      // Générer le QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || '');

      return {
        secret: secret.base32,
        qrCodeUrl,
      };
    } catch (error) {
      await logError(error as Error);
      throw new Error('Failed to generate TOTP setup');
    }
  }

  verifyTOTP(secret: string, token: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1, // Permet une fenêtre de 30 secondes avant/après
      });
    } catch (error) {
      logError(error as Error);
      return false;
    }
  }

  async generateAndSendEmailCode(userId: string, email: string): Promise<void> {
    try {
      const code = this.generateNumericCode();
      
      // Stocker le code dans Redis
      await redis.setex(`2fa_code:${userId}`, this.CODE_EXPIRATION, code);

      // Envoyer le code par email
      await sendEmail({
        to: email,
        subject: `${this.ISSUER} - Code de vérification`,
        text: `Votre code de vérification est : ${code}. Il expire dans 5 minutes.`,
        html: this.generateVerificationEmailTemplate(code),
      });

      await logSecurity('email_2fa_code_sent', {
        userId,
        email,
        timestamp: new Date(),
      });
    } catch (error) {
      await logError(error as Error);
      throw new Error('Failed to send email verification code');
    }
  }

  async generateAndSendSMSCode(userId: string, phoneNumber: string): Promise<void> {
    try {
      const code = this.generateNumericCode();
      
      // Stocker le code dans Redis
      await redis.setex(`2fa_code:${userId}`, this.CODE_EXPIRATION, code);

      // Envoyer le code par SMS
      await sendSMS({
        to: phoneNumber,
        message: `${this.ISSUER}: Votre code de vérification est ${code}. Il expire dans 5 minutes.`,
      });

      await logSecurity('sms_2fa_code_sent', {
        userId,
        phoneNumber,
        timestamp: new Date(),
      });
    } catch (error) {
      await logError(error as Error);
      throw new Error('Failed to send SMS verification code');
    }
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    try {
      const storedCode = await redis.get(`2fa_code:${userId}`);
      if (!storedCode) {
        return false;
      }

      const isValid = storedCode === code;
      if (isValid) {
        // Supprimer le code après une vérification réussie
        await redis.del(`2fa_code:${userId}`);
      }

      await logSecurity('2fa_code_verified', {
        userId,
        success: isValid,
        timestamp: new Date(),
      });

      return isValid;
    } catch (error) {
      await logError(error as Error);
      return false;
    }
  }

  async generateBackupCodes(userId: string): Promise<string[]> {
    try {
      const codes: string[] = [];
      for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
        codes.push(this.generateBackupCode());
      }

      // Hasher les codes avant de les stocker
      const hashedCodes = codes.map(code => this.hashBackupCode(code));

      await logSecurity('backup_codes_generated', {
        userId,
        timestamp: new Date(),
      });

      return codes; // Retourner les codes non hashés à l'utilisateur
    } catch (error) {
      await logError(error as Error);
      throw new Error('Failed to generate backup codes');
    }
  }

  async verifyBackupCode(userId: string, code: string, storedHashedCodes: string[]): Promise<boolean> {
    try {
      const hashedCode = this.hashBackupCode(code);
      const index = storedHashedCodes.indexOf(hashedCode);

      if (index === -1) {
        return false;
      }

      // Supprimer le code utilisé
      storedHashedCodes.splice(index, 1);

      await logSecurity('backup_code_used', {
        userId,
        timestamp: new Date(),
      });

      return true;
    } catch (error) {
      await logError(error as Error);
      return false;
    }
  }

  private generateNumericCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateBackupCode(): string {
    return crypto.randomBytes(this.BACKUP_CODE_LENGTH)
      .toString('hex')
      .slice(0, this.BACKUP_CODE_LENGTH)
      .toUpperCase();
  }

  private hashBackupCode(code: string): string {
    return crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');
  }

  private generateVerificationEmailTemplate(code: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${this.ISSUER} - Vérification en deux étapes</h2>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
          <p style="font-size: 16px;">Votre code de vérification est :</p>
          <h1 style="color: #007bff; letter-spacing: 5px; text-align: center;">${code}</h1>
          <p style="color: #666; font-size: 14px;">Ce code expirera dans 5 minutes.</p>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Si vous n'avez pas demandé ce code, veuillez ignorer cet email et sécuriser votre compte.
        </p>
      </div>
    `;
  }
}

export const twoFactorAuth = new TwoFactorAuthService();
