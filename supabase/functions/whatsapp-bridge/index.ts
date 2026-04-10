/**
 * WhatsApp Bridge - Edge Function pour Evolution API
 * 
 * Ce service reçoit les webhooks de Evolution API et redirige les messages
 * vers le numéro WhatsApp privé du propriétaire lié au tag.
 * 
 * Architecture:
 * 1. Visiteur envoie message au numéro proxy via WhatsApp
 * 2. Evolution API envoie webhook à cette edge function
 * 3. On parse le message pour extraire le tagCode
 * 4. On fait lookup dans Supabase pour trouver whatsapp_private
 * 5. On utilise Evolution API pour forwarder le message
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Configuration Evolution API
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'scanbell';

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface EvolutionWebhookPayload {
  event: 'messages.upsert' | 'messages.update' | 'connection.update';
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
    messageTimestamp: number;
    pushName?: string;
  };
}

interface TagInfo {
  id: string;
  tag_code: string;
  property_id: string;
  property: {
    owner_id: string;
  };
  owner: {
    whatsapp_private: string;
  };
}

serve(async (req: Request) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Parse webhook payload from Evolution API
    const payload: EvolutionWebhookPayload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    // Only process incoming messages (not from me)
    if (payload.event !== 'messages.upsert' || payload.data.key.fromMe) {
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Extract message content
    const messageText = payload.data.message.conversation || 
                       payload.data.message.extendedTextMessage?.text || '';
    
    const visitorNumber = payload.data.key.remoteJid.replace('@s.whatsapp.net', '');
    const visitorName = payload.data.data?.pushName || 'Visiteur';

    console.log('Message from:', visitorNumber, 'Content:', messageText);

    // Extract tagCode from message (pattern: "tag CODE" or "CODE" at start)
    const tagCodeMatch = messageText.match(/tag\s+([A-Z0-9]+)/i) || 
                        messageText.match(/^([A-Z0-9]{6,})/i);
    
    if (!tagCodeMatch) {
      console.log('No tag code found in message');
      // Send help message back
      await sendWhatsAppMessage(
        visitorNumber,
        'Bonjour! Pour contacter un propriétaire, veuillez inclure le code du tag dans votre message.\nExemple: "tag ABC123 Bonjour, je suis devant votre porte"'
      );
      
      return new Response(JSON.stringify({ status: 'no_tag_code' }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const tagCode = tagCodeMatch[1].toUpperCase();
    console.log('Tag code extracted:', tagCode);

    // Lookup tag in Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select(`
        id,
        tag_code,
        property_id,
        property:property_id (
          owner_id
        )
      `)
      .eq('tag_code', tagCode)
      .eq('is_active', true)
      .single();

    if (tagError || !tag) {
      console.error('Tag not found:', tagCode, tagError);
      await sendWhatsAppMessage(
        visitorNumber,
        `Désolé, le tag ${tagCode} n'existe pas ou n'est plus actif.`
      );
      
      return new Response(JSON.stringify({ error: 'Tag not found' }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Get owner's whatsapp_private number
    const { data: owner, error: ownerError } = await supabase
      .from('users')
      .select('whatsapp_private, name')
      .eq('id', tag.property.owner_id)
      .single();

    if (ownerError || !owner?.whatsapp_private) {
      console.error('Owner not found or no whatsapp:', tag.property.owner_id, ownerError);
      await sendWhatsAppMessage(
        visitorNumber,
        `Désolé, le propriétaire du tag ${tagCode} n'a pas configuré WhatsApp.`
      );
      
      return new Response(JSON.stringify({ error: 'Owner whatsapp not found' }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    console.log('Forwarding to owner:', owner.whatsapp_private);

    // Prepare message for owner (without visitor number for privacy)
    const visitorMessage = messageText.replace(/tag\s+[A-Z0-9]+/i, '').trim();
    const ownerMessage = `🔔 *Nouveau message via ScanBell*\n\n` +
      `*Tag:* ${tagCode}\n` +
      `*De:* ${visitorName}\n\n` +
      `*Message:*\n${visitorMessage || '(Aucun texte)'}\n\n` +
      `_Répondez ici pour répondre au visiteur._`;

    // Forward message to owner
    await sendWhatsAppMessage(owner.whatsapp_private, ownerMessage);

    // Log the access
    await supabase.from('access_logs').insert({
      action: 'VISITOR',
      status: 'SUCCESS',
      method: 'WHATSAPP',
      visitor_id: null, // Anonymous via proxy
      device_id: null,
      property_id: tag.property_id,
      ip_address: req.headers.get('x-forwarded-for') || null,
      user_agent: req.headers.get('user-agent') || null,
      metadata: {
        tag_code: tagCode,
        visitor_number_hash: await hashNumber(visitorNumber), // Hash for privacy
        message_preview: visitorMessage.substring(0, 50)
      }
    });

    // Confirm to visitor
    await sendWhatsAppMessage(
      visitorNumber,
      `✅ Votre message a été transmis au propriétaire du tag ${tagCode}. Il vous répondra directement ici.`
    );

    return new Response(JSON.stringify({ 
      status: 'forwarded',
      tag_code: tagCode,
      owner_whatsapp: owner.whatsapp_private.replace(/\d(?=\d{4})/g, '*') // Masked for logs
    }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/**
 * Send WhatsApp message via Evolution API
 */
async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.error('Evolution API not configured');
    throw new Error('Evolution API not configured');
  }

  // Format number (ensure it has country code)
  const formattedNumber = to.startsWith('+') ? to.substring(1) : to;

  const url = `${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: formattedNumber,
      text: text,
      delay: 1200, // 1.2s delay to appear natural
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Evolution API error:', error);
    throw new Error(`Failed to send message: ${error}`);
  }

  console.log('Message sent to:', formattedNumber.replace(/\d(?=\d{4})/g, '*'));
}

/**
 * Simple hash function for phone number privacy
 */
async function hashNumber(phone: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(phone);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
