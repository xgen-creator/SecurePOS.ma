/**
 * Access Log Routes - Journalisation des accès visiteurs
 * 
 * Routes:
 * POST /api/access-log/whatsapp - Journalise une tentative de contact WhatsApp
 */

import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../../config/database';
import { logger } from '../../services/utils/logger';

const router = Router();

/**
 * POST /api/access-log/whatsapp
 * Journalise une tentative de contact WhatsApp anonyme
 */
router.post('/whatsapp', async (req: Request, res: Response) => {
  try {
    const { tagCode, method, timestamp } = req.body;

    if (!tagCode || !method) {
      res.status(400).json({ error: 'tagCode and method are required' });
      return;
    }

    const supabase = getSupabaseClient();

    // Récupérer le tag pour obtenir property_id
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('id, property_id')
      .eq('tag_code', tagCode)
      .single();

    if (tagError || !tag) {
      logger.error('Tag not found for access log', { tagCode, error: tagError?.message });
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    // Insérer dans access_logs avec auth_method WHATSAPP
    const { error: insertError } = await supabase
      .from('access_logs')
      .insert({
        action: 'VISITOR',
        status: 'PENDING', // Le visiteur a ouvert WhatsApp mais pas encore envoyé de message
        method: 'WHATSAPP',
        property_id: tag.property_id,
        ip_address: req.ip || req.headers['x-forwarded-for'] || null,
        user_agent: req.headers['user-agent'] || null,
        metadata: {
          tag_code: tagCode,
          initiated_at: timestamp || new Date().toISOString(),
          source: 'visitor_webapp'
        }
      });

    if (insertError) {
      logger.error('Failed to log WhatsApp access', { 
        error: insertError.message, 
        tagCode,
        details: insertError 
      });
      res.status(500).json({ error: 'Failed to log access' });
      return;
    }

    logger.info('WhatsApp access logged', { tagCode, propertyId: tag.property_id });
    
    res.json({ 
      success: true, 
      message: 'Access logged successfully',
      tagCode 
    });

  } catch (error) {
    logger.error('Error logging WhatsApp access', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
