export interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success' | 'ai';
  message: string;
}

export interface DeviceStatus {
  battery: number;
  network: '5G' | '4G' | 'WiFi' | 'Offline';
  isLocked: boolean;
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  lastSeen: Date;
}

export enum SecurityMode {
  MONITORING = 'MONITORING',
  TRACKING = 'TRACKING',
  LOCKDOWN = 'LOCKDOWN',
}

export interface SignalDataPoint {
  time: string;
  strength: number;
}
