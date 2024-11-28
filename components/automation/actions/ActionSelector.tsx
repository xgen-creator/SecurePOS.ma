import React from 'react';
import { 
  Lock,
  Sun,
  Bell,
  Video,
  Plus
} from 'lucide-react';

interface ActionSelectorProps {
  onSelect: (actionType: string) => void;
}

const ActionSelector: React.FC<ActionSelectorProps> = ({
  onSelect
}) => {
  const actionTypes = [
    {
      id: 'unlock_door',
      label: 'Déverrouiller la porte',
      icon: Lock,
      description: 'Déverrouille la porte pendant une durée définie'
    },
    {
      id: 'light_control',
      label: 'Contrôler la lumière',
      icon: Sun,
      description: 'Allume, éteint ou ajuste la luminosité'
    },
    {
      id: 'notification',
      label: 'Envoyer une notification',
      icon: Bell,
      description: 'Envoie une alerte via différents canaux'
    },
    {
      id: 'camera_record',
      label: 'Enregistrer la caméra',
      icon: Video,
      description: 'Démarre un enregistrement vidéo'
    }
  ];

  return (
    <div className="p-4 bg-white rounded-lg border space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Plus className="w-4 h-4" />
        <span>Ajouter une action</span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {actionTypes.map(action => (
          <button
            key={action.id}
            onClick={() => onSelect(action.id)}
            className="
              flex items-start gap-3 p-3 rounded-lg border border-gray-200
              hover:border-blue-200 hover:bg-blue-50 transition-colors
              text-left
            "
          >
            <action.icon className="w-5 h-5 mt-0.5 text-gray-600" />
            <div>
              <div className="font-medium text-sm">
                {action.label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {action.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ActionSelector;
