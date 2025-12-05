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

// Fixed: Changed from 'enum' to 'const' to satisfy Vite/Vercel build strictness
export const SecurityMode = {
  MONITORING: 'MONITORING',
  TRACKING: 'TRACKING',
  LOCKDOWN: 'LOCKDOWN',
} as const;

export type SecurityMode = typeof SecurityMode[keyof typeof SecurityMode];

export interface SignalDataPoint {
  time: string;
  strength: number;
}