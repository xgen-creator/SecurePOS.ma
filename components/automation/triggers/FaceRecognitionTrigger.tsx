import React from 'react';
import { UserCheck, Users } from 'lucide-react';

interface FaceRecognitionTriggerProps {
  trigger: {
    type: 'face_recognition';
    personIds?: string[];
    confidence?: number; // 0-1
    requireAllFaces?: boolean;
  };
  onChange: (updatedTrigger: any) => void;
}

const FaceRecognitionTrigger: React.FC<FaceRecognitionTriggerProps> = ({
  trigger,
  onChange
}) => {
  const handleConfidenceChange = (value: number) => {
    onChange({
      ...trigger,
      confidence: Math.max(0.5, Math.min(1, value / 100))
    });
  };

  const handleRequireAllChange = (value: boolean) => {
    onChange({
      ...trigger,
      requireAllFaces: value
    });
  };

  // Exemple de personnes enregistrées (à remplacer par les données réelles)
  const registeredPeople = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
    { id: '3', name: 'Alice Johnson' }
  ];

  const togglePerson = (personId: string) => {
    const currentIds = trigger.personIds || [];
    const updatedIds = currentIds.includes(personId)
      ? currentIds.filter(id => id !== personId)
      : [...currentIds, personId];

    onChange({
      ...trigger,
      personIds: updatedIds
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <UserCheck className="w-4 h-4" />
        <span className="font-medium">Reconnaissance faciale</span>
      </div>

      {/* Seuil de confiance */}
      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Seuil de confiance ({Math.round((trigger.confidence || 0.85) * 100)}%)
        </label>
        <input
          type="range"
          min="50"
          max="100"
          value={Math.round((trigger.confidence || 0.85) * 100)}
          onChange={(e) => handleConfidenceChange(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Sélection des personnes */}
      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Personnes à reconnaître
        </label>
        <div className="space-y-2">
          {registeredPeople.map(person => (
            <button
              key={person.id}
              onClick={() => togglePerson(person.id)}
              className={`
                w-full flex items-center gap-3 p-2 rounded-lg border transition-colors
                ${trigger.personIds?.includes(person.id)
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
          checked={trigger.requireAllFaces || false}
          onChange={(e) => handleRequireAllChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600"
        />
      </div>
    </div>
  );
};

export default FaceRecognitionTrigger;
