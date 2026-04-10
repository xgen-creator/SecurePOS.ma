/**
 * Messages Routes - API pour messagerie asynchrone (Tier DIY "Maroc Lite")
 * Scanbell V2.5 - Texte + Audio async
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';

const router = Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/messages/send
 * Envoi de message texte et/ou audio pour tag DIY
 * Accessible publiquement (anonyme)
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { tagId, tagCode, text, audioBase64, duration } = req.body;
    
    // Validation
    if (!tagId && !tagCode) {
      return res.status(400).json({ 
        error: 'Missing tag identifier',
        message: 'Tag ID ou Tag Code requis' 
      });
    }
    
    if (!text && !audioBase64) {
      return res.status(400).json({ 
        error: 'Empty message',
        message: 'Message texte ou audio requis' 
      });
    }
    
    // Rechercher le tag
    let tagQuery = supabase.from('tags').select(`
      *,
      property:property_id (
        id,
        name,
        owner_id
      )
    `).eq('is_active', true);
    
    if (tagId) {
      tagQuery = tagQuery.eq('id', tagId);
    } else {
      tagQuery = tagQuery.eq('tag_code', tagCode);
    }
    
    const { data: tag, error: tagError } = await tagQuery.single();
    
    if (tagError || !tag) {
      logger.warn('Message send attempt on invalid tag', { tagId, tagCode });
      return res.status(404).json({ 
        error: 'Tag not found',
        message: 'Tag invalide ou inactif' 
      });
    }
    
    // Vérifier que c'est un tag DIY (sécurité)
    if (tag.tier !== 'DIY') {
      logger.warn('Message send attempt on non-DIY tag', { 
        tagId: tag.id, 
        tier: tag.tier 
      });
      return res.status(403).json({ 
        error: 'Invalid tier',
        message: 'Cette fonctionnalité est réservée aux tags DIY' 
      });
    }
    
    const ownerId = tag.property?.owner_id;
    const propertyId = tag.property?.id;
    
    if (!ownerId || !propertyId) {
      return res.status(500).json({ 
        error: 'Invalid tag configuration',
        message: 'Configuration du tag invalide' 
      });
    }
    
    let storagePath: string | null = null;
    let fileMetadata: any = null;
    
    // Traitement audio si présent
    if (audioBase64) {
      try {
        // Convertir base64 en buffer
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        
        // Validation taille (max 5MB)
        if (audioBuffer.length > 5 * 1024 * 1024) {
          return res.status(400).json({ 
            error: 'File too large',
            message: 'Fichier audio trop volumineux (max 5MB)' 
          });
        }
        
        // Validation durée (max 30 secondes)
        if (duration && duration > 30) {
          return res.status(400).json({ 
            error: 'Audio too long',
            message: 'Audio trop long (max 30 secondes)' 
          });
        }
        
        // Générer nom de fichier unique
        const timestamp = Date.now();
        const fileName = `audio_${tag.id}_${timestamp}.webm`;
        storagePath = `${tag.id}/${fileName}`;
        
        // Upload vers Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('visitor-messages')
          .upload(storagePath, audioBuffer, {
            contentType: 'audio/webm',
            upsert: false
          });
        
        if (uploadError) {
          logger.error('Audio upload failed', { 
            error: uploadError.message,
            tagId: tag.id 
          });
          return res.status(500).json({ 
            error: 'Upload failed',
            message: 'Erreur lors de l\'upload audio' 
          });
        }
        
        fileMetadata = {
          path: storagePath,
          size: audioBuffer.length,
          duration: duration || null,
          mimeType: 'audio/webm'
        };
        
        logger.info('Audio uploaded successfully', {
          tagId: tag.id,
          path: storagePath,
          size: audioBuffer.length
        });
        
      } catch (audioError) {
        logger.error('Audio processing error', { 
          error: audioError instanceof Error ? audioError.message : 'Unknown',
          tagId: tag.id 
        });
        return res.status(500).json({ 
          error: 'Audio processing failed',
          message: 'Erreur lors du traitement audio' 
        });
      }
    }
    
    // Insérer métadonnées dans la table de tracking
    if (storagePath) {
      const { error: metadataError } = await supabase
        .from('visitor_message_files')
        .insert({
          storage_path: storagePath,
          tag_id: tag.id,
          property_id: propertyId,
          owner_id: ownerId,
          mime_type: 'audio/webm',
          file_size_bytes: fileMetadata?.size,
          duration_seconds: duration,
          ip_address: req.ip || req.headers['x-forwarded-for'] || null,
          user_agent: req.headers['user-agent'] || null
        });
      
      if (metadataError) {
        logger.error('Failed to insert file metadata', { 
          error: metadataError.message,
          storagePath 
        });
        // Continue anyway - le fichier est uploadé
      }
    }
    
    // Logger dans access_logs
    const { error: logError } = await supabase.from('access_logs').insert({
      action: 'VISITOR_MESSAGE',
      status: 'SUCCESS',
      method: 'DIY_MESSAGE',
      property_id: propertyId,
      tag_id: tag.id,
      ip_address: req.ip || req.headers['x-forwarded-for'] || null,
      user_agent: req.headers['user-agent'] || null,
      metadata: {
        has_text: !!text,
        has_audio: !!storagePath,
        audio_duration: duration || null,
        audio_size: fileMetadata?.size || null,
        tier: 'DIY'
      }
    });
    
    if (logError) {
      logger.error('Failed to log message access', { 
        error: logError.message 
      });
    }
    
    // Déclencher notification push (asynchrone)
    try {
      await supabase.functions.invoke('notify-new-message', {
        body: {
          ownerId,
          tagId: tag.id,
          tagCode: tag.tag_code,
          hasText: !!text,
          hasAudio: !!storagePath,
          propertyName: tag.property?.name
        }
      });
    } catch (notifyError) {
      // Notification failure shouldn't block the response
      logger.warn('Push notification trigger failed', { 
        error: notifyError instanceof Error ? notifyError.message : 'Unknown',
        ownerId 
      });
    }
    
    logger.info('DIY message sent successfully', {
      tagId: tag.id,
      tagCode: tag.tag_code,
      hasText: !!text,
      hasAudio: !!storagePath,
      ownerId
    });
    
    res.json({
      success: true,
      message: 'Message envoyé avec succès',
      data: {
        tagId: tag.id,
        hasText: !!text,
        hasAudio: !!storagePath,
        audioDuration: duration || null,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error in message send endpoint', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      body: req.body 
    });
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Erreur interne du serveur' 
    });
  }
});

/**
 * GET /api/messages/:ownerId
 * Récupérer les messages pour un propriétaire (authentifié)
 */
router.get('/:ownerId', async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;
    const { limit = '20', offset = '0' } = req.query;
    
    // Vérifier l'authentification (à adapter selon votre système d'auth)
    // Pour l'instant on suppose que le middleware auth est présent
    
    const { data: messages, error } = await supabase
      .from('access_logs')
      .select(`
        *,
        tag:tag_id (
          tag_code,
          name
        )
      `)
      .eq('action', 'VISITOR_MESSAGE')
      .eq('method', 'DIY_MESSAGE')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string))
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);
    
    if (error) {
      logger.error('Failed to fetch messages', { error: error.message });
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
    
    res.json({
      success: true,
      data: messages,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
    
  } catch (error) {
    logger.error('Error fetching messages', { 
      error: error instanceof Error ? error.message : 'Unknown' 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
