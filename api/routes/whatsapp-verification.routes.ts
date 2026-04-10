/**
 * WhatsApp Verification Routes - Validation OTP et génération vCard
 * 
 * Routes:
 * POST /api/whatsapp/send-otp - Envoie OTP
 * POST /api/whatsapp/verify-otp - Vérifie OTP
 * GET /api/whatsapp/vcard - Télécharge la fiche contact
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../services/utils/logger';

const router = Router();

// Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Edge Function URL
const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/whatsapp-otp`;
const EDGE_FUNCTION_KEY = process.env.SUPABASE_ANON_KEY!;

/**
 * POST /api/whatsapp/send-otp
 * Envoie un code OTP au numéro WhatsApp du propriétaire
 */
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user?.id; // Set by auth middleware

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!phoneNumber) {
      res.status(400).json({ error: 'Phone number required' });
      return;
    }

    // Validate phone format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      res.status(400).json({ 
        error: 'Format international requis: +212612345678' 
      });
      return;
    }

    // Check rate limiting (max 3 attempts per 10 minutes)
    const { data: user } = await supabase
      .from('users')
      .select('whatsapp_otp_expires_at')
      .eq('id', userId)
      .single();

    if (user?.whatsapp_otp_expires_at && 
        new Date(user.whatsapp_otp_expires_at) > new Date()) {
      // Check if last OTP was sent less than 1 minute ago
      const lastSent = new Date(user.whatsapp_otp_expires_at);
      lastSent.setMinutes(lastSent.getMinutes() - 9); // OTP valid 10 min
      
      if (new Date().getTime() - lastSent.getTime() < 60000) {
        res.status(429).json({ 
          error: 'Veuillez attendre 1 minute avant de renvoyer un code' 
        });
        return;
      }
    }

    // Call Edge Function to send OTP
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`,
      },
      body: JSON.stringify({
        phoneNumber,
        userId,
        action: 'send',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error('Failed to send OTP', { 
        error: result.error, 
        userId,
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*')
      });
      res.status(response.status).json(result);
      return;
    }

    logger.info('OTP sent successfully', { 
      userId,
      phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*')
    });

    res.json({
      success: true,
      message: 'Code de validation envoyé',
      expiresAt: result.expiresAt,
    });

  } catch (error) {
    logger.error('Error sending OTP', { 
      error: error instanceof Error ? error.message : 'Unknown',
      userId: req.user?.id 
    });
    res.status(500).json({ error: 'Erreur lors de l\'envoi du code' });
  }
});

/**
 * POST /api/whatsapp/verify-otp
 * Vérifie le code OTP
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!otp || !/^\d{6}$/.test(otp)) {
      res.status(400).json({ error: 'Code à 6 chiffres requis' });
      return;
    }

    // Call Edge Function to verify OTP
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EDGE_FUNCTION_KEY}`,
      },
      body: JSON.stringify({
        otp,
        userId,
        action: 'verify',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      logger.error('OTP verification failed', { 
        error: result.error, 
        userId 
      });
      res.status(response.status).json(result);
      return;
    }

    logger.info('OTP verified successfully', { userId });

    res.json({
      success: true,
      message: 'Numéro WhatsApp validé avec succès',
      verified: true,
    });

  } catch (error) {
    logger.error('Error verifying OTP', { 
      error: error instanceof Error ? error.message : 'Unknown',
      userId: req.user?.id 
    });
    res.status(500).json({ error: 'Erreur lors de la validation' });
  }
});

/**
 * GET /api/whatsapp/vcard
 * Génère et télécharge la fiche contact vCard
 */
router.get('/vcard', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if user has verified WhatsApp
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('whatsapp_verified')
      .eq('id', userId)
      .single();

    if (userError || !user?.whatsapp_verified) {
      res.status(403).json({ 
        error: 'WhatsApp non validé. Veuillez valider votre numéro d\'abord.' 
      });
      return;
    }

    // Get proxy number from env
    const proxyNumber = process.env.WHATSAPP_PROXY_NUMBER || '+212600000000';
    const cleanNumber = proxyNumber.replace(/\D/g, '');

    // Generate vCard
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:🔔 Scanbell - Sonnette
N:Scanbell;🔔;;Sonnette;
TEL;type=CELL;type=VOICE:${proxyNumber}
NOTE:Enregistrez ce contact pour recevoir les alertes de votre sonnette connectée.
CATEGORIES:Scanbell,Smart Home,IoT
END:VCARD`;

    // Set headers for download
    res.setHeader('Content-Type', 'text/vcard');
    res.setHeader('Content-Disposition', 'attachment; filename="scanbell-contact.vcf"');
    
    logger.info('vCard generated', { userId });
    
    res.send(vCard);

  } catch (error) {
    logger.error('Error generating vCard', { 
      error: error instanceof Error ? error.message : 'Unknown',
      userId: req.user?.id 
    });
    res.status(500).json({ error: 'Erreur lors de la génération de la fiche' });
  }
});

/**
 * GET /api/whatsapp/status
 * Récupère le statut de validation WhatsApp de l'utilisateur
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('whatsapp_private, whatsapp_verified')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error fetching WhatsApp status', { error: error.message, userId });
      res.status(500).json({ error: 'Erreur serveur' });
      return;
    }

    res.json({
      configured: !!user?.whatsapp_private,
      verified: user?.whatsapp_verified || false,
      phoneNumber: user?.whatsapp_private ? 
        user.whatsapp_private.replace(/\d(?=\d{4})/g, '*') : null,
    });

  } catch (error) {
    logger.error('Error fetching WhatsApp status', { 
      error: error instanceof Error ? error.message : 'Unknown',
      userId: req.user?.id 
    });
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
