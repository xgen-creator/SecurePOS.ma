export { default as DoorbellTrigger } from './DoorbellTrigger';
export { default as MotionTrigger } from './MotionTrigger';
export { default as FaceRecognitionTrigger } from './FaceRecognitionTrigger';

export type TriggerType = 
  | 'doorbell'
  | 'motion'
  | 'face_recognition';

export interface BaseTrigger {
  id: string;
  type: TriggerType;
  enabled: boolean;
}

export interface DoorbellTrigger extends BaseTrigger {
  type: 'doorbell';
  doorbellId?: string;
  minPressTime?: number;
}

export interface MotionTrigger extends BaseTrigger {
  type: 'motion';
  sensorId?: string;
  sensitivity?: number;
  cooldown?: number;
}

export interface FaceRecognitionTrigger extends BaseTrigger {
  type: 'face_recognition';
  personIds?: string[];
  confidence?: number;
  requireAllFaces?: boolean;
}

export type Trigger = 
  | DoorbellTrigger
  | MotionTrigger
  | FaceRecognitionTrigger;
