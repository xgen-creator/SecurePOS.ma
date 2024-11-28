import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { Rule } from './RuleBuilder';

interface RuleListProps {
  rules: Rule[];
  onEdit: (rule: Rule) => void;
  onDelete: (ruleId: string) => void;
  onToggle: (ruleId: string, enabled: boolean) => void;
}

const getConditionSummary = (condition: any) => {
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

const getActionSummary = (action: any) => {
  switch (action.type) {
    case 'unlock_door':
      return `Déverrouiller la porte (${action.duration}s)`;
    case 'light_control':
      return `${action.state === 'on' ? 'Allumer' : 'Éteindre'} la lumière`;
    case 'notification':
      return 'Envoyer une notification';
    case 'camera_record':
      return `Enregistrer pendant ${action.duration}s`;
    default:
      return 'Action non prise en charge';
  }
};

const RuleList: React.FC<RuleListProps> = ({
  rules,
  onEdit,
  onDelete,
  onToggle
}) => {
  if (rules.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl">
        <p className="text-gray-500">
          Aucune règle d'automatisation configurée
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Créez votre première règle en cliquant sur "Nouvelle règle"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rules.map(rule => (
        <div
          key={rule.id}
          className="bg-white rounded-xl shadow-sm overflow-hidden"
        >
          {/* En-tête */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => onToggle(rule.id, e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <h3 className="font-medium">{rule.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(rule)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(rule.id)}
                className="p-2 rounded-lg hover:bg-gray-100 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Contenu */}
          <div className="p-4 space-y-4">
            {/* Conditions */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                Conditions
              </h4>
              <div className="space-y-1">
                {rule.conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="text-sm px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    {getConditionSummary(condition)}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                Actions
              </h4>
              <div className="space-y-1">
                {rule.actions.map((action, index) => (
                  <div
                    key={index}
                    className="text-sm px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    {getActionSummary(action)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RuleList;
