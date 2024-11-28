const twilio = require('twilio');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const redis = require('../config/redis');
const userService = require('./user-service');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TwoFactorAuthService {
    constructor() {
        this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        this.redis = redis;
        this.APP_NAME = 'ScanBell';
    }

    async generateCode() {
        return crypto.randomInt(100000, 999999).toString();
    }

    async generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            const code = crypto.randomBytes(4).toString('hex');
            codes.push(code);
        }
        return codes;
    }

    async sendSMSCode(phoneNumber, code) {
        try {
            // Vérifier le rate limiting
            const attempts = await this.redis.incr(`sms_attempts:${phoneNumber}`);
            await this.redis.expire(`sms_attempts:${phoneNumber}`, 3600); // expire après 1 heure

            if (attempts > 5) {
                throw new Error('Trop de tentatives. Réessayez dans 1 heure.');
            }

            await this.twilioClient.messages.create({
                body: `Votre code de vérification ScanBell est : ${code}`,
                to: phoneNumber,
                from: process.env.TWILIO_PHONE_NUMBER
            });
            return true;
        } catch (error) {
            console.error('Erreur envoi SMS:', error);
            throw error;
        }
    }

    async sendEmailCode(email, code) {
        try {
            // Vérifier le rate limiting
            const attempts = await this.redis.incr(`email_attempts:${email}`);
            await this.redis.expire(`email_attempts:${email}`, 3600); // expire après 1 heure

            if (attempts > 5) {
                throw new Error('Trop de tentatives. Réessayez dans 1 heure.');
            }

            await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM,
                to: email,
                subject: 'Code de vérification ScanBell',
                text: `Votre code de vérification est : ${code}`,
                html: `
                    <div style="padding: 20px; background: #f5f5f5;">
                        <h2>Vérification ScanBell</h2>
                        <p>Votre code de vérification est :</p>
                        <h1 style="color: #4a90e2;">${code}</h1>
                        <p>Ce code expire dans 10 minutes.</p>
                    </div>
                `
            });
            return true;
        } catch (error) {
            console.error('Erreur envoi email:', error);
            throw error;
        }
    }

    async verifyCode(userId, code, type = '2fa') {
        try {
            // Vérifier le rate limiting
            const attempts = await this.redis.incr(`verify_attempts:${userId}`);
            await this.redis.expire(`verify_attempts:${userId}`, 300); // expire après 5 minutes

            if (attempts > 5) {
                throw new Error('Trop de tentatives. Réessayez dans 5 minutes.');
            }

            if (type === 'backup') {
                const backupCodes = JSON.parse(await this.redis.get(`backup_codes:${userId}`));
                if (!backupCodes || !backupCodes.includes(code)) {
                    return false;
                }
                // Supprimer le code de backup utilisé
                const updatedCodes = backupCodes.filter(c => c !== code);
                await this.redis.set(`backup_codes:${userId}`, JSON.stringify(updatedCodes));
                return true;
            }

            const storedCode = await this.redis.get(`2fa:${userId}`);
            if (!storedCode) {
                throw new Error('Code expiré');
            }

            return code === storedCode;
        } catch (error) {
            console.error('Erreur vérification code:', error);
            throw error;
        }
    }

    async setupTwoFactor(userId, method) {
        try {
            const user = await userService.getUserById(userId);
            const code = await this.generateCode();
            // Générer et stocker les codes de backup
            const backupCodes = await this.generateBackupCodes();
            await this.redis.set(`backup_codes:${userId}`, JSON.stringify(backupCodes));
            
            // Stocker le code 2FA avec expiration
            await this.redis.set(`2fa:${userId}`, code);
            await this.redis.expire(`2fa:${userId}`, 600); // expire après 10 minutes
            
            if (method === 'sms') {
                await this.sendSMSCode(user.phoneNumber, code);
                return { success: true, backupCodes };
            } else if (method === 'email') {
                await this.sendEmailCode(user.email, code);
                return { success: true, backupCodes };
            }
            
            return { success: false };
        } catch (error) {
            console.error('Erreur setup 2FA:', error);
            throw error;
        }
    }

    async disableTwoFactor(userId) {
        try {
            await this.redis.set(`2fa:disabled:${userId}`, 'true');
            await this.redis.del(`backup_codes:${userId}`);
            return true;
        } catch (error) {
            console.error('Erreur désactivation 2FA:', error);
            throw error;
        }
    }

    async setupTOTP(userId) {
        try {
            const secret = speakeasy.generateSecret({
                name: `${this.APP_NAME} (${userId})`
            });

            // Store secret temporarily until verified
            await this.redis.set(`totp_temp:${userId}`, secret.base32);
            await this.redis.expire(`totp_temp:${userId}`, 600); // 10 minutes to verify

            // Generate QR code
            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

            return {
                secret: secret.base32,
                qrCode: qrCodeUrl
            };
        } catch (error) {
            console.error('Error setting up TOTP:', error);
            throw error;
        }
    }

    async verifyTOTP(userId, token) {
        try {
            const secret = await this.redis.get(`totp:${userId}`) || 
                          await this.redis.get(`totp_temp:${userId}`);
            
            if (!secret) {
                throw new Error('TOTP not set up');
            }

            const verified = speakeasy.totp.verify({
                secret: secret,
                encoding: 'base32',
                token: token,
                window: 1 // Allow 30 seconds before/after
            });

            if (verified) {
                // If verifying temp secret, make it permanent
                if (await this.redis.get(`totp_temp:${userId}`)) {
                    await this.redis.set(`totp:${userId}`, secret);
                    await this.redis.del(`totp_temp:${userId}`);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error verifying TOTP:', error);
            throw error;
        }
    }

    async track2FASession(userId, deviceId) {
        try {
            const sessionKey = `2fa_session:${userId}:${deviceId}`;
            await this.redis.set(sessionKey, 'verified');
            await this.redis.expire(sessionKey, 30 * 24 * 60 * 60); // 30 days
            return true;
        } catch (error) {
            console.error('Error tracking 2FA session:', error);
            throw error;
        }
    }

    async verify2FASession(userId, deviceId) {
        try {
            const sessionKey = `2fa_session:${userId}:${deviceId}`;
            return await this.redis.get(sessionKey) === 'verified';
        } catch (error) {
            console.error('Error verifying 2FA session:', error);
            return false;
        }
    }

    async invalidate2FASession(userId, deviceId) {
        try {
            const sessionKey = `2fa_session:${userId}:${deviceId}`;
            await this.redis.del(sessionKey);
            return true;
        } catch (error) {
            console.error('Error invalidating 2FA session:', error);
            throw error;
        }
    }

    async generateRecoveryCodes(userId) {
        try {
            const codes = [];
            for (let i = 0; i < 10; i++) {
                // Format: XXXX-XXXX-XXXX
                const code = [
                    crypto.randomBytes(2).toString('hex').toUpperCase(),
                    crypto.randomBytes(2).toString('hex').toUpperCase(),
                    crypto.randomBytes(2).toString('hex').toUpperCase()
                ].join('-');
                codes.push(code);
            }

            // Hash codes before storing
            const hashedCodes = codes.map(code => 
                crypto.createHash('sha256').update(code).digest('hex')
            );

            await this.redis.set(`recovery_codes:${userId}`, JSON.stringify(hashedCodes));
            return codes; // Return plain codes to user
        } catch (error) {
            console.error('Error generating recovery codes:', error);
            throw error;
        }
    }

    async verifyRecoveryCode(userId, code) {
        try {
            const storedCodes = JSON.parse(await this.redis.get(`recovery_codes:${userId}`));
            if (!storedCodes) {
                return false;
            }

            const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
            const index = storedCodes.indexOf(hashedInput);

            if (index === -1) {
                return false;
            }

            // Remove used code
            storedCodes.splice(index, 1);
            await this.redis.set(`recovery_codes:${userId}`, JSON.stringify(storedCodes));

            return true;
        } catch (error) {
            console.error('Error verifying recovery code:', error);
            throw error;
        }
    }
}

module.exports = new TwoFactorAuthService();
