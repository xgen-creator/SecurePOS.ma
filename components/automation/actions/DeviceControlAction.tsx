import React from 'react';
import type { Device } from '../../devices/types';
import type { AutomationAction } from '../types';

interface DeviceControlActionProps {
  action: AutomationAction;
  devices: Device[];
  onChange: (action: AutomationAction) => void;
}

interface DeviceControlConfig {
  deviceId: string;
  command: string;
  value?: number | string;
}

const getDeviceCommands = (device: Device): { value: string; label: string }[] => {
  switch (device.type) {
    case 'lock':
      return [
        { value: 'lock', label: 'Verrouiller' },
        { value: 'unlock', label: 'Déverrouiller' },
      ];
    case 'light':
      return [
        { value: 'turn_on', label: 'Allumer' },
        { value: 'turn_off', label: 'Éteindre' },
        { value: 'set_brightness', label: 'Définir la luminosité' },
        { value: 'set_color', label: 'Définir la couleur' },
      ];
    case 'camera':
      return [
        { value: 'start_recording', label: 'Démarrer l\'enregistrement' },
        { value: 'stop_recording', label: 'Arrêter l\'enregistrement' },
        { value: 'take_snapshot', label: 'Prendre une photo' },
      ];
    default:
      return [];
  }
};

const DeviceControlAction: React.FC<DeviceControlActionProps> = ({
  action,
  devices,
  onChange,
}) => {
  const config = action.config as DeviceControlConfig;
  const selectedDevice = devices.find(d => d.id === config.deviceId);
  const commandOptions = selectedDevice ? getDeviceCommands(selectedDevice) : [];

  const handleDeviceChange = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      const commands = getDeviceCommands(device);
      onChange({
        ...action,
        config: {
          deviceId,
          command: commands[0].value,
        },
      });
    }
  };

  const handleCommandChange = (command: string) => {
    onChange({
      ...action,
      config: {
        ...config,
        command,
        value: undefined, // Reset value when command changes
      },
    });
  };

  const handleValueChange = (value: string) => {
    onChange({
      ...action,
      config: {
        ...config,
        value: selectedDevice?.type === 'light' && config.command === 'set_brightness'
          ? parseInt(value)
          : value,
      },
    });
  };

  const needsValue = selectedDevice?.type === 'light' && 
    (config.command === 'set_brightness' || config.command === 'set_color');

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
            Action
          </label>
          <select
            value={config.command || ''}
            onChange={(e) => handleCommandChange(e.target.value)}
            className="
              w-full px-3 py-2 rounded-lg border border-gray-300
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            "
          >
            {commandOptions.map(option => (
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
            {config.command === 'set_brightness' ? 'Luminosité (%)' : 'Couleur'}
          </label>
          {config.command === 'set_brightness' ? (
            <input
              type="number"
              value={config.value || ''}
              onChange={(e) => handleValueChange(e.target.value)}
              min={0}
              max={100}
              className="
                w-full px-3 py-2 rounded-lg border border-gray-300
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              "
              placeholder="50"
            />
          ) : (
            <input
              type="color"
              value={config.value || '#FFFFFF'}
              onChange={(e) => handleValueChange(e.target.value)}
              className="
                w-full h-10 px-1 rounded-lg border border-gray-300
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              "
            />
          )}
        </div>
      )}
    </div>
  );
};

export default DeviceControlAction;
