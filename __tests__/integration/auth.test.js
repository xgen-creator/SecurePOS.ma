const request = require('supertest');
const app = require('../../app');
const { redisClient } = require('../../config/redis');
const { getUserById } = require('../../services/user-service');

describe('Authentication Integration Tests', () => {
    let testUser;
    let authToken;

    beforeAll(async () => {
        // Créer un utilisateur de test
        testUser = {
            id: 'test-user-id',
            email: 'test@example.com',
            password: 'Password123!',
            phoneNumber: '+33600000000'
        };
    });

    afterAll(async () => {
        await redisClient.quit();
    });

    describe('Login Flow', () => {
        it('should login successfully without 2FA', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            authToken = response.body.token;
        });

        it('should require 2FA after enabling it', async () => {
            // Activer la 2FA
            const setupResponse = await request(app)
                .post('/api/security/setup-2fa')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    userId: testUser.id,
                    method: 'email'
                });

            expect(setupResponse.status).toBe(200);
            expect(setupResponse.body).toHaveProperty('backupCodes');

            // Tenter de se connecter
            const loginResponse = await request(app)
                .post('/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(loginResponse.status).toBe(200);
            expect(loginResponse.body.status).toBe('pending_2fa');
            expect(loginResponse.body).toHaveProperty('userId');
        });

        it('should verify 2FA code successfully', async () => {
            // Récupérer le code 2FA depuis Redis (simulation)
            const code = await redisClient.get(`2fa:${testUser.id}`);

            const response = await request(app)
                .post('/auth/verify-2fa')
                .send({
                    userId: testUser.id,
                    code: code
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
        });

        it('should accept backup codes', async () => {
            // Récupérer les codes de secours
            const user = await getUserById(testUser.id);
            const backupCode = user.backupCodes[0];

            const response = await request(app)
                .post('/auth/verify-2fa')
                .send({
                    userId: testUser.id,
                    code: backupCode,
                    type: 'backup'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
        });
    });

    describe('Security Settings', () => {
        it('should get security settings', async () => {
            const response = await request(app)
                .get(`/api/security/security-settings/${testUser.id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('is2FAEnabled', true);
            expect(response.body).toHaveProperty('current2FAMethod', 'email');
        });

        it('should regenerate backup codes', async () => {
            const response = await request(app)
                .post('/api/security/regenerate-backup-codes')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ userId: testUser.id });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('codes');
            expect(response.body.codes).toHaveLength(8);
        });

        it('should disable 2FA', async () => {
            const response = await request(app)
                .post('/api/security/disable-2fa')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ userId: testUser.id });

            expect(response.status).toBe(200);

            // Vérifier que la 2FA est désactivée
            const settingsResponse = await request(app)
                .get(`/api/security/security-settings/${testUser.id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(settingsResponse.body.is2FAEnabled).toBe(false);
        });
    });

    describe('Error Cases', () => {
        it('should handle invalid 2FA code', async () => {
            const response = await request(app)
                .post('/auth/verify-2fa')
                .send({
                    userId: testUser.id,
                    code: '000000'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle rate limiting', async () => {
            // Tenter plusieurs vérifications
            for (let i = 0; i < 6; i++) {
                await request(app)
                    .post('/auth/verify-2fa')
                    .send({
                        userId: testUser.id,
                        code: '000000'
                    });
            }

            const response = await request(app)
                .post('/auth/verify-2fa')
                .send({
                    userId: testUser.id,
                    code: '000000'
                });

            expect(response.status).toBe(429);
            expect(response.body).toHaveProperty('error');
        });
    });
});
