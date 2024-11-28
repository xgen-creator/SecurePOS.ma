import React from 'react';
import { 
  Bell,
  Activity,
  UserCheck,
  Plus
} from 'lucide-react';

interface TriggerSelectorProps {
  onSelect: (triggerType: string) => void;
}

const TriggerSelector: React.FC<TriggerSelectorProps> = ({
  onSelect
}) => {
  const triggerTypes = [
    {
      id: 'doorbell',
      label: 'Sonnette',
      icon: Bell,
      description: 'Se déclenche lorsque quelqu\'un sonne'
    },
    {
      id: 'motion',
      label: 'Détection de mouvement',
      icon: Activity,
      description: 'Se déclenche lors d\'un mouvement'
    },
    {
      id: 'face_recognition',
      label: 'Reconnaissance faciale',
      icon: UserCheck,
      description: 'Se déclenche lorsqu\'une personne est reconnue'
    }
  ];

  return (
    <div className="p-4 bg-white rounded-lg border space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Plus className="w-4 h-4" />
        <span>Ajouter un déclencheur</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {triggerTypes.map(trigger => (
          <button
            key={trigger.id}
            onClick={() => onSelect(trigger.id)}
            className="
              flex items-start gap-3 p-3 rounded-lg border border-gray-200
              hover:border-blue-200 hover:bg-blue-50 transition-colors
              text-left
            "
          >
            <trigger.icon className="w-5 h-5 mt-0.5 text-gray-600" />
            <div>
              <div className="font-medium text-sm">
                {trigger.label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {trigger.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TriggerSelector;
