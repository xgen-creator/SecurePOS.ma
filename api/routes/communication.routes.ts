import express from 'express';
import { CommunicationController } from '../controllers/communication.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const communicationController = new CommunicationController();

// Routes publiques (visiteur)
router.post('/request/:tagId', communicationController.requestCommunication);
router.get('/status/:sessionId', communicationController.getSessionStatus);
router.post('/message/:sessionId', communicationController.sendMessage);

// Routes WebRTC
router.post('/signal/:sessionId', communicationController.handleSignaling);
router.post('/ice-candidate/:sessionId', communicationController.handleIceCandidate);

// Routes protégées (propriétaire)
router.use(authMiddleware);

// Gestion des sessions
router.get('/active', communicationController.getActiveSessions);
router.post('/accept/:sessionId', communicationController.acceptSession);
router.post('/reject/:sessionId', communicationController.rejectSession);
router.post('/end/:sessionId', communicationController.endSession);

// Historique et statistiques
router.get('/history', communicationController.getCommunicationHistory);
router.get('/stats', communicationController.getCommunicationStats);
router.get('/stats/:tagId', communicationController.getTagCommunicationStats);

export default router;
