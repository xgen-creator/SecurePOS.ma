import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Switch } from '../../ui/switch';

interface LightControlActionProps {
  action: {
    type: 'light_control';
    state: 'on' | 'off';
    brightness?: number;
    color?: string;
    lightId?: string;
  };
  onChange: (updatedAction: any) => void;
}

const LightControlAction: React.FC<LightControlActionProps> = ({
  action,
  onChange
}) => {
  const handleStateChange = (checked: boolean) => {
    onChange({
      ...action,
      state: checked ? 'on' : 'off'
    });
  };

  const handleBrightnessChange = (value: number) => {
    onChange({
      ...action,
      brightness: Math.max(0, Math.min(100, value))
    });
  };

  const handleColorChange = (color: string) => {
    onChange({
      ...action,
      color
    });
  };

  const presetColors = [
    '#FF9B9B', // Rouge clair
    '#FFB74D', // Orange
    '#FFF59D', // Jaune clair
    '#A5D6A7', // Vert clair
    '#90CAF9', // Bleu clair
    '#CE93D8', // Violet clair
    '#F5F5F5', // Blanc chaud
    '#FFFFFF'  // Blanc froid
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          {action.state === 'on' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
          <span className="font-medium">Contrôle de la lumière</span>
        </div>
        <Switch
          checked={action.state === 'on'}
          onCheckedChange={handleStateChange}
        />
      </div>

      {action.state === 'on' && (
        <>
          {/* Contrôle de la luminosité */}
          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Luminosité ({action.brightness || 100}%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={action.brightness || 100}
              onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Sélection de la couleur */}
          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Couleur
            </label>
            <div className="grid grid-cols-4 gap-2">
              {presetColors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handleColorChange(color)}
                  className={`
                    w-full aspect-square rounded-lg border-2
                    ${action.color === color ? 'border-blue-500' : 'border-transparent'}
                  `}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Sélection de la lampe si plusieurs sont disponibles */}
          {/* À implémenter selon les besoins */}
        </>
      )}
    </div>
  );
};

export default LightControlAction;
