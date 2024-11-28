import React from 'react';
import { Video, Clock, Camera } from 'lucide-react';

interface CameraRecordActionProps {
  action: {
    type: 'camera_record';
    duration: number;
    quality?: 'low' | 'medium' | 'high';
    saveLocation?: string;
    cameraId?: string;
  };
  onChange: (updatedAction: any) => void;
}

const CameraRecordAction: React.FC<CameraRecordActionProps> = ({
  action,
  onChange
}) => {
  const handleDurationChange = (value: number) => {
    onChange({
      ...action,
      duration: Math.max(5, Math.min(300, value))
    });
  };

  const handleQualityChange = (quality: 'low' | 'medium' | 'high') => {
    onChange({
      ...action,
      quality
    });
  };

  const qualityOptions = [
    { id: 'low', label: 'Basse (720p)', size: '~500MB/h' },
    { id: 'medium', label: 'Moyenne (1080p)', size: '~1.5GB/h' },
    { id: 'high', label: 'Haute (2K)', size: '~3GB/h' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Video className="w-4 h-4" />
        <span className="font-medium">Enregistrement caméra</span>
      </div>

      {/* Durée d'enregistrement */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <label className="text-sm text-gray-500">
            Durée d'enregistrement ({action.duration} secondes)
          </label>
        </div>
        <input
          type="range"
          min="5"
          max="300"
          step="5"
          value={action.duration}
          onChange={(e) => handleDurationChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>5s</span>
          <span>5min</span>
        </div>
      </div>

      {/* Qualité d'enregistrement */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Camera className="w-4 h-4 text-gray-500" />
          <label className="text-sm text-gray-500">
            Qualité d'enregistrement
          </label>
        </div>
        <div className="space-y-2">
          {qualityOptions.map(option => (
            <button
              key={option.id}
              onClick={() => handleQualityChange(option.id as any)}
              className={`
                w-full flex items-center justify-between p-2 rounded-lg border transition-colors
                ${action.quality === option.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200'
                }
              `}
            >
              <span className="text-sm">{option.label}</span>
              <span className="text-xs text-gray-500">{option.size}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sélection de la caméra si plusieurs sont disponibles */}
      {/* À implémenter selon les besoins */}
    </div>
  );
};

export default CameraRecordAction;
