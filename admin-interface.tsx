import React, { useState } from 'react';
import { Users, Settings, Shield, Activity, Bell, Database, Lock } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const AdminInterface = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [systemStatus] = useState({
    users: 156,
    activeDevices: 23,
    pendingAlerts: 5,
    systemLoad: 45
  });

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r">
        <div className="p-4">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
        
        <nav className="mt-4">
          {[
            { id: 'dashboard', icon: Activity, label: 'Dashboard' },
            { id: 'users', icon: Users, label: 'Utilisateurs' },
            { id: 'devices', icon: Bell, label: 'Appareils' },
            { id: 'security', icon: Shield, label: 'Sécurité' },
            { id: 'logs', icon: Database, label: 'Logs' },
            { id: 'settings', icon: Settings, label: 'Paramètres' }
          ].map(item => (
            <button
              key={item.id}
              className={`w-full p-4 text-left flex items-center gap-3 ${
                activeSection === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
              }`}
              onClick={() => setActiveSection(item.id)}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Dashboard</h2>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Utilisateurs Actifs</p>
                    <h3 className="text-2xl font-bold">{systemStatus.users}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Bell className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Appareils Connectés</p>
                    <h3 className="text-2xl font-bold">{systemStatus.activeDevices}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Shield className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Alertes en Attente</p>
                    <h3 className="text-2xl font-bold">{systemStatus.pendingAlerts}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Activity className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Charge Système</p>
                    <h3 className="text-2xl font-bold">{systemStatus.systemLoad}%</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Administration Panels */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Dernières Activités</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Liste des activités récentes */}
                  {[1, 2, 3].map((_, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <Lock className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">Nouvelle connexion</p>
                          <p className="text-sm text-gray-500">Il y a 5 minutes</p>
                        </div>
                      </div>
                      <button className="text-blue-600 text-sm">Voir</button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">État du Système</h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* État des services */}
                  {[
                    { name: 'API Server', status: 'online' },
                    { name: 'Base de données', status: 'online' },
                    { name: 'Service de notifications', status: 'online' }
                  ].map((service, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span>{service.name}</span>
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        service.status === 'online' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {service.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminInterface;
