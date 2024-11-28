import React, { useState } from 'react';
import { Save } from 'lucide-react';
import type { Device, DevicePlatform, DeviceType } from './types';

interface DeviceConfiguratorProps {
  device: Device | null;
  platforms: DevicePlatform[];
  onSave: (device: Device) => void;
  onCancel: () => void;
}

const DEVICE_TYPES: { id: DeviceType; label: string }[] = [
  { id: 'lock', label: 'Serrure connectée' },
  { id: 'light', label: 'Éclairage' },
  { id: 'camera', label: 'Caméra' },
  { id: 'sensor', label: 'Capteur' }
];

const createEmptyDevice = (type: DeviceType): Device => {
  const base = {
    id: '',
    name: '',
    type,
    platform: 'homekit' as const,
    lastSeen: new Date().toISOString()
  };

  switch (type) {
    case 'lock':
      return {
        ...base,
        type: 'lock' as const,
        status: 'locked' as const,
        batteryLevel: 100
      };
    case 'light':
      return {
        ...base,
        type: 'light' as const,
        status: 'off' as const,
        brightness: 0,
        color: '#FFFFFF'
      };
    case 'camera':
      return {
        ...base,
        type: 'camera' as const,
        status: 'inactive' as const,
        recording: false
      };
    case 'sensor':
      return {
        ...base,
        type: 'sensor' as const,
        status: 'inactive' as const,
        value: 0,
        unit: ''
      };
  }
};

const DeviceConfigurator: React.FC<DeviceConfiguratorProps> = ({
  device: initialDevice,
  platforms,
  onSave,
  onCancel
}) => {
  const [device, setDevice] = useState<Device>(
    initialDevice || createEmptyDevice('lock')
  );

  const handleTypeChange = (type: DeviceType) => {
    if (type !== device.type) {
      setDevice(createEmptyDevice(type));
    }
  };

  const handleChange = (field: string, value: any) => {
    setDevice(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(device);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type d'appareil
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DEVICE_TYPES.map(type => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleTypeChange(type.id)}
              className={`
                flex items-center gap-2 p-3 rounded-lg border transition-colors
                ${device.type === type.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200'
                }
              `}
            >
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Plateforme
        </label>
        <div className="grid grid-cols-3 gap-2">
          {platforms.map(platform => (
            <button
              key={platform.id}
              type="button"
              onClick={() => handleChange('platform', platform.id)}
              className={`
                flex items-center gap-2 p-3 rounded-lg border transition-colors
                ${device.platform === platform.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200'
                }
              `}
            >
              <platform.icon className="w-4 h-4" />
              <span>{platform.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom de l'appareil
        </label>
        <input
          type="text"
          value={device.name}
          onChange={e => handleChange('name', e.target.value)}
          placeholder="Ex: Porte d'entrée"
          className="
            w-full px-3 py-2 rounded-lg border border-gray-300
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          "
          required
        />
      </div>

      {/* Champs spécifiques selon le type */}
      {device.type === 'lock' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Niveau de batterie
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={device.batteryLevel}
            onChange={e => handleChange('batteryLevel', parseInt(e.target.value))}
            className="
              w-full px-3 py-2 rounded-lg border border-gray-300
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            "
          />
        </div>
      )}

      {device.type === 'light' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Luminosité maximale
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={device.brightness}
              onChange={e => handleChange('brightness', parseInt(e.target.value))}
              className="
                w-full px-3 py-2 rounded-lg border border-gray-300
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              "
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Couleur
            </label>
            <input
              type="color"
              value={device.color}
              onChange={e => handleChange('color', e.target.value)}
              className="
                w-full h-10 px-1 rounded-lg border border-gray-300
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              "
            />
          </div>
        </>
      )}

      {device.type === 'sensor' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unité de mesure
          </label>
          <input
            type="text"
            value={device.unit}
            onChange={e => handleChange('unit', e.target.value)}
            placeholder="Ex: °C, %, lux"
            className="
              w-full px-3 py-2 rounded-lg border border-gray-300
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            "
          />
        </div>
      )}

      {/* Boutons */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="
            px-4 py-2 rounded-lg border border-gray-300
            hover:bg-gray-50 transition-colors
          "
        >
          Annuler
        </button>
        <button
          type="submit"
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg
            bg-blue-600 text-white hover:bg-blue-700 transition-colors
          "
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer</span>
        </button>
      </div>
    </form>
  );
};

export default DeviceConfigurator;
