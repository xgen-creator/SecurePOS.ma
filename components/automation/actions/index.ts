export { default as UnlockDoorAction } from './UnlockDoorAction';
export { default as LightControlAction } from './LightControlAction';
export { default as NotificationAction } from './NotificationAction';
export { default as CameraRecordAction } from './CameraRecordAction';
export { default as ActionSelector } from './ActionSelector';

export type ActionType = 
  | 'unlock_door'
  | 'light_control'
  | 'notification'
  | 'camera_record';

export interface BaseAction {
  id: string;
  type: ActionType;
  enabled: boolean;
}

export interface UnlockDoorAction extends BaseAction {
  type: 'unlock_door';
  duration: number;
  lockId?: string;
}

export interface LightControlAction extends BaseAction {
  type: 'light_control';
  state: 'on' | 'off';
  brightness?: number;
  color?: string;
  lightId?: string;
}

export interface NotificationAction extends BaseAction {
  type: 'notification';
  message?: string;
  channels: string[];
  priority?: 'low' | 'normal' | 'high';
}

export interface CameraRecordAction extends BaseAction {
  type: 'camera_record';
  duration: number;
  quality?: 'low' | 'medium' | 'high';
  saveLocation?: string;
  cameraId?: string;
}

export type Action = 
  | UnlockDoorAction
  | LightControlAction
  | NotificationAction
  | CameraRecordAction;
