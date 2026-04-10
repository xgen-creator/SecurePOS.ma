/**
 * Edge Function: notify-new-message
 * Envoi de notification push au propriétaire lors d'un nouveau message (Tier DIY)
 * 
 * Trigger: Appelée par l'API lors de l'envoi d'un message visiteur
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotificationPayload {
  ownerId: string;
  tagId: string;
  tagCode: string;
  hasText: boolean;
  hasAudio: boolean;
  propertyName?: string;
}

serve(async (req: Request) => {
  try {
    // Vérifier la méthode
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parser le body
    const payload: NotificationPayload = await req.json();
    const { ownerId, tagCode, hasText, hasAudio, propertyName } = payload;

    if (!ownerId) {
      return new Response(
        JSON.stringify({ error: 'Missing ownerId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialiser Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les tokens FCM/Push du propriétaire
    const { data: pushTokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', ownerId)
      .eq('is_active', true);

    if (tokenError) {
      console.error('Error fetching push tokens:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch push tokens' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!pushTokens || pushTokens.length === 0) {
      console.log('No push tokens found for owner:', ownerId);
      return new Response(
        JSON.stringify({ message: 'No push tokens registered for this user' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Construire le message
    const location = propertyName || `Tag ${tagCode}`;
    const messageType = hasAudio && hasText 
      ? 'message texte et audio' 
      : hasAudio 
        ? 'message audio' 
        : 'message texte';

    const notification = {
      title: '🔔 Nouveau message',
      body: `Vous avez reçu un ${messageType} de ${location}`,
      data: {
        type: 'NEW_MESSAGE',
        tagCode,
        hasText,
        hasAudio,
        timestamp: new Date().toISOString()
      }
    };

    // Envoyer les notifications (simulation - à remplacer par FCM/OneSignal/Expo)
    const results = await Promise.allSettled(
      pushTokens.map(async (tokenRecord: any) => {
        // Ici, vous intégreriez votre service de push notification
        // Ex: Firebase Cloud Messaging, OneSignal, Expo Notifications
        console.log('Sending push notification to:', tokenRecord.token, 'on', tokenRecord.platform);
        
        // Simulation d'envoi réussi
        return { token: tokenRecord.token, success: true };
      })
    );

    // Logger le résultat
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Push notifications sent: ${successful} successful, ${failed} failed`);

    // Insérer dans une table de notifications pour fallback (notification in-app)
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: ownerId,
        type: 'NEW_MESSAGE',
        title: notification.title,
        body: notification.body,
        data: notification.data,
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (notifError) {
      console.error('Error inserting notification:', notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notifications sent: ${successful} successful`,
        notification 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in notify-new-message function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
