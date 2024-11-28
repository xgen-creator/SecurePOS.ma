import React, { useState } from 'react';
import { Plus, Save } from 'lucide-react';
import type { Condition } from './conditions';
import {
  ConditionSelector,
  ConditionConfigurator,
  ConditionList
} from './conditions';
import type { Action } from './actions';
import {
  ActionSelector,
  ActionConfigurator,
  ActionList
} from './actions';

interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: Condition[];
  actions: Action[];
}

interface RuleBuilderProps {
  initialRule?: Rule;
  onSave: (rule: Rule) => void;
  onCancel: () => void;
}

const createEmptyRule = (): Rule => ({
  id: Math.random().toString(36).substring(7),
  name: '',
  enabled: true,
  conditions: [],
  actions: []
});

const RuleBuilder: React.FC<RuleBuilderProps> = ({
  initialRule,
  onSave,
  onCancel
}) => {
  const [rule, setRule] = useState<Rule>(initialRule || createEmptyRule());
  const [addingCondition, setAddingCondition] = useState(false);
  const [addingAction, setAddingAction] = useState(false);
  const [editingCondition, setEditingCondition] = useState<number | null>(null);
  const [editingAction, setEditingAction] = useState<number | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRule(prev => ({ ...prev, name: e.target.value }));
  };

  const handleConditionSelect = (type: Condition['type']) => {
    const newCondition: Condition = {
      id: Math.random().toString(36).substring(7),
      type,
      enabled: true,
      ...(type === 'time_range' ? {
        days: [],
        startTime: '00:00',
        endTime: '23:59'
      } : type === 'person_presence' ? {
        personIds: [],
        requireAll: false,
        timeWindow: 0
      } : {})
    } as Condition;

    setRule(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
    setAddingCondition(false);
    setEditingCondition(rule.conditions.length);
  };

  const handleActionSelect = (type: Action['type']) => {
    const newAction: Action = {
      id: Math.random().toString(36).substring(7),
      type,
      enabled: true
    } as Action;

    setRule(prev => ({
      ...prev,
      actions: [...prev.actions, newAction]
    }));
    setAddingAction(false);
    setEditingAction(rule.actions.length);
  };

  const handleConditionChange = (index: number, updatedCondition: Condition) => {
    setRule(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) =>
        i === index ? updatedCondition : c
      )
    }));
  };

  const handleActionChange = (index: number, updatedAction: Action) => {
    setRule(prev => ({
      ...prev,
      actions: prev.actions.map((a, i) =>
        i === index ? updatedAction : a
      )
    }));
  };

  const handleConditionDelete = (index: number) => {
    setRule(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
    setEditingCondition(null);
  };

  const handleActionDelete = (index: number) => {
    setRule(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
    setEditingAction(null);
  };

  const handleConditionMove = (fromIndex: number, toIndex: number) => {
    setRule(prev => {
      const conditions = [...prev.conditions];
      const [moved] = conditions.splice(fromIndex, 1);
      conditions.splice(toIndex, 0, moved);
      return { ...prev, conditions };
    });
  };

  const handleActionMove = (fromIndex: number, toIndex: number) => {
    setRule(prev => {
      const actions = [...prev.actions];
      const [moved] = actions.splice(fromIndex, 1);
      actions.splice(toIndex, 0, moved);
      return { ...prev, actions };
    });
  };

  const handleSave = () => {
    if (!rule.name) {
      // TODO: Show error
      return;
    }
    onSave(rule);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Nom de la règle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom de la règle
        </label>
        <input
          type="text"
          value={rule.name}
          onChange={handleNameChange}
          placeholder="Ma règle d'automatisation"
          className="
            w-full px-3 py-2 rounded-lg border border-gray-300
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          "
        />
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Conditions</h3>
          <button
            onClick={() => setAddingCondition(true)}
            className="
              flex items-center gap-2 px-3 py-2 rounded-lg
              bg-gray-100 hover:bg-gray-200 transition-colors
            "
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Ajouter une condition</span>
          </button>
        </div>

        {addingCondition ? (
          <ConditionSelector onSelect={handleConditionSelect} />
        ) : editingCondition !== null ? (
          <ConditionConfigurator
            condition={rule.conditions[editingCondition]}
            onChange={(condition) => handleConditionChange(editingCondition, condition)}
          />
        ) : (
          <ConditionList
            conditions={rule.conditions}
            onDelete={handleConditionDelete}
            onMove={handleConditionMove}
          />
        )}
      </div>

      {/* Actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Actions</h3>
          <button
            onClick={() => setAddingAction(true)}
            className="
              flex items-center gap-2 px-3 py-2 rounded-lg
              bg-gray-100 hover:bg-gray-200 transition-colors
            "
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Ajouter une action</span>
          </button>
        </div>

        {addingAction ? (
          <ActionSelector onSelect={handleActionSelect} />
        ) : editingAction !== null ? (
          <ActionConfigurator
            action={rule.actions[editingAction]}
            onChange={(action) => handleActionChange(editingAction, action)}
          />
        ) : (
          <ActionList
            actions={rule.actions}
            onDelete={handleActionDelete}
            onMove={handleActionMove}
          />
        )}
      </div>

      {/* Boutons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="
            px-4 py-2 rounded-lg border border-gray-300
            hover:bg-gray-50 transition-colors
          "
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg
            bg-blue-600 text-white hover:bg-blue-700 transition-colors
          "
        >
          <Save className="w-4 h-4" />
          <span>Enregistrer</span>
        </button>
      </div>
    </div>
  );
};

export default RuleBuilder;
