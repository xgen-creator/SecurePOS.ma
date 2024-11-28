import React, { useState, useEffect } from 'react';
import { Bell, Camera, Settings, Video, MessageSquare, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const MainApp = () => {
  const [activeView, setActiveView] = useState('live');
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [currentVisitor, setCurrentVisitor] = useState(null);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r">
        <div className="p-4">
          <h1 className="text-xl font-bold text-gray-800">ScanBell</h1>
        </div>
        
        <nav className="mt-4">
          <button 
            className={`w-full p-4 text-left flex items-center gap-3 ${
              activeView === 'live' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
            }`}
            onClick={() => setActiveView('live')}
          >
            <Camera className="w-5 h-5" />
            Vue en Direct
          </button>
          
          <button 
            className={`w-full p-4 text-left flex items-center gap-3 ${
              activeView === 'history' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
            }`}
            onClick={() => setActiveView('history')}
          >
            <Bell className="w-5 h-5" />
            Historique
          </button>
          
          <button 
            className={`w-full p-4 text-left flex items-center gap-3 ${
              activeView === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
            }`}
            onClick={() => setActiveView('settings')}
          >
            <Settings className="w-5 h-5" />
            Paramètres
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {activeView === 'live' && (
          <div className="p-6">
            <Card className="mb-6">
              <CardContent className="p-0">
                <div className="aspect-video bg-gray-900 relative">
                  {currentVisitor ? (
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                      <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
                        Visiteur en attente
                      </div>
                      <div className="flex gap-2">
                        <Button variant="success" className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Répondre
                        </Button>
                        <Button variant="secondary" className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Message
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Bell className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Sonneries</h3>
                      <p className="text-sm text-gray-500">Aujourd'hui: 3</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Video className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">État Connexion</h3>
                      <p className="text-sm text-gray-500">
                        {isConnected ? 'Connecté' : 'Déconnecté'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MessageSquare className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Messages</h3>
                      <p className="text-sm text-gray-500">2 non lus</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MainApp;
