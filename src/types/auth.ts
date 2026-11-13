export type UserRole = "manager" | "operator";

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Employee {
  id: string;
  username: string;
  name: string;
  passwordHash: string;
  status: "active" | "suspended";
  createdAt: string;
  lastLoginAt?: string;
  enrolledFaceUrl?: string;
  enrolledBiometricHash?: string;
}

export interface DeviceTelemetry {
  os: string;
  browser: string;
  screenResolution: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  timezone: string;
  language: string;
  platform: string;
  userAgent: string;
}

export interface LocationTelemetry {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number; // GPS accuracy in meters
  altitude?: number | null;
  speed?: number | null;
  source: "browser_gps" | "ip_lookup" | "approximate";
}

export interface NetworkTelemetry {
  effectiveType?: string; // e.g. "4g", "3g", "wifi"
  downlinkMbps?: number; // Bandwidth e.g. 15.2 Mbps
  rttMs?: number; // Round-trip latency e.g. 45 ms
  connectionType?: string; // "wifi" | "cellular" | "ethernet"
  saveData?: boolean;
  localIp?: string; // e.g. "192.168.1.104"
  publicIp?: string;
  networkOnline?: boolean;
}

export interface FaceVerificationTelemetry {
  faceDetected: boolean;
  livenessPassed: boolean;
  livenessScore: number; // 0.0 - 1.0
  isStaticPhoto: boolean;
  isScreenSpoof: boolean;
  blinkDetected: boolean;
  motionVariance: number;
  biometricSignature?: string;
  timestamp: string;
}

export interface LoginAuditEntry {
  id: string;
  userId: string;
  username: string;
  timestamp: string;
  ipAddress: string;
  userAgent?: string;
  location?: LocationTelemetry;
  device?: DeviceTelemetry;
  network?: NetworkTelemetry;
  faceVerification?: FaceVerificationTelemetry;
  photoDataUrl: string; // Stored URL or base64 verification snapshot
  status: "success" | "failed";
  failureReason?: string;
}

export interface ChartCompletionRecord {
  id: string;
  operatorId: string;
  operatorName: string;
  recordNo: string;
  imageName: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
}

export interface OperatorAnalytics {
  operatorId: string;
  operatorName: string;
  totalCompleted: number;
  totalActiveMinutes: number;
  chartsPerMinute: number;
  averageSecondsPerChart: number;
  lastActive: string;
  status: "online" | "idle" | "offline";
}

export interface PracticeImage {
  id: string;
  fileName: string;
  imageUrl: string;
  fileSize?: string;
  groundTruth: Record<string, string>;
  uploadedAt: string;
}

export interface CandidateCompletedImage {
  id: string;
  operatorId: string;
  imageName: string;
  recordNo?: string;
  accuracyPercent: number;
  mistakesCount: number;
  totalFields: number;
  completedAt: string;
}

export interface FieldDiscrepancy {
  field: string;
  label: string;
  expected: string;
  actual: string;
  isMatch: boolean;
}

export interface QualityAuditResult {
  imageName: string;
  accuracyPercent: number;
  mistakesCount: number;
  totalFields: number;
  passedStandard: boolean; // accuracy >= 95.0%
  discrepancies: FieldDiscrepancy[];
  cumulativeMistakes: number;
  cumulativeAccuracy: number;
  totalImagesCompleted: number;
}

export interface CandidateQASummary {
  operatorId: string;
  operatorName: string;
  completedCount: number;
  totalMistakes: number;
  averageAccuracy: number;
  isQualified: boolean; // >= 95%
  lastCompletedAt?: string;
}

