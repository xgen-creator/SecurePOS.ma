import React from 'react';
import { Users, Clock } from 'lucide-react';

interface PersonPresenceConditionProps {
  condition: {
    type: 'person_presence';
    personIds: string[];
    requireAll: boolean;
    timeWindow?: number;
  };
  onChange: (updatedCondition: any) => void;
}

const PersonPresenceCondition: React.FC<PersonPresenceConditionProps> = ({
  condition,
  onChange
}) => {
  const handleRequireAllChange = (value: boolean) => {
    onChange({
      ...condition,
      requireAll: value
    });
  };

  const handleTimeWindowChange = (value: number) => {
    onChange({
      ...condition,
      timeWindow: Math.max(0, Math.min(1440, value)) // max 24h
    });
  };

  // Exemple de personnes enregistrées (à remplacer par les données réelles)
  const registeredPeople = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
    { id: '3', name: 'Alice Johnson' }
  ];

  const togglePerson = (personId: string) => {
    const currentIds = condition.personIds || [];
    const updatedIds = currentIds.includes(personId)
      ? currentIds.filter(id => id !== personId)
      : [...currentIds, personId];

    onChange({
      ...condition,
      personIds: updatedIds
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Users className="w-4 h-4" />
        <span className="font-medium">Présence de personnes</span>
      </div>

      {/* Sélection des personnes */}
      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Personnes à détecter
        </label>
        <div className="space-y-2">
          {registeredPeople.map(person => (
            <button
              key={person.id}
              onClick={() => togglePerson(person.id)}
              className={`
                w-full flex items-center gap-3 p-2 rounded-lg border transition-colors
                ${condition.personIds?.includes(person.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200'
                }
              `}
            >
              <Users className="w-4 h-4" />
              <span className="text-sm">{person.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Option pour toutes les personnes */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-600">
          Détecter toutes les personnes sélectionnées
        </label>
        <input
          type="checkbox"
          checked={condition.requireAll || false}
          onChange={(e) => handleRequireAllChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600"
        />
      </div>

      {/* Fenêtre de temps */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <label className="text-sm text-gray-500">
            Fenêtre de temps ({condition.timeWindow || 0} minutes)
          </label>
        </div>
        <input
          type="range"
          min="0"
          max="1440"
          step="5"
          value={condition.timeWindow || 0}
          onChange={(e) => handleTimeWindowChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Immédiat</span>
          <span>24h</span>
        </div>
      </div>
    </div>
  );
};

export default PersonPresenceCondition;
