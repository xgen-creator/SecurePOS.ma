import React from 'react';
import { Activity } from 'lucide-react';

interface MotionTriggerProps {
  trigger: {
    type: 'motion';
    sensorId?: string;
    sensitivity?: number; // 0-100
    cooldown?: number; // en secondes
  };
  onChange: (updatedTrigger: any) => void;
}

const MotionTrigger: React.FC<MotionTriggerProps> = ({
  trigger,
  onChange
}) => {
  const handleSensitivityChange = (value: number) => {
    onChange({
      ...trigger,
      sensitivity: Math.max(0, Math.min(100, value))
    });
  };

  const handleCooldownChange = (value: number) => {
    onChange({
      ...trigger,
      cooldown: Math.max(0, Math.min(300, value))
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Activity className="w-4 h-4" />
        <span className="font-medium">Détection de mouvement</span>
      </div>

      {/* Sensibilité */}
      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Sensibilité ({trigger.sensitivity || 50}%)
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={trigger.sensitivity || 50}
          onChange={(e) => handleSensitivityChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Faible</span>
          <span>Élevée</span>
        </div>
      </div>

      {/* Temps de recharge */}
      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Temps de recharge ({trigger.cooldown || 0} secondes)
        </label>
        <input
          type="range"
          min="0"
          max="300"
          step="5"
          value={trigger.cooldown || 0}
          onChange={(e) => handleCooldownChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Aucun</span>
          <span>5min</span>
        </div>
      </div>

      {/* Sélection du capteur si plusieurs sont disponibles */}
      {/* À implémenter selon les besoins */}
    </div>
  );
};

export default MotionTrigger;
