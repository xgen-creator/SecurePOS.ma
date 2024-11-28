import React, { useState } from 'react';
import { 
  Server, 
  Database, 
  HardDrive, 
  Activity, 
  Users, 
  Settings,
  RefreshCw,
  AlertTriangle,
  Shield
} from 'lucide-react';

const SystemAdmin = () => {
  const [systemStatus] = useState({
    cpu: 45,
    memory: 62,
    disk: 38,
    uptime: '15d 6h 32m',
    activeUsers: 127,
    alerts: 2
  });

  const [services] = useState({
    api: 'healthy',
    database: 'healthy',
    cache: 'healthy',
    worker: 'degraded'
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Administration Système</h1>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          Rafraîchir
        </button>
      </div>

      {/* Métriques système */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500">CPU</p>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold">{systemStatus.cpu}%</h3>
                <span className="text-sm text-green-600">Normal</span>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${systemStatus.cpu}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <HardDrive className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-500">Mémoire</p>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold">{systemStatus.memory}%</h3>
                <span className="text-sm text-yellow-600">Attention</span>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full"
              style={{ width: `${systemStatus.memory}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Database className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-500">Stockage</p>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold">{systemStatus.disk}%</h3>
                <span className="text-sm text-green-600">Normal</span>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${systemStatus.disk}%` }}
            />
          </div>
        </div>
      </div>

      {/* État des services */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">État des Services</h2>
          <div className="space-y-4">
            {Object.entries(services).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-gray-500" />
                  <span className="font-medium">{service}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  status === 'healthy' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full p-2 border rounded-lg hover:bg-gray-50">
            Voir les détails
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Tâches de Maintenance</h2>
          <div className="space-y-4">
            <button className="w-full p-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Optimiser la base de données
            </button>
            <button className="w-full p-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Nettoyer le cache
            </button>
            <button className="w-full p-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Mettre à jour les certificats
            </button>
          </div>
        </div>
      </div>

      {/* Alertes système */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Alertes Système</h2>
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border