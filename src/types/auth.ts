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
  source: "browser_gps" | "ip_lookup" | "approximate";
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
