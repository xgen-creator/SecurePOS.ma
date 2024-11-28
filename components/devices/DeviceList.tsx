import React from 'react';
import { Edit2, Trash2, Battery, Lightbulb, Camera, Thermometer } from 'lucide-react';
import type { Device, DevicePlatform } from './types';

interface DeviceListProps {
  devices: Device[];
  platforms: DevicePlatform[];
  onEdit: (device: Device) => void;
  onDelete: (deviceId: string) => void;
}

const getDeviceIcon = (type: Device['type']) => {
  switch (type) {
    case 'lock':
      return Battery;
    case 'light':
      return Lightbulb;
    case 'camera':
      return Camera;
    case 'sensor':
      return Thermometer;
    default:
      return Battery;
  }
};

const getDeviceStatus = (device: Device): { label: string; color: string } => {
  switch (device.status) {
    case 'active':
      return { label: 'Actif', color: 'bg-green-500' };
    case 'inactive':
      return { label: 'Inactif', color: 'bg-gray-500' };
    case 'error':
      return { label: 'Erreur', color: 'bg-red-500' };
    case 'locked':
      return { label: 'Verrouillé', color: 'bg-blue-500' };
    case 'unlocked':
      return { label: 'Déverrouillé', color: 'bg-yellow-500' };
    case 'on':
      return { label: 'Allumé', color: 'bg-green-500' };
    case 'off':
      return { label: 'Éteint', color: 'bg-gray-500' };
    default:
      return { label: 'Inconnu', color: 'bg-gray-500' };
  }
};

const getDeviceDetails = (device: Device): string => {
  switch (device.type) {
    case 'lock':
      return `Batterie: ${device.batteryLevel}%`;
    case 'light':
      return `Luminosité: ${device.brightness}%`;
    case 'camera':
      return device.recording ? 'En enregistrement' : 'En veille';
    case 'sensor':
      return `${device.value} ${device.unit}`;
    default:
      return '';
  }
};

const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  platforms,
  onEdit,
  onDelete
}) => {
  if (devices.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl">
        <p className="text-gray-500">
          Aucun appareil connecté
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Cliquez sur "Scanner" pour rechercher des appareils
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {devices.map(device => {
        const Icon = getDeviceIcon(device.type);
        const status = getDeviceStatus(device);
        const platform = platforms.find(p => p.id === device.platform);
        const lastSeen = new Date(device.lastSeen).toLocaleString();

        return (
          <div
            key={device.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-${platform?.color}-100 rounded-lg`}>
                    <Icon className={`w-5 h-5 text-${platform?.color}-600`} />
                  </div>
                  <div>
                    <h3 className="font-medium">{device.name}</h3>
                    <p className="text-sm text-gray-500">
                      {platform?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                    <span className="text-sm">{status.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(device)}
                      className="p-2 rounded-lg hover:bg-gray-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(device.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-between text-sm text-gray-500">
                <span>{getDeviceDetails(device)}</span>
                <span>Dernière activité: {lastSeen}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DeviceList;
