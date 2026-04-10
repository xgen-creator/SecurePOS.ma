'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WhatsAppConfig from '@/components/whatsapp-config';
import { useAuth } from '@/hooks/useAuth';

export default function WhatsAppSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Paramètres WhatsApp</h1>
        <p className="text-gray-600 mb-8">
          Configurez et validez votre numéro WhatsApp pour recevoir les alertes des visiteurs.
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          {/* WhatsApp Configuration */}
          <WhatsAppConfig />

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Comment ça marche ?
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm mr-3">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Saisissez votre numéro</h3>
                  <p className="text-sm text-gray-600">
                    Entrez votre numéro WhatsApp au format international (+212...)
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm mr-3">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Validez par OTP</h3>
                  <p className="text-sm text-gray-600">
                    Recevez un code de validation sur WhatsApp et saisissez-le
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm mr-3">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Ajoutez le contact</h3>
                  <p className="text-sm text-gray-600">
                    Téléchargez la fiche contact et importez-la dans votre téléphone
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-sm mr-3">
                  4
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Activez sur vos tags</h3>
                  <p className="text-sm text-gray-600">
                    Activez l'option WhatsApp sur vos tags pour permettre aux visiteurs d'envoyer des messages
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                🔒 Protection de votre vie privée
              </h4>
              <p className="text-sm text-blue-800">
                Votre numéro réel reste toujours masqué. Les visiteurs utilisent un numéro 
                proxy central, et nos serveurs relaient les messages sans jamais révéler 
                votre identité.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
