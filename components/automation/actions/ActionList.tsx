import React from 'react';
import { Plus } from 'lucide-react';
import { Action } from './';
import ActionConfigurator from './ActionConfigurator';
import ActionSelector from './ActionSelector';

interface ActionListProps {
  actions: Action[];
  onActionsChange: (actions: Action[]) => void;
}

const ActionList: React.FC<ActionListProps> = ({
  actions,
  onActionsChange
}) => {
  const [isAddingAction, setIsAddingAction] = React.useState(false);

  const handleActionUpdate = (index: number, updatedAction: Action) => {
    const newActions = [...actions];
    newActions[index] = updatedAction;
    onActionsChange(newActions);
  };

  const handleActionDelete = (index: number) => {
    const newActions = actions.filter((_, i) => i !== index);
    onActionsChange(newActions);
  };

  const handleActionTypeSelect = (actionType: string) => {
    const newAction: Action = {
      id: `action-${Date.now()}`,
      type: actionType as Action['type'],
      enabled: true,
      // Type-specific defaults
      ...(actionType === 'unlock_door' && {
        duration: 5
      }),
      ...(actionType === 'light_control' && {
        state: 'on',
        brightness: 100
      }),
      ...(actionType === 'notification' && {
        channels: ['push'],
        priority: 'normal'
      }),
      ...(actionType === 'camera_record' && {
        duration: 30,
        quality: 'medium'
      })
    } as Action;

    onActionsChange([...actions, newAction]);
    setIsAddingAction(false);
  };

  return (
    <div className="space-y-4">
      {/* Liste des actions configurées */}
      {actions.map((action, index) => (
        <ActionConfigurator
          key={action.id}
          action={action}
          onUpdate={(updatedAction) => handleActionUpdate(index, updatedAction)}
          onDelete={() => handleActionDelete(index)}
        />
      ))}

      {/* Ajout d'une nouvelle action */}
      {isAddingAction ? (
        <ActionSelector
          onSelect={handleActionTypeSelect}
        />
      ) : (
        <button
          onClick={() => setIsAddingAction(true)}
          className="
            w-full p-4 rounded-lg border border-dashed border-gray-300
            hover:border-blue-300 hover:bg-blue-50
            flex items-center justify-center gap-2
            text-sm text-gray-600 hover:text-blue-600
            transition-colors
          "
        >
          <Plus className="w-4 h-4" />
          Ajouter une action
        </button>
      )}
    </div>
  );
};

export default ActionList;
