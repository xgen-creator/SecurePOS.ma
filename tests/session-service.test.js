const sessionService = require('../services/session-service');
const { redisClient } = require('../config/redis');
const jwt = require('jsonwebtoken');

// Mock des dépendances
jest.mock('../config/redis', () => ({
    redisClient: {
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        sadd: jest.fn(),
        srem: jest.fn(),
        smembers: jest.fn(),
        keys: jest.fn()
    }
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn()
}));

describe('SessionService', () => {
    beforeEach(() => {
        // Réinitialiser tous les mocks avant chaque test
        jest.clearAllMocks();
    });

    describe('createSession', () => {
        const mockUserId = 'user123';
        const mockUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        const mockIp = '127.0.0.1';
        const mockSessionId = 'session123';

        beforeEach(() => {
            jwt.sign.mockReturnValue(mockSessionId);
        });

        it('devrait créer une nouvelle session avec succès', async () => {
            // Arrange
            const expectedSessionData = {
                id: mockSessionId,
                userId: mockUserId,
                deviceInfo: expect.any(Object),
                ip: mockIp,
                location: expect.any(String),
                startTime: expect.any(String),
                lastActivity: expect.any(String)
            };

            // Act
            const result = await sessionService.createSession(mockUserId, mockUserAgent, mockIp);

            // Assert
            expect(result).toMatchObject(expectedSessionData);
            expect(redisClient.set).toHaveBeenCalledWith(
                `session:${mockSessionId}`,
                expect.any(String),
                'EX',
                expect.any(Number)
            );
            expect(redisClient.sadd).toHaveBeenCalledWith(
                `session:user:${mockUserId}`,
                mockSessionId
            );
        });
    });

    describe('getSession', () => {
        const mockSessionId = 'session123';
        const mockSessionData = {
            id: mockSessionId,
            userId: 'user123'
        };

        it('devrait retourner une session existante', async () => {
            // Arrange
            redisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));

            // Act
            const result = await sessionService.getSession(mockSessionId);

            // Assert
            expect(result).toEqual(mockSessionData);
            expect(redisClient.get).toHaveBeenCalledWith(`session:${mockSessionId}`);
        });

        it('devrait retourner null pour une session inexistante', async () => {
            // Arrange
            redisClient.get.mockResolvedValue(null);

            // Act
            const result = await sessionService.getSession(mockSessionId);

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('updateSessionActivity', () => {
        const mockSessionId = 'session123';
        const mockSessionData = {
            id: mockSessionId,
            userId: 'user123',
            lastActivity: '2023-01-01T00:00:00.000Z'
        };

        it('devrait mettre à jour lastActivity', async () => {
            // Arrange
            redisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));

            // Act
            await sessionService.updateSessionActivity(mockSessionId);

            // Assert
            expect(redisClient.set).toHaveBeenCalledWith(
                `session:${mockSessionId}`,
                expect.any(String),
                'EX',
                expect.any(Number)
            );
            
            const updatedData = JSON.parse(redisClient.set.mock.calls[0][1]);
            expect(new Date(updatedData.lastActivity)).toBeInstanceOf(Date);
        });
    });

    describe('terminateSession', () => {
        const mockSessionId = 'session123';
        const mockSessionData = {
            id: mockSessionId,
            userId: 'user123'
        };

        it('devrait terminer une session existante', async () => {
            // Arrange
            redisClient.get.mockResolvedValue(JSON.stringify(mockSessionData));

            // Act
            const result = await sessionService.terminateSession(mockSessionId);

            // Assert
            expect(result).toBe(true);
            expect(redisClient.del).toHaveBeenCalledWith(`session:${mockSessionId}`);
            expect(redisClient.srem).toHaveBeenCalledWith(
                `session:user:${mockSessionData.userId}`,
                mockSessionId
            );
        });

        it('devrait retourner false pour une session inexistante', async () => {
            // Arrange
            redisClient.get.mockResolvedValue(null);

            // Act
            const result = await sessionService.terminateSession(mockSessionId);

            // Assert
            expect(result).toBe(false);
            expect(redisClient.del).not.toHaveBeenCalled();
            expect(redisClient.srem).not.toHaveBeenCalled();
        });
    });

    describe('getUserSessions', () => {
        const mockUserId = 'user123';
        const mockSessionIds = ['session1', 'session2'];
        const mockSessions = [
            { id: 'session1', userId: mockUserId },
            { id: 'session2', userId: mockUserId }
        ];

        it('devrait retourner toutes les sessions actives', async () => {
            // Arrange
            redisClient.smembers.mockResolvedValue(mockSessionIds);
            redisClient.get
                .mockResolvedValueOnce(JSON.stringify(mockSessions[0]))
                .mockResolvedValueOnce(JSON.stringify(mockSessions[1]));

            // Act
            const result = await sessionService.getUserSessions(mockUserId);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject(mockSessions[0]);
            expect(result[1]).toMatchObject(mockSessions[1]);
        });

        it('devrait marquer la session courante', async () => {
            // Arrange
            const currentSessionId = 'session1';
            redisClient.smembers.mockResolvedValue(mockSessionIds);
            redisClient.get
                .mockResolvedValueOnce(JSON.stringify(mockSessions[0]))
                .mockResolvedValueOnce(JSON.stringify(mockSessions[1]));

            // Act
            const result = await sessionService.getUserSessions(mockUserId, currentSessionId);

            // Assert
            expect(result[0].isCurrent).toBe(true);
            expect(result[1].isCurrent).toBe(false);
        });
    });

    describe('cleanupExpiredSessions', () => {
        it('devrait nettoyer les sessions expirées', async () => {
            // Arrange
            const mockKeys = ['session:1', 'session:2'];
            redisClient.keys.mockResolvedValue(mockKeys);
            redisClient.get.mockResolvedValue(null);

            // Act
            await sessionService.cleanupExpiredSessions();

            // Assert
            expect(redisClient.keys).toHaveBeenCalledWith('session:*');
            expect(redisClient.get).toHaveBeenCalledTimes(mockKeys.length);
        });
    });
});
