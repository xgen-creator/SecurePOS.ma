import React from 'react';
import { Plus } from 'lucide-react';
import { Trigger } from './';
import TriggerConfigurator from './TriggerConfigurator';
import TriggerSelector from './TriggerSelector';

interface TriggerListProps {
  triggers: Trigger[];
  onTriggersChange: (triggers: Trigger[]) => void;
}

const TriggerList: React.FC<TriggerListProps> = ({
  triggers,
  onTriggersChange
}) => {
  const [isAddingTrigger, setIsAddingTrigger] = React.useState(false);

  const handleTriggerUpdate = (index: number, updatedTrigger: Trigger) => {
    const newTriggers = [...triggers];
    newTriggers[index] = updatedTrigger;
    onTriggersChange(newTriggers);
  };

  const handleTriggerDelete = (index: number) => {
    const newTriggers = triggers.filter((_, i) => i !== index);
    onTriggersChange(newTriggers);
  };

  const handleTriggerTypeSelect = (triggerType: string) => {
    const newTrigger: Trigger = {
      id: `trigger-${Date.now()}`,
      type: triggerType as Trigger['type'],
      enabled: true,
      // Type-specific defaults
      ...(triggerType === 'doorbell' && {
        minPressTime: 0
      }),
      ...(triggerType === 'motion' && {
        sensitivity: 50,
        cooldown: 0
      }),
      ...(triggerType === 'face_recognition' && {
        confidence: 0.85,
        requireAllFaces: false,
        personIds: []
      })
    } as Trigger;

    onTriggersChange([...triggers, newTrigger]);
    setIsAddingTrigger(false);
  };

  return (
    <div className="space-y-4">
      {/* Liste des déclencheurs configurés */}
      {triggers.map((trigger, index) => (
        <TriggerConfigurator
          key={trigger.id}
          trigger={trigger}
          onUpdate={(updatedTrigger) => handleTriggerUpdate(index, updatedTrigger)}
          onDelete={() => handleTriggerDelete(index)}
        />
      ))}

      {/* Ajout d'un nouveau déclencheur */}
      {isAddingTrigger ? (
        <TriggerSelector
          onSelect={handleTriggerTypeSelect}
        />
      ) : (
        <button
          onClick={() => setIsAddingTrigger(true)}
          className="
            w-full p-4 rounded-lg border border-dashed border-gray-300
            hover:border-blue-300 hover:bg-blue-50
            flex items-center justify-center gap-2
            text-sm text-gray-600 hover:text-blue-600
            transition-colors
          "
        >
          <Plus className="w-4 h-4" />
          Ajouter un déclencheur
        </button>
      )}
    </div>
  );
};

export default TriggerList;
