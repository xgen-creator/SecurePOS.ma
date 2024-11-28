import express from 'express';
import { TagController } from '../controllers/tag.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const tagController = new TagController();

// Routes publiques
router.get('/scan/:tagId', tagController.getTagInfo);

// Routes protégées (nécessitent authentification)
router.use(authMiddleware);

// CRUD Tags
router.post('/', tagController.createTag);
router.get('/my-tags', tagController.getMyTags);
router.get('/:id', tagController.getTag);
router.put('/:id', tagController.updateTag);
router.delete('/:id', tagController.deleteTag);

// Statistiques
router.get('/:id/stats', tagController.getTagStats);
router.get('/my-tags/stats', tagController.getAllTagsStats);

// Configuration
router.put('/:id/settings', tagController.updateTagSettings);
router.put('/:id/availability', tagController.updateAvailability);

export default router;
