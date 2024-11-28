import React, { useState, useEffect } from 'react';
import { Home, Loader, Plus, RefreshCw } from 'lucide-react';
import DeviceList from './DeviceList';
import DeviceConfigurator from './DeviceConfigurator';
import type { Device, DevicePlatform } from './types';

const PLATFORMS: DevicePlatform[] = [
  {
    id: 'homekit',
    name: 'Apple HomeKit',
    icon: Home,
    color: 'blue'
  },
  {
    id: 'alexa',
    name: 'Amazon Alexa',
    icon: Home,
    color: 'purple'
  },
  {
    id: 'google_home',
    name: 'Google Home',
    icon: Home,
    color: 'green'
  }
];

const DeviceManager: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [platforms, setPlatforms] = useState<DevicePlatform[]>(PLATFORMS);
  const [isScanning, setIsScanning] = useState(false);
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Simulated device discovery
  const scanForDevices = async () => {
    setIsScanning(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock discovered devices
      const newDevices: Device[] = [
        {
          id: 'door_1',
          name: 'Porte d\'entrée',
          type: 'lock',
          platform: 'homekit',
          status: 'locked',
          batteryLevel: 85,
          lastSeen: new Date().toISOString()
        },
        {
          id: 'light_1',
          name: 'Lumière salon',
          type: 'light',
          platform: 'alexa',
          status: 'off',
          brightness: 0,
          color: '#FFFFFF',
          lastSeen: new Date().toISOString()
        },
        {
          id: 'camera_1',
          name: 'Caméra entrée',
          type: 'camera',
          platform: 'google_home',
          status: 'active',
          recording: false,
          lastSeen: new Date().toISOString()
        }
      ];

      setDevices(prev => {
        const existing = new Set(prev.map(d => d.id));
        const filtered = newDevices.filter(d => !existing.has(d.id));
        return [...prev, ...filtered];
      });
    } catch (error) {
      console.error('Error scanning for devices:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddDevice = () => {
    setSelectedDevice(null);
    setShowConfigurator(true);
  };

  const handleEditDevice = (device: Device) => {
    setSelectedDevice(device);
    setShowConfigurator(true);
  };

  const handleSaveDevice = (device: Device) => {
    setDevices(prev => {
      if (selectedDevice) {
        return prev.map(d => d.id === device.id ? device : d);
      }
      return [...prev, { ...device, id: Math.random().toString(36).substring(7) }];
    });
    setShowConfigurator(false);
    setSelectedDevice(null);
  };

  const handleDeleteDevice = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId));
  };

  useEffect(() => {
    scanForDevices();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Appareils connectés</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez vos appareils domotiques
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={scanForDevices}
            disabled={isScanning}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              bg-gray-100 hover:bg-gray-200 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isScanning ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Scanner</span>
          </button>
          <button
            onClick={handleAddDevice}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              bg-blue-600 text-white hover:bg-blue-700 transition-colors
            "
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {showConfigurator ? (
        <div className="bg-white rounded-xl shadow-lg">
          <DeviceConfigurator
            device={selectedDevice}
            platforms={platforms}
            onSave={handleSaveDevice}
            onCancel={() => {
              setShowConfigurator(false);
              setSelectedDevice(null);
            }}
          />
        </div>
      ) : (
        <DeviceList
          devices={devices}
          platforms={platforms}
          onEdit={handleEditDevice}
          onDelete={handleDeleteDevice}
        />
      )}
    </div>
  );
};

export default DeviceManager;
