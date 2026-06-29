
export enum ScreenName {
  DASHBOARD = 'DASHBOARD',
  DIAGNOSTIC_CAPTURE = 'DIAGNOSTIC_CAPTURE',
  RESULTS_ANALYSIS = 'RESULTS_ANALYSIS',
  AR_REPAIR_GUIDE = 'AR_REPAIR_GUIDE',
  VERIFICATION_SYSTEM = 'VERIFICATION_SYSTEM',
  REPAIRS = 'REPAIRS',
  SETTINGS = 'SETTINGS',
  PROFILE = 'PROFILE',
  MANUALS = 'MANUALS',
  UPLOAD_MANUAL = 'UPLOAD_MANUAL',
  SYSTEM_STATUS = 'SYSTEM_STATUS',
}

export interface NavigationProps {
  navigate: (screen: ScreenName) => void;
  currentScreen?: ScreenName;
  selectedId?: number | string | null;
  setSelectedId?: (id: number | string | null) => void;
}

export interface TelemetryData {
  peakFrequency: number; // Hz
  avgDecibels: number; // dB
  maxVibration: number; // g-force
  recordingDuration: number; // ms
}

export interface DiagnosticStep {
  id: number;
  title: string;
  time: string;
  tools: string;
  requiresAR?: boolean;
}

export interface SearchSource {
  title: string;
  uri: string;
}

export interface DiagnosticLog {
  equipmentName?: string;
  observation: string;
  hypothesis: string;
  verification: string;
  prescription: string;
  confidenceScore: number;
  steps: DiagnosticStep[];
  safetyWarning?: {
    title: string;
    description: string;
  };
  references?: Array<{
      type: 'MANUAL' | 'HISTORY' | 'IOT' | 'WEB';
      title: string;
      details: string;
      uri?: string;
  }>;
  searchSources?: SearchSource[];
}

export interface VerificationLog {
  resolved: boolean;
  confidence: number;
  analysis: string;
  comparison: {
    acoustic: string;
    visual: string;
    mechanical: string;
  };
  recommendation: string;
}

export interface ARCoordinate {
  id: string;
  label: string;
  partNumber?: string;
  description?: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
}

// Anonymous local session — replaces authenticated user data
export interface LocalSession {
  id: string;
  name: string;
  title: string;
  technician_id: string;
  avatar_url: string | null;
}

export const DEFAULT_SESSION: LocalSession = {
  id: 'local-user',
  name: 'Field Technician',
  title: 'Industrial Specialist',
  technician_id: 'T-1001',
  avatar_url: null,
};
