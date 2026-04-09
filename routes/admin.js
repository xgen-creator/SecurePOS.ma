const express = require('express');
const router = express.Router();
const multer = require('multer');
const ImageManagerService = require('../services/image-manager');
const ContentManagerService = require('../services/content-manager');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Configuration de multer pour le téléchargement des images
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Seules les images sont autorisées'));
    }
    cb(null, true);
  }
});

const imageManager = new ImageManagerService();
const contentManager = new ContentManagerService();

// Récupérer tous les slides
router.get('/slides', authenticate, requireAdmin, async (req, res) => {
  try {
    const slides = await imageManager.getSlides();
    res.json(slides);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des slides' });
  }
});

// Ajouter un nouveau slide
router.post('/slides', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image requise' });
    }

    const { title, description } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Titre et description requis' });
    }

    const slide = await imageManager.addSlide(
      req.file.buffer,
      req.file.originalname,
      title,
      description
    );

    res.status(201).json(slide);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'ajout du slide' });
  }
});

// Mettre à jour un slide
router.put('/slides/:id', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Titre et description requis' });
    }

    const slide = await imageManager.updateSlide(
      id,
      req.file?.buffer,
      req.file?.originalname,
      title,
      description
    );

    res.json(slide);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour du slide' });
  }
});

// Supprimer un slide
router.delete('/slides/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await imageManager.deleteSlide(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du slide' });
  }
});

// Réorganiser les slides
router.post('/slides/reorder', authenticate, requireAdmin, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'Liste d\'IDs requise' });
    }

    const slides = await imageManager.reorderSlides(orderedIds);
    res.json(slides);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la réorganisation des slides' });
  }
});

// Routes de gestion du contenu
router.get('/pages', authenticate, requireAdmin, async (req, res) => {
  try {
    const pages = await contentManager.getPages();
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des pages' });
  }
});

router.get('/pages/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const page = await contentManager.getPageById(id);
    if (!page) {
      return res.status(404).json({ error: 'Page non trouvée' });
    }
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la page' });
  }
});

router.post('/pages', authenticate, requireAdmin, async (req, res) => {
  try {
    const pageData = req.body;
    const newPage = await contentManager.createPage(pageData);
    res.status(201).json(newPage);
  } catch (error) {
    if (error.message === 'Un contenu avec ce slug existe déjà') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erreur lors de la création de la page' });
  }
});

router.put('/pages/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pageData = req.body;
    const updatedPage = await contentManager.updatePage(id, pageData);
    res.json(updatedPage);
  } catch (error) {
    if (error.message === 'Page non trouvée') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Un contenu avec ce slug existe déjà') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la page' });
  }
});

router.delete('/pages/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await contentManager.deletePage(id);
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'Page non trouvée') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression de la page' });
  }
});

router.get('/pages/search', authenticate, requireAdmin, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Paramètre de recherche requis' });
    }
    const results = await contentManager.searchPages(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

module.exports = router;
