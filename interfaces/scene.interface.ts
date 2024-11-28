export interface Scene {
  id: string;
  name: string;
  description?: string;
  actions: SceneAction[];
  conditions?: SceneCondition[];
  schedule?: SceneSchedule;
}

export interface SceneAction {
  type: string;
  deviceId: string;
  command: string;
  parameters?: any;
}

export interface SceneCondition {
  type: string;
  value: any;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains';
}

export interface SceneSchedule {
  type: 'once' | 'daily' | 'weekly' | 'monthly';
  startTime: string;
  endTime?: string;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
}
