/**
 * WhatsApp Configuration Component
 * 
 * Permet au propriétaire de:
 * 1. Saisir et valider son numéro WhatsApp via OTP
 * 2. Télécharger la fiche contact Scanbell
 * 3. Voir le statut de validation
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface WhatsAppStatus {
  configured: boolean;
  verified: boolean;
  phoneNumber: string | null;
}

export default function WhatsAppConfig() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'verify'>('input');

  // Fetch WhatsApp status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    }
  };

  // Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate phone format
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        setError('Format international requis: +212612345678');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de l\'envoi du code');
      } else {
        setSuccess('Code de validation envoyé ! Vérifiez vos messages WhatsApp.');
        setStep('verify');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/whatsapp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Code invalide');
      } else {
        setSuccess('✅ Numéro WhatsApp validé avec succès !');
        await fetchStatus();
        setStep('input');
        setOtp('');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Download vCard
  const handleDownloadVCard = async () => {
    try {
      const response = await fetch('/api/whatsapp/vcard');
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Erreur lors du téléchargement');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scanbell-contact.vcf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('📇 Fiche contact téléchargée !');
    } catch (err) {
      setError('Erreur lors du téléchargement');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
          <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Configuration WhatsApp</h2>
          <p className="text-sm text-gray-600">
            {status?.verified ? '✅ Validé' : status?.configured ? '⏳ En attente de validation' : '⚠️ Non configuré'}
          </p>
        </div>
      </div>

      {/* Status Message */}
      {status?.verified && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-green-800 text-sm">
            <strong>✅ Numéro validé !</strong><br/>
            Vous pouvez maintenant activer WhatsApp sur vos tags.
          </p>
        </div>
      )}

      {!status?.verified && status?.configured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800 text-sm">
            <strong>⚠️ Validation requise</strong><br/>
            Vérifiez votre numéro pour activer WhatsApp.
          </p>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Step 1: Input Phone Number */}
      {step === 'input' && !status?.verified && (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro WhatsApp
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+212612345678"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Format international avec + (ex: +212 pour Maroc)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Envoi...
              </>
            ) : (
              'Envoyer le code de validation'
            )}
          </button>
        </form>
      )}

      {/* Step 2: Verify OTP */}
      {step === 'verify' && (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code de validation (6 chiffres)
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-lg tracking-widest"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Code envoyé à {status?.phoneNumber || 'votre numéro'}
            </p>
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setStep('input')}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
            >
              Retour
            </button>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Validation...' : 'Valider'}
            </button>
          </div>
        </form>
      )}

      {/* vCard Download (only if verified) */}
      {status?.verified && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            📇 Fiche Contact Scanbell
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Téléchargez et importez cette fiche dans vos contacts pour recevoir les alertes.
          </p>
          <button
            onClick={handleDownloadVCard}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Télécharger la fiche contact
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-2">À propos</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Votre numéro reste privé (anonymisé)</li>
          <li>• Les visiteurs utilisent un numéro proxy</li>
          <li>• Validation par SMS WhatsApp</li>
          <li>• Recevez les alertes directement</li>
        </ul>
      </div>
    </div>
  );
}
