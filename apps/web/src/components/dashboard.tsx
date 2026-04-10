'use client'

import { useState } from 'react'
import { Bell, Camera, Settings, Video, MessageSquare, Phone } from 'lucide-react'

interface DashboardProps {
  user: {
    id: string
    email: string
    role: string
  }
}

export function Dashboard({ user }: DashboardProps) {
  const [activeView, setActiveView] = useState('live')
  const [currentVisitor, setCurrentVisitor] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(true)

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex-shrink-0">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">ScanBell</h1>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
        </div>
        
        <nav className="mt-4">
          <button 
            className={`w-full p-4 text-left flex items-center gap-3 transition-colors ${
              activeView === 'live' ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setActiveView('live')}
          >
            <Camera className="w-5 h-5" />
            Vue en Direct
          </button>
          
          <button 
            className={`w-full p-4 text-left flex items-center gap-3 transition-colors ${
              activeView === 'history' ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setActiveView('history')}
          >
            <Bell className="w-5 h-5" />
            Historique
          </button>
          
          <button 
            className={`w-full p-4 text-left flex items-center gap-3 transition-colors ${
              activeView === 'devices' ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setActiveView('devices')}
          >
            <Video className="w-5 h-5" />
            Appareils
          </button>
          
          <button 
            className={`w-full p-4 text-left flex items-center gap-3 transition-colors ${
              activeView === 'settings' ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setActiveView('settings')}
          >
            <Settings className="w-5 h-5" />
            Paramètres
          </button>
          
          {user.role === 'ADMIN' && (
            <a 
              href="/admin"
              className="w-full p-4 text-left flex items-center gap-3 text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <Settings className="w-5 h-5" />
              Administration
            </a>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeView === 'live' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Bell className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sonneries</p>
                    <h3 className="text-xl font-bold">3</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Video className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">État</p>
                    <h3 className="text-xl font-bold">{isConnected ? 'Connecté' : 'Déconnecté'}</h3>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Messages</p>
                    <h3 className="text-xl font-bold">2 non lus</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Feed */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="aspect-video bg-gray-900 relative">
                {currentVisitor ? (
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                    <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
                      Visiteur en attente
                    </div>
                    <div className="flex gap-2">
                      <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                        <Phone className="w-4 h-4" />
                        Répondre
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                        <MessageSquare className="w-4 h-4" />
                        Message
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Activité récente</h2>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Bell className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Visiteur #{i}</p>
                        <p className="text-sm text-gray-500">Sonnette principale • il y a {i * 10} min</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Autorisé
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeView === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Historique</h2>
            <p className="text-gray-500">Consultez l'historique complet sur la page <a href="/history" className="text-blue-600 hover:underline">Historique</a></p>
          </div>
        )}

        {activeView === 'devices' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Vos appareils</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Sonnette principale</h3>
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                </div>
                <p className="text-sm text-gray-500">En ligne • Dernière activité: 2 min</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Caméra entrée</h3>
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                </div>
                <p className="text-sm text-gray-500">En ligne • Dernière activité: 5 min</p>
              </div>
            </div>
          </div>
        )}

        {activeView === 'settings' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Paramètres</h2>
            <p className="text-gray-500">Accédez aux paramètres complets sur la page <a href="/settings/device" className="text-blue-600 hover:underline">Configuration</a></p>
          </div>
        )}
      </main>
    </div>
  )
}
