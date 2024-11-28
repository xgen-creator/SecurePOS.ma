import React from 'react';
import { Clock, Users } from 'lucide-react';
import type { ConditionType } from './index';

interface ConditionSelectorProps {
  onSelect: (type: ConditionType) => void;
}

const CONDITIONS = [
  {
    type: 'time_range' as const,
    label: 'Plage horaire',
    description: 'Déclencher à des heures spécifiques',
    icon: Clock
  },
  {
    type: 'person_presence' as const,
    label: 'Présence de personnes',
    description: 'Déclencher selon la présence de personnes',
    icon: Users
  }
];

const ConditionSelector: React.FC<ConditionSelectorProps> = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {CONDITIONS.map(condition => (
        <button
          key={condition.type}
          onClick={() => onSelect(condition.type)}
          className="
            flex items-start gap-3 p-4 rounded-lg border border-gray-200
            hover:border-blue-200 hover:bg-blue-50 transition-colors
            text-left
          "
        >
          <condition.icon className="w-5 h-5 mt-0.5 text-gray-500" />
          <div>
            <h3 className="font-medium text-gray-900">
              {condition.label}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {condition.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ConditionSelector;
