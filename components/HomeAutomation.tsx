import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import RuleBuilder from './automation/RuleBuilder';
import RuleList from './automation/RuleList';
import type { Rule } from './automation/RuleBuilder';

const HomeAutomation: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const handleSaveRule = (rule: Rule) => {
    if (editingRule) {
      setRules(prev =>
        prev.map(r => (r.id === rule.id ? rule : r))
      );
    } else {
      setRules(prev => [...prev, rule]);
    }
    setShowBuilder(false);
    setEditingRule(null);
  };

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setShowBuilder(true);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    setRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, enabled } : r))
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Règles d'automatisation</h1>
        <button
          onClick={() => {
            setEditingRule(null);
            setShowBuilder(true);
          }}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg
            bg-blue-600 text-white hover:bg-blue-700 transition-colors
          "
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle règle</span>
        </button>
      </div>

      {showBuilder ? (
        <div className="bg-white rounded-xl shadow-lg">
          <RuleBuilder
            initialRule={editingRule || undefined}
            onSave={handleSaveRule}
            onCancel={() => {
              setShowBuilder(false);
              setEditingRule(null);
            }}
          />
        </div>
      ) : (
        <RuleList
          rules={rules}
          onEdit={handleEditRule}
          onDelete={handleDeleteRule}
          onToggle={handleToggleRule}
        />
      )}
    </div>
  );
};

export default HomeAutomation;
