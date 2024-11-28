import express from 'express';
import { Face } from '../../models/FaceModel';
import { Expression } from '../../models/ExpressionModel';
import { AutomationRule } from '../../models/AutomationRuleModel';
import { expressionAnalysisService } from '../../services/ExpressionAnalysisService';
import { sceneAutomationService } from '../../services/SceneAutomationService';
import { loggingService } from '../../services/LoggingService';
import { notificationService } from '../../services/NotificationService';

const router = express.Router();

// Routes pour la gestion des visages
router.get('/faces', async (req, res) => {
  try {
    const faces = await Face.find({ isActive: true });
    res.json(faces);
  } catch (error) {
    loggingService.error('Error fetching faces:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Routes pour les expressions
router.get('/expressions/:personId', async (req, res) => {
  try {
    const expressions = await Expression.find({ 
      personId: req.params.personId 
    }).sort({ timestamp: -1 }).limit(10);
    res.json(expressions);
  } catch (error) {
    loggingService.error('Error fetching expressions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Routes pour les statistiques d'émotions
router.get('/stats/emotions/:personId', async (req, res) => {
  try {
    const stats = await Expression.getEmotionStats(req.params.personId);
    res.json(stats);
  } catch (error) {
    loggingService.error('Error fetching emotion stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Routes pour les règles d'automatisation
router.get('/automation/rules', async (req, res) => {
  try {
    const rules = await AutomationRule.find({ isEnabled: true });
    res.json(rules);
  } catch (error) {
    loggingService.error('Error fetching automation rules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/automation/rules', async (req, res) => {
  try {
    const rule = new AutomationRule(req.body);
    await rule.save();
    res.status(201).json(rule);
  } catch (error) {
    loggingService.error('Error creating automation rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Routes pour les tendances d'humeur
router.get('/mood/trend/:personId', async (req, res) => {
  try {
    const trend = await Expression.getMoodTrend(req.params.personId);
    res.json(trend);
  } catch (error) {
    loggingService.error('Error fetching mood trend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route de test pour la détection faciale
router.post('/test/detect', async (req, res) => {
  try {
    // Cette route sera implémentée plus tard pour tester la détection faciale
    res.status(501).json({ message: 'Not implemented yet' });
  } catch (error) {
    loggingService.error('Error in face detection test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
