import React, { useState } from 'react';
import { Users, UserPlus, Shield, Settings, Key, Lock } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const UserManagementInterface = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users] = useState([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      status: 'active',
      lastLogin: new Date(),
      devices: ['Device 1', 'Device 2']
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'user',
      status: 'active',
      lastLogin: new Date(),
      devices: ['Device 3']
    }
  ]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des Utilisateurs</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          <UserPlus className="w-4 h-4" />
          Nouvel Utilisateur
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {[
          { id: 'users', label: 'Utilisateurs', icon: Users },
          { id: 'roles', label: 'Rôles', icon: Shield },
          { id: 'permissions', label: 'Permissions', icon: Lock }
        ].map(tab => (
          <button
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 ${
              activeTab === tab.id 
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Liste des utilisateurs */}
      <div className="space-y-4">
        {users.map(user => (
          <Card key={user.id} className="hover:bg-gray-50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Key className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Settings className="w-4 h-4 text-gray-500" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Shield className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Dernière connexion</p>
                    <p className="font-medium">{user.lastLogin.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Appareils associés</p>
                    <p className="font-medium">{user.devices.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Statut 2FA</p>
                    <p className="font-medium text-green-600">Activé</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UserManagementInterface;
