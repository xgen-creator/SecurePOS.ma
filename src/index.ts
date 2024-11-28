import express from 'express';
import mongoose from 'mongoose';
import { config } from '../config';
import { loggingService } from '../services/LoggingService';
import { eventService } from '../services/EventService';
import { notificationService } from '../services/NotificationService';
import { expressionAnalysisService } from '../services/ExpressionAnalysisService';
import { sceneAutomationService } from '../services/SceneAutomationService';
import { setupFaceAPI } from '../facial-recognition';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connexion à MongoDB
mongoose.connect(config.database.uri, config.database.options)
  .then(() => {
    loggingService.info('Connected to MongoDB');
  })
  .catch((error) => {
    loggingService.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Configuration de face-api.js
setupFaceAPI().then(() => {
  loggingService.info('Face-API models loaded successfully');
}).catch(error => {
  loggingService.error('Error loading Face-API models:', error);
});

// Routes de base
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Gestion des erreurs
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  loggingService.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.server.env === 'development' ? err.message : undefined
  });
});

// Démarrage du serveur
const server = app.listen(config.server.port, () => {
  loggingService.info(`Server is running on port ${config.server.port}`);
  
  // Initialiser les services
  eventService.emit('system-started', {
    timestamp: new Date(),
    environment: config.server.env
  });
});

// Gestion de l'arrêt gracieux
process.on('SIGTERM', () => {
  loggingService.info('SIGTERM signal received');
  server.close(() => {
    loggingService.info('Server closed');
    mongoose.connection.close(false).then(() => {
      loggingService.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});
