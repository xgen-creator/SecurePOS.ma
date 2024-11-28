export { default as TimeRangeCondition } from './TimeRangeCondition';
export { default as PersonPresenceCondition } from './PersonPresenceCondition';
export { default as ConditionSelector } from './ConditionSelector';
export { default as ConditionConfigurator } from './ConditionConfigurator';
export { default as ConditionList } from './ConditionList';

export type ConditionType = 
  | 'time_range'
  | 'person_presence';

export interface BaseCondition {
  id: string;
  type: ConditionType;
  enabled: boolean;
}

export interface TimeRangeCondition extends BaseCondition {
  type: 'time_range';
  days: number[]; // 0-6 (dimanche-samedi)
  startTime: string; // format "HH:mm"
  endTime: string; // format "HH:mm"
}

export interface PersonPresenceCondition extends BaseCondition {
  type: 'person_presence';
  personIds: string[];
  requireAll: boolean;
  timeWindow?: number; // en minutes, durée pendant laquelle la personne doit être présente
}

export type Condition = 
  | TimeRangeCondition
  | PersonPresenceCondition;
