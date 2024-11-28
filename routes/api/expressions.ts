import { Router } from 'express';
import { ExpressionController } from '../../controllers/ExpressionController';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validation';
import { expressionValidation } from '../../validations/expressionValidation';

const router = Router();
const controller = new ExpressionController();

// Routes pour l'analyse des expressions
router.post(
  '/analyze',
  authenticate,
  validate(expressionValidation.analyze),
  controller.analyzeExpression
);

// Routes pour les statistiques
router.get(
  '/stats/:profileId',
  authenticate,
  validate(expressionValidation.getStats),
  controller.getExpressionStats
);

// Routes pour les prédictions
router.get(
  '/predictions/:profileId',
  authenticate,
  validate(expressionValidation.getPredictions),
  controller.getPredictions
);

// Routes pour les insights
router.get(
  '/insights/:profileId',
  authenticate,
  validate(expressionValidation.getInsights),
  controller.getInsights
);

// Routes pour les déclencheurs
router.get(
  '/triggers/:profileId',
  authenticate,
  validate(expressionValidation.getTriggers),
  controller.getProfileTriggers
);

router.post(
  '/triggers',
  authenticate,
  validate(expressionValidation.createTrigger),
  controller.createTrigger
);

router.put(
  '/triggers/:triggerId',
  authenticate,
  validate(expressionValidation.updateTrigger),
  controller.updateTrigger
);

router.delete(
  '/triggers/:triggerId',
  authenticate,
  validate(expressionValidation.deleteTrigger),
  controller.deleteTrigger
);

export default router;
