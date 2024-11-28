const twoFactorAuth = require('../../services/two-factor-auth');
const redis = require('../../config/redis');
const userService = require('../../services/user-service');

jest.mock('../../config/redis');
jest.mock('../../services/user-service');
jest.mock('twilio');
jest.mock('nodemailer');

describe('TwoFactorAuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateCode', () => {
        it('should generate a 6-digit code', async () => {
            const code = await twoFactorAuth.generateCode();
            expect(code).toMatch(/^\d{6}$/);
        });
    });

    describe('generateBackupCodes', () => {
        it('should generate 10 unique backup codes', async () => {
            const codes = await twoFactorAuth.generateBackupCodes();
            expect(codes).toHaveLength(10);
            expect(new Set(codes).size).toBe(10); // vérifie l'unicité
            codes.forEach(code => {
                expect(code).toMatch(/^[0-9a-f]{8}$/);
            });
        });
    });

    describe('sendSMSCode', () => {
        const mockPhone = '+33123456789';
        const mockCode = '123456';

        it('should send SMS successfully', async () => {
            redis.incr.mockResolvedValue(1);
            redis.expire.mockResolvedValue(true);

            await expect(twoFactorAuth.sendSMSCode(mockPhone, mockCode))
                .resolves.toBe(true);
        });

        it('should throw error after too many attempts', async () => {
            redis.incr.mockResolvedValue(6);
            redis.expire.mockResolvedValue(true);

            await expect(twoFactorAuth.sendSMSCode(mockPhone, mockCode))
                .rejects.toThrow('Trop de tentatives');
        });
    });

    describe('sendEmailCode', () => {
        const mockEmail = 'test@example.com';
        const mockCode = '123456';

        it('should send email successfully', async () => {
            redis.incr.mockResolvedValue(1);
            redis.expire.mockResolvedValue(true);

            await expect(twoFactorAuth.sendEmailCode(mockEmail, mockCode))
                .resolves.toBe(true);
        });

        it('should throw error after too many attempts', async () => {
            redis.incr.mockResolvedValue(6);
            redis.expire.mockResolvedValue(true);

            await expect(twoFactorAuth.sendEmailCode(mockEmail, mockCode))
                .rejects.toThrow('Trop de tentatives');
        });
    });

    describe('verifyCode', () => {
        const mockUserId = 'user123';
        const mockCode = '123456';

        it('should verify 2FA code successfully', async () => {
            redis.incr.mockResolvedValue(1);
            redis.expire.mockResolvedValue(true);
            redis.get.mockResolvedValue(mockCode);

            const result = await twoFactorAuth.verifyCode(mockUserId, mockCode);
            expect(result).toBe(true);
        });

        it('should verify backup code successfully', async () => {
            redis.incr.mockResolvedValue(1);
            redis.expire.mockResolvedValue(true);
            redis.get.mockResolvedValue(JSON.stringify(['abc123', 'def456']));

            const result = await twoFactorAuth.verifyCode(mockUserId, 'abc123', 'backup');
            expect(result).toBe(true);
        });

        it('should fail with invalid code', async () => {
            redis.incr.mockResolvedValue(1);
            redis.expire.mockResolvedValue(true);
            redis.get.mockResolvedValue('different-code');

            const result = await twoFactorAuth.verifyCode(mockUserId, mockCode);
            expect(result).toBe(false);
        });

        it('should throw error after too many attempts', async () => {
            redis.incr.mockResolvedValue(6);
            redis.expire.mockResolvedValue(true);

            await expect(twoFactorAuth.verifyCode(mockUserId, mockCode))
                .rejects.toThrow('Trop de tentatives');
        });
    });

    describe('setupTwoFactor', () => {
        const mockUserId = 'user123';
        const mockUser = {
            id: 'user123',
            email: 'test@example.com',
            phoneNumber: '+33123456789'
        };

        beforeEach(() => {
            userService.getUserById.mockResolvedValue(mockUser);
            redis.set.mockResolvedValue('OK');
            redis.expire.mockResolvedValue(true);
        });

        it('should setup email 2FA successfully', async () => {
            const result = await twoFactorAuth.setupTwoFactor(mockUserId, 'email');
            expect(result.success).toBe(true);
            expect(result.backupCodes).toHaveLength(10);
        });

        it('should setup SMS 2FA successfully', async () => {
            const result = await twoFactorAuth.setupTwoFactor(mockUserId, 'sms');
            expect(result.success).toBe(true);
            expect(result.backupCodes).toHaveLength(10);
        });

        it('should fail with invalid method', async () => {
            const result = await twoFactorAuth.setupTwoFactor(mockUserId, 'invalid');
            expect(result.success).toBe(false);
        });
    });

    describe('disableTwoFactor', () => {
        const mockUserId = 'user123';

        it('should disable 2FA successfully', async () => {
            redis.set.mockResolvedValue('OK');
            redis.del.mockResolvedValue(1);

            const result = await twoFactorAuth.disableTwoFactor(mockUserId);
            expect(result).toBe(true);
        });

        it('should handle errors gracefully', async () => {
            redis.set.mockRejectedValue(new Error('Redis error'));

            await expect(twoFactorAuth.disableTwoFactor(mockUserId))
                .rejects.toThrow('Redis error');
        });
    });
});
