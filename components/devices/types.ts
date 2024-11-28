import { LucideIcon } from 'lucide-react';

export type DeviceType = 'lock' | 'light' | 'camera' | 'sensor';
export type DevicePlatformId = 'homekit' | 'alexa' | 'google_home';
export type DeviceStatus = 'active' | 'inactive' | 'error' | 'locked' | 'unlocked' | 'on' | 'off';

export interface DevicePlatform {
  id: DevicePlatformId;
  name: string;
  icon: LucideIcon;
  color: string;
}

interface BaseDevice {
  id: string;
  name: string;
  type: DeviceType;
  platform: DevicePlatformId;
  status: DeviceStatus;
  lastSeen: string;
}

export interface LockDevice extends BaseDevice {
  type: 'lock';
  status: 'locked' | 'unlocked';
  batteryLevel: number;
}

export interface LightDevice extends BaseDevice {
  type: 'light';
  status: 'on' | 'off';
  brightness: number;
  color: string;
}

export interface CameraDevice extends BaseDevice {
  type: 'camera';
  status: 'active' | 'inactive';
  recording: boolean;
}

export interface SensorDevice extends BaseDevice {
  type: 'sensor';
  status: 'active' | 'inactive';
  value: number;
  unit: string;
}

export type Device = 
  | LockDevice
  | LightDevice
  | CameraDevice
  | SensorDevice;
