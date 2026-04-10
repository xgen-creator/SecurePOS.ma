/**
 * WhatsApp OTP - Edge Function pour validation numéro propriétaire
 * 
 * Envoi de code OTP via Evolution API pour vérifier le numéro WhatsApp
 * du propriétaire avant activation de la fonctionnalité.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Configuration Evolution API
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME') || 'scanbell';
const WHATSAPP_PROXY_NUMBER = Deno.env.get('WHATSAPP_PROXY_NUMBER');

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Generate 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP with SHA-256
 */
async function hashOTP(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Send WhatsApp message via Evolution API
 */
async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API not configured');
  }

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
      delay: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${error}`);
  }
}

serve(async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 405,
      });
    }

    // Parse request body
    const { phoneNumber, userId, action } = await req.json();

    if (!phoneNumber || !userId) {
      return new Response(JSON.stringify({ error: 'phoneNumber and userId required' }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Validate phone format (international)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid phone format. Use international format: +212612345678' 
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, whatsapp_verified')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('User not found:', userId);
      return new Response(JSON.stringify({ error: 'User not found' }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // ACTION: SEND OTP
    if (action === 'send') {
      // Generate OTP
      const otp = generateOTP();
      const otpHash = await hashOTP(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store hashed OTP in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          whatsapp_private: phoneNumber,
          whatsapp_otp_hash: otpHash,
          whatsapp_otp_expires_at: expiresAt.toISOString(),
          whatsapp_verified: false,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to store OTP:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to initiate verification' }), {
          headers: { ...headers, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      // Send OTP via WhatsApp
      const proxyNumber = WHATSAPP_PROXY_NUMBER || 'Scanbell';
      const message = `🔔 *Scanbell - Validation*\n\n` +
        `Votre code de validation est : *${otp}*\n\n` +
        `Ce code expire dans 10 minutes.\n\n` +
        `📱 *Important :* Enregistrez ce numéro ${proxyNumber} dans vos contacts sous le nom "🔔 Scanbell - Sonnette" pour recevoir vos alertes.\n\n` +
        `_Ne partagez jamais ce code._`;

      await sendWhatsAppMessage(phoneNumber, message);

      console.log('OTP sent to:', phoneNumber.replace(/\d(?=\d{4})/g, '*'));

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
        expiresAt: expiresAt.toISOString(),
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // ACTION: VERIFY OTP
    if (action === 'verify') {
      const { otp } = await req.json();

      if (!otp) {
        return new Response(JSON.stringify({ error: 'OTP required' }), {
          headers: { ...headers, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Get stored OTP hash
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('whatsapp_otp_hash, whatsapp_otp_expires_at, whatsapp_private')
        .eq('id', userId)
        .single();

      if (fetchError || !userData) {
        return new Response(JSON.stringify({ error: 'User data not found' }), {
          headers: { ...headers, 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      // Check expiration
      if (new Date() > new Date(userData.whatsapp_otp_expires_at)) {
        return new Response(JSON.stringify({ error: 'OTP expired' }), {
          headers: { ...headers, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Verify OTP hash
      const providedHash = await hashOTP(otp);
      if (providedHash !== userData.whatsapp_otp_hash) {
        return new Response(JSON.stringify({ error: 'Invalid OTP' }), {
          headers: { ...headers, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Mark as verified
      const { error: verifyError } = await supabase
        .from('users')
        .update({
          whatsapp_verified: true,
          whatsapp_otp_hash: null, // Clear OTP
          whatsapp_otp_expires_at: null,
        })
        .eq('id', userId);

      if (verifyError) {
        console.error('Failed to verify:', verifyError);
        return new Response(JSON.stringify({ error: 'Verification failed' }), {
          headers: { ...headers, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      // Send confirmation message
      const confirmationMessage = `✅ *Scanbell - Numéro Validé*\n\n` +
        `Votre numéro WhatsApp est maintenant vérifié !\n\n` +
        `Vous pouvez maintenant activer les alertes WhatsApp sur vos tags.\n\n` +
        `📝 *N'oubliez pas :* Téléchargez la fiche contact Scanbell depuis votre dashboard.`;

      await sendWhatsAppMessage(userData.whatsapp_private, confirmationMessage);

      console.log('Phone verified for user:', userId);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Phone number verified successfully',
        verified: true,
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 400,
    });

  } catch (error) {
    console.error('Error processing OTP request:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
