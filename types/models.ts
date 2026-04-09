// Types centraux pour ScanBell - Correspondent au schéma Supabase

// Enums
export type UserRole = 'ADMIN' | 'OWNER' | 'MANAGER' | 'VIEWER';
export type DeviceType = 'DOORBELL' | 'CAMERA' | 'LOCK' | 'SENSOR' | 'HUB';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'ERROR' | 'UPDATING';
export type AccessLevel = 'GUEST' | 'CONTRACTOR' | 'EMPLOYEE' | 'FAMILY' | 'ADMIN';
export type AccessAction = 'ENTRY' | 'EXIT' | 'DENIED' | 'DELIVERY' | 'VISITOR';
export type AccessStatus = 'SUCCESS' | 'FAILURE' | 'PENDING' | 'TIMEOUT';
export type AuthMethod = 'FACIAL_RECOGNITION' | 'QR_CODE' | 'NFC' | 'PIN' | 'MANUAL' | 'REMOTE';
export type RecordingType = 'VIDEO' | 'AUDIO' | 'SNAPSHOT' | 'EVENT';
export type Severity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

// User
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  backup_codes?: string[];
  created_at: string;
  updated_at: string;
}

// Property
export interface Property {
  id: string;
  name: string;
  address: string;
  timezone: string;
  settings: Record<string, unknown>;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// Device
export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  status: DeviceStatus;
  serial_number: string;
  firmware?: string;
  last_seen?: string;
  settings: Record<string, unknown>;
  property_id: string;
  created_at: string;
  updated_at: string;
}

// Visitor
export interface Visitor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  face_descriptor: string;
  face_image_url?: string;
  access_level: AccessLevel;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  property_id: string;
  created_at: string;
  updated_at: string;
}

// Access Log
export interface AccessLog {
  id: string;
  action: AccessAction;
  status: AccessStatus;
  confidence?: number;
  method: AuthMethod;
  visitor_id?: string;
  device_id: string;
  property_id: string;
  ip_address?: string;
  user_agent?: string;
  geo_location?: Record<string, unknown>;
  created_at: string;
}

// Session
export interface Session {
  id: string;
  token: string;
  refresh_token: string;
  expires_at: string;
  user_id: string;
  device_info: Record<string, unknown>;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

// Recording
export interface Recording {
  id: string;
  type: RecordingType;
  url: string;
  thumbnail_url?: string;
  duration?: number;
  device_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  event_type: string;
  severity: Severity;
  details: Record<string, unknown>;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Notification
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'ALERT' | 'INFO' | 'WARNING';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  user_id?: string;
  metadata?: Record<string, unknown>;
  read?: boolean;
  read_at?: string;
  created_at: string;
}

// Face Recognition Types
export interface FaceProfile {
  id: string;
  name: string;
  descriptors: Float32Array[];
  thumbnail?: string;
  lastSeen?: Date;
  scenes?: string[];
  customActions?: {
    onPresence?: string[];
    onAbsence?: string[];
  };
}

export interface DetectedFace {
  id?: string;
  name?: string;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: unknown;
  descriptor: Float32Array;
  age?: number;
  gender?: string;
  expression?: Record<string, number>;
}

// Device Info for Auth
export interface DeviceInfo {
  deviceId: string;
  ipAddress: string;
  userAgent: string;
}

// Auth Response
export interface AuthResponse {
  user: User;
  session?: Session;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

// Visitor Info
export interface VisitorInfo {
  isKnown: boolean;
  visitor?: Visitor;
  expression?: {
    dominant: string;
    emotions: Record<string, number>;
  };
  timestamp: Date;
  image?: unknown;
}
