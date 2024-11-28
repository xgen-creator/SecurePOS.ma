import React from 'react';
import { Lock } from 'lucide-react';

interface UnlockDoorActionProps {
  action: {
    type: 'unlock_door';
    duration: number;
    lockId?: string;
  };
  onChange: (updatedAction: any) => void;
}

const UnlockDoorAction: React.FC<UnlockDoorActionProps> = ({
  action,
  onChange
}) => {
  const handleDurationChange = (value: number) => {
    onChange({
      ...action,
      duration: Math.max(1, Math.min(30, value))
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Lock className="w-4 h-4" />
        <span className="font-medium">Déverrouiller la porte</span>
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Durée de déverrouillage ({action.duration} secondes)
        </label>
        <input
          type="range"
          min="1"
          max="30"
          value={action.duration}
          onChange={(e) => handleDurationChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>1s</span>
          <span>30s</span>
        </div>
      </div>

      {/* Sélection de la serrure si plusieurs sont disponibles */}
      {/* À implémenter selon les besoins */}
    </div>
  );
};

export default UnlockDoorAction;
