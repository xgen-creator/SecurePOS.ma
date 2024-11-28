import React from 'react';
import { Clock, Users, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { Condition } from './index';

interface ConditionListProps {
  conditions: Condition[];
  onDelete: (index: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
}

const getConditionIcon = (type: Condition['type']) => {
  switch (type) {
    case 'time_range':
      return Clock;
    case 'person_presence':
      return Users;
    default:
      return Clock;
  }
};

const getConditionSummary = (condition: Condition): string => {
  switch (condition.type) {
    case 'time_range': {
      const days = condition.days.length === 7
        ? 'Tous les jours'
        : condition.days.length === 0
          ? 'Aucun jour'
          : `${condition.days.length} jours`;
      return `${days} de ${condition.startTime} à ${condition.endTime}`;
    }
    case 'person_presence': {
      const count = condition.personIds.length;
      const requireAll = condition.requireAll;
      const timeWindow = condition.timeWindow
        ? ` dans les ${condition.timeWindow} minutes`
        : '';
      return `${requireAll ? 'Toutes' : 'Une'} les ${count} personnes${timeWindow}`;
    }
    default:
      return 'Condition non prise en charge';
  }
};

const ConditionList: React.FC<ConditionListProps> = ({
  conditions,
  onDelete,
  onMove
}) => {
  if (conditions.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        Aucune condition ajoutée
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conditions.map((condition, index) => {
        const Icon = getConditionIcon(condition.type);
        const canMoveUp = index > 0;
        const canMoveDown = index < conditions.length - 1;

        return (
          <div
            key={index}
            className="
              flex items-center gap-3 p-3 rounded-lg border border-gray-200
              bg-white
            "
          >
            <Icon className="w-4 h-4 text-gray-500" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {getConditionSummary(condition)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => canMoveUp && onMove(index, index - 1)}
                disabled={!canMoveUp}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => canMoveDown && onMove(index, index + 1)}
                disabled={!canMoveDown}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(index)}
                className="p-1 rounded hover:bg-gray-100 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConditionList;
