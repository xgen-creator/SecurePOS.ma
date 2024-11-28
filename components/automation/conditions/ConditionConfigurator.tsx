import React from 'react';
import type { Condition } from './index';
import TimeRangeCondition from './TimeRangeCondition';
import PersonPresenceCondition from './PersonPresenceCondition';

interface ConditionConfiguratorProps {
  condition: Condition;
  onChange: (updatedCondition: Condition) => void;
}

const ConditionConfigurator: React.FC<ConditionConfiguratorProps> = ({
  condition,
  onChange
}) => {
  switch (condition.type) {
    case 'time_range':
      return (
        <TimeRangeCondition
          condition={condition}
          onChange={onChange}
        />
      );
    case 'person_presence':
      return (
        <PersonPresenceCondition
          condition={condition}
          onChange={onChange}
        />
      );
    default:
      return (
        <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg">
          Type de condition non pris en charge
        </div>
      );
  }
};

export default ConditionConfigurator;
