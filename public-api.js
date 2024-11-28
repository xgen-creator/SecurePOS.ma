// publicApiService.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

class PublicApiService {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Sécurité
    this.app.use(helmet());
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limite par IP
    });
    this.app.use(limiter);

    // Parsing
    this.app.use(express.json());
    
    // Authentication
    this.app.use(this.authenticateRequest);
  }

  setupRoutes() {
    // Endpoints publics
    this.app.get('/api/v1/status', this.getSystemStatus);
    
    // Gestion des périphériques
    this.app.get('/api/v1/devices', this.getDevices);
    this.app.get('/api/v1/devices/:id', this.getDeviceById);
    this.app.post('/api/v1/devices/:id/control', this.controlDevice);
    
    // Événements
    this.app.get('/api/v1/events', this.getEvents);
    this.app.post('/api/v1/events/webhook', this.registerWebhook);
    
    // Notifications
    this.app.post('/api/v1/notifications', this.sendNotification);
    
    // Accès
    this.app.post('/api/v1/access/grant', this.grantAccess);
    this.app.post('/api/v1/access/revoke', this.revokeAccess);
  }

  async authenticateRequest(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key requise' });
    }

    try {
      const client = await this.validateApiKey(apiKey);
      req.client = client;
      next();
    } catch (error) {
      res.status(401).json({ error: 'API key invalide' });
    }
  }

  async getSystemStatus(req, res) {
    try {
      const status = await this.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async controlDevice(req, res) {
    const { id } = req.params;
    const { action, parameters } = req.body;

    try {
      const result = await this.executeDeviceAction(id, action, parameters);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async registerWebhook(req, res) {
    const { url, events, secret } = req.body;

    try {
      const webhook = await this.createWebhook({
        url,
        events,
        secret,
        clientId: req.client.id
      });

      res.json(webhook);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async sendNotification(req, res) {
    const { recipients, message, type } = req.body;

    try {
      const notification = await this.sendUserNotification({
        recipients,
        message,
        type,
        sender: req.client.id
      });

      res.json(notification);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  generateApiDocs() {
    return {
      openapi: '3.0.0',
      info: {
        title: 'ScanBell API',
        version: '1.0.0',
        description: 'API publique pour l\'intégration avec ScanBell'
      },
      paths: {
        '/api/v1/devices': {
          get: {
            summary: 'Liste des périphériques',
            parameters: [
              {
                name: 'type',
                in: 'query',
                schema: { type: 'string' }
              }
            ],
            responses: {
              '200': {
                description: 'Liste des périphériques',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Device' }
                    }
                  }
                }
              }
            }
          }
        }
        // ... autres endpoints
      }
    };
  }
}

export default new PublicApiService();
