import React from 'react';
import { Trash2 } from 'lucide-react';
import {
  Trigger,
  DoorbellTrigger,
  MotionTrigger,
  FaceRecognitionTrigger
} from './';

// Components
import DoorbellTriggerComponent from './DoorbellTrigger';
import MotionTriggerComponent from './MotionTrigger';
import FaceRecognitionTriggerComponent from './FaceRecognitionTrigger';

interface TriggerConfiguratorProps {
  trigger: Trigger;
  onUpdate: (updatedTrigger: Trigger) => void;
  onDelete: () => void;
}

const TriggerConfigurator: React.FC<TriggerConfiguratorProps> = ({
  trigger,
  onUpdate,
  onDelete
}) => {
  const handleChange = (changes: Partial<Trigger>) => {
    onUpdate({
      ...trigger,
      ...changes
    });
  };

  const renderTriggerComponent = () => {
    switch (trigger.type) {
      case 'doorbell':
        return (
          <DoorbellTriggerComponent
            trigger={trigger as DoorbellTrigger}
            onChange={handleChange}
          />
        );
      case 'motion':
        return (
          <MotionTriggerComponent
            trigger={trigger as MotionTrigger}
            onChange={handleChange}
          />
        );
      case 'face_recognition':
        return (
          <FaceRecognitionTriggerComponent
            trigger={trigger as FaceRecognitionTrigger}
            onChange={handleChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative p-4 bg-white rounded-lg border space-y-4">
      {/* En-tête avec bouton de suppression */}
      <div className="absolute top-4 right-4">
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
          title="Supprimer le déclencheur"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Configuration du déclencheur */}
      {renderTriggerComponent()}

      {/* État du déclencheur */}
      <div className="flex items-center justify-between pt-4 border-t">
        <label className="text-sm text-gray-600">
          État du déclencheur
        </label>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={trigger.enabled}
            onChange={(e) => handleChange({ enabled: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-600">
            {trigger.enabled ? 'Activé' : 'Désactivé'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TriggerConfigurator;
