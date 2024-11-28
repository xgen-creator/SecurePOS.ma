import React from 'react';
import { Bell } from 'lucide-react';

interface DoorbellTriggerProps {
  trigger: {
    type: 'doorbell';
    doorbellId?: string;
    minPressTime?: number; // en millisecondes
  };
  onChange: (updatedTrigger: any) => void;
}

const DoorbellTrigger: React.FC<DoorbellTriggerProps> = ({
  trigger,
  onChange
}) => {
  const handlePressTimeChange = (value: number) => {
    onChange({
      ...trigger,
      minPressTime: Math.max(0, Math.min(5000, value))
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Bell className="w-4 h-4" />
        <span className="font-medium">Sonnette</span>
      </div>

      {/* Durée minimale de pression */}
      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Durée minimale de pression ({(trigger.minPressTime || 0) / 1000}s)
        </label>
        <input
          type="range"
          min="0"
          max="5000"
          step="100"
          value={trigger.minPressTime || 0}
          onChange={(e) => handlePressTimeChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Immédiat</span>
          <span>5s</span>
        </div>
      </div>

      {/* Sélection de la sonnette si plusieurs sont disponibles */}
      {/* À implémenter selon les besoins */}
    </div>
  );
};

export default DoorbellTrigger;
