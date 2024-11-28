import React from 'react';
import { Trash2 } from 'lucide-react';
import {
  Action,
  UnlockDoorAction,
  LightControlAction,
  NotificationAction,
  CameraRecordAction
} from './';

// Components
import UnlockDoorActionComponent from './UnlockDoorAction';
import LightControlActionComponent from './LightControlAction';
import NotificationActionComponent from './NotificationAction';
import CameraRecordActionComponent from './CameraRecordAction';

interface ActionConfiguratorProps {
  action: Action;
  onUpdate: (updatedAction: Action) => void;
  onDelete: () => void;
}

const ActionConfigurator: React.FC<ActionConfiguratorProps> = ({
  action,
  onUpdate,
  onDelete
}) => {
  const handleChange = (changes: Partial<Action>) => {
    onUpdate({
      ...action,
      ...changes
    });
  };

  const renderActionComponent = () => {
    switch (action.type) {
      case 'unlock_door':
        return (
          <UnlockDoorActionComponent
            action={action as UnlockDoorAction}
            onChange={handleChange}
          />
        );
      case 'light_control':
        return (
          <LightControlActionComponent
            action={action as LightControlAction}
            onChange={handleChange}
          />
        );
      case 'notification':
        return (
          <NotificationActionComponent
            action={action as NotificationAction}
            onChange={handleChange}
          />
        );
      case 'camera_record':
        return (
          <CameraRecordActionComponent
            action={action as CameraRecordAction}
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
          title="Supprimer l'action"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Configuration de l'action */}
      {renderActionComponent()}

      {/* État de l'action */}
      <div className="flex items-center justify-between pt-4 border-t">
        <label className="text-sm text-gray-600">
          État de l'action
        </label>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={action.enabled}
            onChange={(e) => handleChange({ enabled: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-600">
            {action.enabled ? 'Activée' : 'Désactivée'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ActionConfigurator;
