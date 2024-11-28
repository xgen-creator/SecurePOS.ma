// tests/unit/userService.test.js
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import UserService from '../../services/userService';
import DatabaseService from '../../services/databaseService';

describe('UserService', () => {
  let userService;
  
  beforeEach(() => {
    // Mock des dépendances
    jest.spyOn(DatabaseService, 'query').mockImplementation();
    userService = new UserService();
  });

  describe('createUser', () => {
    it('devrait créer un nouvel utilisateur avec les paramètres valides', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      DatabaseService.query.mockResolvedValueOnce({ id: 1, ...userData });

      const result = await userService.createUser(userData);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(userData.email);
      expect(result).not.toHaveProperty('password');
    });

    it('devrait rejeter la création avec un email invalide', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Email invalide');
    });
  });

  describe('authenticate', () => {
    it('devrait authentifier un utilisateur avec des identifiants valides', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      DatabaseService.query.mockResolvedValueOnce({
        id: 1,
        email: credentials.email,
        password: await userService.hashPassword(credentials.password)
      });

      const result = await userService.authenticate(credentials);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
    });

    it('devrait rejeter l\'authentification avec un mot de passe incorrect', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      await expect(userService.authenticate(credentials))
        .rejects
        .toThrow('Identifiants invalides');
    });
  });
});

// tests/integration/doorbell.test.js
describe('DoorbellSystem Integration', () => {
  let server;
  let client;
  let database;

  beforeAll(async () => {
    server = await startTestServer();
    client = await createTestClient();
    database = await createTestDatabase();
  });

  afterAll(async () => {
    await server.close();
    await database.cleanup();
  });

  describe('Processus complet de sonnette', () => {
    it('devrait gérer correctement une séquence de sonnette', async () => {
      // Simuler une sonnette
      const ringEvent = await client.ring();
      expect(ringEvent).toHaveProperty('id');

      // Vérifier la notification
      const notification = await client.getLastNotification();
      expect(notification.type).toBe('DOORBELL_RING');
      expect(notification.deviceId).toBe(ringEvent.deviceId);

      // Répondre à la sonnette
      const response = await client.answerDoorbell(ringEvent.id);
      expect(response.status).toBe('ANSWERED');

      // Vérifier l'enregistrement
      const recording = await client.getRecording(ringEvent.id);
      expect(recording).toHaveProperty('url');
    });
  });

  describe('Processus de livraison', () => {
    it('devrait gérer correctement une livraison', async () => {
      // Créer une livraison
      const delivery = await client.createDelivery({
        courier: 'Amazon',
        trackingNumber: 'TEST123'
      });

      // Simuler l'arrivée du livreur
      const arrivalEvent = await client.simulateCourierArrival(delivery.id);
      expect(arrivalEvent.status).toBe('ARRIVED');

      // Vérifier l'autorisation d'accès
      const access = await client.checkAccess(delivery.id);
      expect(access.granted).toBe(true);

      // Confirmer la livraison
      const confirmation = await client.confirmDelivery(delivery.id);
      expect(confirmation.status).toBe('DELIVERED');
    });
  });
});

// tests/integration/api.test.js
describe('API Integration', () => {
  let app;
  let token;

  beforeAll(async () => {
    app = await createTestApp();
    token = await getTestToken();
  });

  describe('Endpoints d\'authentification', () => {
    it('POST /auth/login devrait authentifier un utilisateur', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'test123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('GET /auth/me devrait retourner le profil utilisateur', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('Endpoints des appareils', () => {
    it('GET /devices devrait lister les appareils', async () => {
      const response = await request(app)
        .get('/devices')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('POST /devices devrait créer un nouvel appareil', async () => {
      const response = await request(app)
        .post('/devices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Device',
          type: 'doorbell'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });
  });
});
