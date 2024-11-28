import React, { useState, useEffect } from 'react';
import { User, Search } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';

interface Person {
  id: string;
  name: string;
  imageUrl: string;
}

interface FaceRecognitionConditionProps {
  condition: {
    type: 'face_recognized';
    personIds: string[];
    confidence: number;
    presenceDuration: number;
    requireAllPresent: boolean;
    withinTimeWindow: number;
  };
  onChange: (updatedCondition: any) => void;
}

const FaceRecognitionCondition: React.FC<FaceRecognitionConditionProps> = ({
  condition,
  onChange
}) => {
  const [registeredPeople, setRegisteredPeople] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);

  useEffect(() => {
    // Charger la liste des personnes enregistrées
    const loadPeople = async () => {
      const people = [
        { id: '1', name: 'John Doe', imageUrl: '/avatars/john.jpg' },
        { id: '2', name: 'Jane Smith', imageUrl: '/avatars/jane.jpg' },
        { id: '3', name: 'Alice Johnson', imageUrl: '/avatars/alice.jpg' },
      ];
      setRegisteredPeople(people);
      
      // Initialize selected people from condition
      if (condition.personIds) {
        const selected = people.filter(p => condition.personIds.includes(p.id));
        setSelectedPeople(selected);
      }
    };
    loadPeople();
  }, []);

  const handlePersonToggle = (person: Person) => {
    const isSelected = selectedPeople.some(p => p.id === person.id);
    const newSelected = isSelected
      ? selectedPeople.filter(p => p.id !== person.id)
      : [...selectedPeople, person];
    
    setSelectedPeople(newSelected);
    onChange({
      ...condition,
      personIds: newSelected.map(p => p.id)
    });
  };

  const handlePresenceDurationChange = (duration: number) => {
    onChange({
      ...condition,
      presenceDuration: duration
    });
  };

  const handleRequireAllPresentChange = (required: boolean) => {
    onChange({
      ...condition,
      requireAllPresent: required
    });
  };

  const handleTimeWindowChange = (window: number) => {
    onChange({
      ...condition,
      withinTimeWindow: window
    });
  };

  const handleConfidenceChange = (value: number) => {
    onChange({
      ...condition,
      confidence: Math.min(Math.max(value, 0), 1)
    });
  };

  const filteredPeople = registeredPeople.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <User className="w-4 h-4" />
        <span className="font-medium">Reconnaissance faciale</span>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4" />
          <input
            type="text"
            placeholder="Rechercher une personne..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {filteredPeople
            .map(person => (
              <div
                key={person.id}
                className={`flex items-center p-2 border rounded cursor-pointer ${
                  selectedPeople.some(p => p.id === person.id)
                    ? 'bg-primary/10 border-primary'
                    : ''
                }`}
                onClick={() => handlePersonToggle(person)}
              >
                <img
                  src={person.imageUrl}
                  alt={person.name}
                  className="w-8 h-8 rounded-full"
                />
                <span className="ml-2">{person.name}</span>
              </div>
            ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">
              Durée de présence minimale (secondes)
            </label>
            <input
              type="number"
              min="0"
              value={condition.presenceDuration}
              onChange={(e) => handlePresenceDurationChange(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Fenêtre de détection (secondes)
            </label>
            <input
              type="number"
              min="0"
              value={condition.withinTimeWindow}
              onChange={(e) => handleTimeWindowChange(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={condition.requireAllPresent}
              onChange={(e) => handleRequireAllPresentChange(e.target.checked)}
              className="rounded"
            />
            <label className="text-sm font-medium">
              Toutes les personnes doivent être présentes
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Seuil de confiance ({Math.round(condition.confidence * 100)}%)
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={condition.confidence}
              onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRecognitionCondition;
