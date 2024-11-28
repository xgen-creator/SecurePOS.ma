import { useState, useEffect } from 'react';
import RuleTriggerService from '../services/automation/RuleTriggerService';
import type { Rule } from '../components/automation/RuleBuilder';

interface RuleStatus {
  enabled: boolean;
  lastTriggered: boolean;
  history: Array<{
    timestamp: number;
    triggered: boolean;
    context: any;
  }>;
}

export function useRuleTrigger(ruleId: string) {
  const [status, setStatus] = useState<RuleStatus>(() => 
    RuleTriggerService.getRuleStatus(ruleId)
  );

  useEffect(() => {
    const handleStatusChange = (event: any) => {
      if (event.ruleId === ruleId) {
        setStatus(RuleTriggerService.getRuleStatus(ruleId));
      }
    };

    RuleTriggerService.on('ruleTriggerChange', handleStatusChange);

    return () => {
      RuleTriggerService.off('ruleTriggerChange', handleStatusChange);
    };
  }, [ruleId]);

  const updateRule = (rule: Rule) => {
    RuleTriggerService.updateRule(rule);
  };

  return {
    status,
    updateRule,
    isEnabled: status.enabled,
    lastTriggered: status.lastTriggered,
    history: status.history
  };
}

export default useRuleTrigger;
