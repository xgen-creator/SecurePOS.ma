import React, { useState } from 'react';
import type { Device } from '../../devices/types';
import type { AutomationCondition } from '../types';

interface DeviceStateConditionProps {
  condition: AutomationCondition;
  devices: Device[];
  onChange: (condition: AutomationCondition) => void;
}

interface DeviceStateConfig {
  deviceId: string;
  state: string;
  value?: number | string;
}

const getDeviceStateOptions = (device: Device): { value: string; label: string }[] => {
  switch (device.type) {
    case 'lock':
      return [
        { value: 'locked', label: 'Verrouillé' },
        { value: 'unlocked', label: 'Déverrouillé' },
      ];
    case 'light':
      return [
        { value: 'on', label: 'Allumé' },
        { value: 'off', label: 'Éteint' },
        { value: 'brightness', label: 'Luminosité spécifique' },
      ];
    case 'camera':
      return [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'recording', label: 'En enregistrement' },
      ];
    case 'sensor':
      return [
        { value: 'above', label: 'Valeur supérieure à' },
        { value: 'below', label: 'Valeur inférieure à' },
        { value: 'equals', label: 'Valeur égale à' },
      ];
    default:
      return [];
  }
};

const DeviceStateCondition: React.FC<DeviceStateConditionProps> = ({
  condition,
  devices,
  onChange,
}) => {
  const config = condition.config as DeviceStateConfig;
  const selectedDevice = devices.find(d => d.id === config.deviceId);
  const stateOptions = selectedDevice ? getDeviceStateOptions(selectedDevice) : [];

  const handleDeviceChange = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      const states = getDeviceStateOptions(device);
      onChange({
        ...condition,
        config: {
          deviceId,
          state: states[0].value,
        },
      });
    }
  };

  const handleStateChange = (state: string) => {
    onChange({
      ...condition,
      config: {
        ...config,
        state,
        value: undefined, // Reset value when state changes
      },
    });
  };

  const handleValueChange = (value: string) => {
    onChange({
      ...condition,
      config: {
        ...config,
        value: selectedDevice?.type === 'sensor' ? parseFloat(value) : value,
      },
    });
  };

  const needsValue = selectedDevice?.type === 'sensor' || 
    (selectedDevice?.type === 'light' && config.state === 'brightness');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Appareil
        </label>
        <select
          value={config.deviceId || ''}
          onChange={(e) => handleDeviceChange(e.target.value)}
          className="
            w-full px-3 py-2 rounded-lg border border-gray-300
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          "
        >
          <option value="">Sélectionner un appareil</option>
          {devices.map(device => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
      </div>

      {selectedDevice && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            État
          </label>
          <select
            value={config.state || ''}
            onChange={(e) => handleStateChange(e.target.value)}
            className="
              w-full px-3 py-2 rounded-lg border border-gray-300
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            "
          >
            {stateOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {needsValue && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {selectedDevice.type === 'sensor' ? 'Valeur' : 'Luminosité (%)'}
          </label>
          <input
            type="number"
            value={config.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            min={selectedDevice.type === 'light' ? 0 : undefined}
            max={selectedDevice.type === 'light' ? 100 : undefined}
            step={selectedDevice.type === 'sensor' ? 'any' : 1}
            className="
              w-full px-3 py-2 rounded-lg border border-gray-300
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            "
            placeholder={selectedDevice.type === 'sensor' ? `Ex: 25 ${selectedDevice.unit}` : '50'}
          />
        </div>
      )}
    </div>
  );
};

export default DeviceStateCondition;
