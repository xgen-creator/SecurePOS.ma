import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeviceManager } from '../../../services/devices/DeviceManager';
import type { Scene } from '../../../services/automation/SceneActionService';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  Lightbulb,
  Thermometer,
  Lock,
  Speaker,
  Camera,
  Blinds,
  Power
} from 'lucide-react';

interface ScenePreviewProps {
  scene: Scene;
  isActive?: boolean;
}

interface DevicePreviewProps {
  deviceId: string;
  targetState: any;
  transitionDuration: number;
  isActive?: boolean;
}

const getDeviceIcon = (deviceType: string) => {
  switch (deviceType.toLowerCase()) {
    case 'light':
      return Lightbulb;
    case 'thermostat':
      return Thermometer;
    case 'lock':
      return Lock;
    case 'speaker':
      return Speaker;
    case 'camera':
      return Camera;
    case 'blind':
      return Blinds;
    default:
      return Power;
  }
};

const DevicePreview: React.FC<DevicePreviewProps> = ({
  deviceId,
  targetState,
  transitionDuration,
  isActive
}) => {
  const [device, setDevice] = useState<any>(null);
  const [currentState, setCurrentState] = useState<any>(null);

  useEffect(() => {
    const deviceManager = DeviceManager.getInstance();
    const deviceInstance = deviceManager.getDevice(deviceId);
    setDevice(deviceInstance);
    setCurrentState(deviceInstance?.getCurrentState());

    const handleStateChange = (newState: any) => {
      setCurrentState(newState);
    };

    if (deviceInstance) {
      deviceInstance.on('stateChanged', handleStateChange);
      return () => {
        deviceInstance.off('stateChanged', handleStateChange);
      };
    }
  }, [deviceId]);

  if (!device || !currentState) return null;

  const Icon = getDeviceIcon(device.type);
  const statePreview = Object.entries(targetState).map(([key, value]) => {
    const property = device.getControlProperties()[key];
    if (!property) return null;

    let displayValue: string | number = value as string | number;
    if (property.type === 'boolean') {
      displayValue = (value as boolean) ? 'Activé' : 'Désactivé';
    } else if (property.unit) {
      displayValue = `${value}${property.unit}`;
    }

    return (
      <div key={key} className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{property.label}:</span>
        <span className="font-medium">
          {isActive ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {displayValue}
            </motion.span>
          ) : (
            displayValue
          )}
        </span>
      </div>
    );
  });

  return (
    <Card className={`p-4 ${isActive ? 'border-primary' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          isActive ? 'bg-primary/10' : 'bg-gray-100'
        }`}>
          <Icon className={`w-5 h-5 ${
            isActive ? 'text-primary' : 'text-gray-500'
          }`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{device.name}</h4>
            {transitionDuration > 0 && (
              <Badge variant="outline" className="text-xs">
                {transitionDuration}s
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            {statePreview}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default function ScenePreview({ scene, isActive }: ScenePreviewProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatePresence>
          {scene.deviceStates.map((deviceState) => (
            <motion.div
              key={deviceState.deviceId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DevicePreview
                deviceId={deviceState.deviceId}
                targetState={deviceState.state}
                transitionDuration={deviceState.transitionDuration || 0}
                isActive={isActive}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {scene.deviceStates.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Aucun appareil configuré dans cette scène
        </div>
      )}
    </div>
  );
}
