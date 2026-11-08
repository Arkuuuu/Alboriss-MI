import crypto from "crypto";
import {
  LoginAuditEntry,
  ChartCompletionRecord,
  OperatorAnalytics,
  Employee,
  DeviceTelemetry,
  LocationTelemetry,
} from "../types/auth";
import { NextRequest } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "./supabase";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// In-memory Employee Store (synced with Supabase if configured)
let employees: Employee[] = [
  {
    id: "usr-01",
    username: "operator1",
    name: "Sarah Jenkins",
    passwordHash: hashPassword("pass123"),
    status: "active",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "usr-02",
    username: "operator2",
    name: "Alex Rivera",
    passwordHash: hashPassword("pass123"),
    status: "active",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    lastLoginAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

// In-memory telemetry & audit store
const auditLogs: LoginAuditEntry[] = [
  {
    id: "audit-1",
    userId: "usr-01",
    username: "operator1",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    ipAddress: "192.168.1.104",
    location: {
      city: "Austin",
      region: "Texas",
      country: "United States",
      source: "ip_lookup",
    },
    device: {
      os: "Windows 11 (64-bit)",
      browser: "Chrome 122.0.0.0",
      screenResolution: "1920 x 1080",
      hardwareConcurrency: 8,
      timezone: "America/Chicago",
      language: "en-US",
      platform: "Win32",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    photoDataUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><rect width='160' height='120' fill='%231e293b'/><circle cx='80' cy='50' r='25' fill='%2338bdf8'/><path d='M40 100 Q80 70 120 100' stroke='%2338bdf8' stroke-width='8' fill='none'/><text x='80' y='115' fill='%2394a3b8' font-size='10' text-anchor='middle'>Identity Verified</text></svg>",
    status: "success",
  },
  {
    id: "audit-2",
    userId: "usr-02",
    username: "operator2",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    ipAddress: "192.168.1.112",
    location: {
      city: "San Francisco",
      region: "California",
      country: "United States",
      source: "ip_lookup",
    },
    device: {
      os: "macOS 14.3 Sonoma",
      browser: "Safari 17.2",
      screenResolution: "2560 x 1440",
      hardwareConcurrency: 10,
      timezone: "America/Los_Angeles",
      language: "en-US",
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    },
    photoDataUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><rect width='160' height='120' fill='%231e293b'/><circle cx='80' cy='50' r='25' fill='%2334d399'/><path d='M40 100 Q80 70 120 100' stroke='%2334d399' stroke-width='8' fill='none'/><text x='80' y='115' fill='%2394a3b8' font-size='10' text-anchor='middle'>Identity Verified</text></svg>",
    status: "success",
  },
];

// Recorded chart completions
const chartCompletions: ChartCompletionRecord[] = [
  {
    id: "chart-1",
    operatorId: "usr-01",
    operatorName: "Sarah Jenkins",
    recordNo: "1797",
    imageName: "MI 27_K-1 (87).jpeg",
    startedAt: new Date(Date.now() - 1200000).toISOString(),
    completedAt: new Date(Date.now() - 1170000).toISOString(),
    durationSeconds: 30,
  },
  {
    id: "chart-2",
    operatorId: "usr-01",
    operatorName: "Sarah Jenkins",
    recordNo: "1798",
    imageName: "MI 27_K-1 (88).jpeg",
    startedAt: new Date(Date.now() - 1150000).toISOString(),
    completedAt: new Date(Date.now() - 1122000).toISOString(),
    durationSeconds: 28,
  },
  {
    id: "chart-3",
    operatorId: "usr-02",
    operatorName: "Alex Rivera",
    recordNo: "9287394",
    imageName: "MI 27_K-1 (89).jpeg",
    startedAt: new Date(Date.now() - 600000).toISOString(),
    completedAt: new Date(Date.now() - 565000).toISOString(),
    durationSeconds: 35,
  },
];

// Rate limiting cache
interface RateLimitInfo {
  attempts: number;
  lockedUntil: number;
}
const rateLimitMap = new Map<string, RateLimitInfo>();

/**
 * Extracts real client IP address securely, respecting reverse proxies (Vercel, Cloudflare, AWS ALB)
 */
export function extractClientIp(req: NextRequest): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",");
    const clientIp = parts[0]?.trim();
    if (clientIp) return clientIp;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

/**
 * Derives approximate geo location from client IP or Vercel edge geolocation headers
 */
export function extractGeoLocation(req: NextRequest, clientIp: string): LocationTelemetry {
  const city = req.headers.get("x-vercel-ip-city") || undefined;
  const region = req.headers.get("x-vercel-ip-country-region") || undefined;
  const country = req.headers.get("x-vercel-ip-country") || undefined;
  const latitudeStr = req.headers.get("x-vercel-ip-latitude");
  const longitudeStr = req.headers.get("x-vercel-ip-longitude");

  const latitude = latitudeStr ? parseFloat(latitudeStr) : undefined;
  const longitude = longitudeStr ? parseFloat(longitudeStr) : undefined;

  if (city || country) {
    return {
      city,
      region,
      country,
      latitude,
      longitude,
      source: "ip_lookup",
    };
  }

  // Fallback for local practice or proxies without Vercel geo headers
  if (clientIp === "127.0.0.1" || clientIp === "::1" || clientIp.startsWith("192.168.")) {
    return {
      city: "Local Workstation (Home)",
      region: "Internal Network",
      country: "LAN/Home",
      source: "approximate",
    };
  }

  return {
    city: "Remote Location",
    country: "Worldwide",
    source: "approximate",
  };
}

/**
 * Rate limit check
 */
export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry) return { allowed: true };

  if (entry.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    rateLimitMap.delete(key);
  }

  return { allowed: true };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { attempts: 0, lockedUntil: 0 };
  entry.attempts += 1;

  if (entry.attempts >= 5) {
    entry.lockedUntil = now + 15 * 60 * 1000; // 15-minute lock
  }

  rateLimitMap.set(key, entry);
}

export function resetFailedAttempts(key: string): void {
  rateLimitMap.delete(key);
}

/* ==========================================================================
   EMPLOYEE CREDENTIAL & ACCOUNT MANAGEMENT (Created exclusively by Manager)
   ========================================================================== */

export async function getEmployees(): Promise<Omit<Employee, "passwordHash">[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from("employees")
        .select("id, username, name, status, created_at, last_login_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        return data.map((d) => ({
          id: d.id,
          username: d.username,
          name: d.name,
          status: d.status,
          createdAt: d.created_at,
          lastLoginAt: d.last_login_at,
        }));
      }
    } catch (e) {
      console.warn("Supabase getEmployees fallback to memory:", e);
    }
  }

  return employees.map(({ passwordHash: _, ...rest }) => rest);
}

export async function createEmployee(
  name: string,
  username: string,
  passwordPlain: string
): Promise<{ success: boolean; employee?: Omit<Employee, "passwordHash">; error?: string }> {
  const normalizedUser = username.trim().toLowerCase();

  // Validate uniqueness
  const exists = employees.some((e) => e.username.toLowerCase() === normalizedUser);
  if (exists) {
    return { success: false, error: "Username already exists. Please choose a unique username." };
  }

  const newEmp: Employee = {
    id: `emp-${Date.now()}`,
    username: normalizedUser,
    name: name.trim(),
    passwordHash: hashPassword(passwordPlain),
    status: "active",
    createdAt: new Date().toISOString(),
  };

  employees.unshift(newEmp);

  // Sync to Supabase if configured
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from("employees").insert({
        id: newEmp.id,
        username: newEmp.username,
        name: newEmp.name,
        password_hash: newEmp.passwordHash,
        status: newEmp.status,
        created_at: newEmp.createdAt,
      });
    } catch (e) {
      console.warn("Supabase employee insert error:", e);
    }
  }

  const { passwordHash: _, ...safeEmp } = newEmp;
  return { success: true, employee: safeEmp };
}

export async function toggleEmployeeStatus(id: string): Promise<boolean> {
  const emp = employees.find((e) => e.id === id);
  if (!emp) return false;

  emp.status = emp.status === "active" ? "suspended" : "active";

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin
        .from("employees")
        .update({ status: emp.status })
        .eq("id", id);
    } catch (e) {
      console.warn("Supabase toggle status error:", e);
    }
  }

  return true;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const index = employees.findIndex((e) => e.id === id);
  if (index === -1) return false;

  employees.splice(index, 1);

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from("employees").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase employee delete error:", e);
    }
  }

  return true;
}

export async function verifyEmployeeLogin(
  username: string,
  passwordPlain: string
): Promise<{ valid: boolean; employee?: Employee; reason?: string }> {
  const normalizedUser = username.trim().toLowerCase();

  // If Supabase configured, check Supabase first
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from("employees")
        .select("*")
        .eq("username", normalizedUser)
        .single();

      if (!error && data) {
        if (data.status !== "active") {
          return { valid: false, reason: "Employee account is suspended. Contact your manager." };
        }
        const inputHash = hashPassword(passwordPlain);
        if (data.password_hash === inputHash) {
          // Update last login
          await supabaseAdmin
            .from("employees")
            .update({ last_login_at: new Date().toISOString() })
            .eq("id", data.id);

          return {
            valid: true,
            employee: {
              id: data.id,
              username: data.username,
              name: data.name,
              passwordHash: data.password_hash,
              status: data.status,
              createdAt: data.created_at,
              lastLoginAt: new Date().toISOString(),
            },
          };
        }
      }
    } catch (e) {
      console.warn("Supabase auth check fallback:", e);
    }
  }

  // Fallback to in-memory store
  const emp = employees.find((e) => e.username.toLowerCase() === normalizedUser);
  if (!emp) {
    return { valid: false, reason: "Invalid Operator ID or password." };
  }

  if (emp.status !== "active") {
    return { valid: false, reason: "Account suspended. Please contact your manager." };
  }

  const inputHash = hashPassword(passwordPlain);
  if (emp.passwordHash !== inputHash) {
    return { valid: false, reason: "Invalid Operator ID or password." };
  }

  emp.lastLoginAt = new Date().toISOString();
  return { valid: true, employee: emp };
}

/* ==========================================================================
   AUDIT LOGGING WITH WEBCAM SNAPSHOT, IP & FULL DEVICE/LOCATION TELEMETRY
   ========================================================================== */

export async function logLoginEvent(
  entry: Omit<LoginAuditEntry, "id">
): Promise<LoginAuditEntry> {
  const newEntry: LoginAuditEntry = {
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };

  auditLogs.unshift(newEntry);

  // Sync to Supabase if configured
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from("login_audit_logs").insert({
        id: newEntry.id,
        user_id: newEntry.userId,
        username: newEntry.username,
        timestamp: newEntry.timestamp,
        ip_address: newEntry.ipAddress,
        location: newEntry.location || {},
        device: newEntry.device || {},
        photo_url: newEntry.photoDataUrl,
        status: newEntry.status,
        failure_reason: newEntry.failureReason || null,
      });
    } catch (e) {
      console.warn("Supabase log audit error:", e);
    }
  }

  return newEntry;
}

export async function getAuditLogs(): Promise<LoginAuditEntry[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from("login_audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);

      if (!error && data) {
        return data.map((d) => ({
          id: d.id,
          userId: d.user_id,
          username: d.username,
          timestamp: d.timestamp,
          ipAddress: d.ip_address,
          location: d.location,
          device: d.device,
          photoDataUrl: d.photo_url,
          status: d.status,
          failureReason: d.failure_reason,
        }));
      }
    } catch (e) {
      console.warn("Supabase getAuditLogs fallback:", e);
    }
  }

  return auditLogs.slice(0, 100);
}

/* ==========================================================================
   PRODUCTIVITY TELEMETRY & CHARTS PER MINUTE (CPM)
   ========================================================================== */

export async function recordChartCompletion(
  operatorId: string,
  operatorName: string,
  recordNo: string,
  imageName: string,
  durationSeconds: number
): Promise<ChartCompletionRecord> {
  const now = new Date();
  const started = new Date(now.getTime() - durationSeconds * 1000);

  const record: ChartCompletionRecord = {
    id: `chart-${Date.now()}`,
    operatorId,
    operatorName,
    recordNo,
    imageName,
    startedAt: started.toISOString(),
    completedAt: now.toISOString(),
    durationSeconds: Math.max(1, durationSeconds),
  };

  chartCompletions.unshift(record);

  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      await supabaseAdmin.from("chart_completions").insert({
        id: record.id,
        operator_id: record.operatorId,
        operator_name: record.operatorName,
        record_no: record.recordNo,
        image_name: record.imageName,
        started_at: record.startedAt,
        completed_at: record.completedAt,
        duration_seconds: record.durationSeconds,
      });
    } catch (e) {
      console.warn("Supabase chart completion insert error:", e);
    }
  }

  return record;
}

export function getOperatorAnalytics(): OperatorAnalytics[] {
  const operatorMap = new Map<
    string,
    {
      name: string;
      totalCompleted: number;
      totalSeconds: number;
      lastActive: string;
    }
  >();

  for (const c of chartCompletions) {
    const existing = operatorMap.get(c.operatorId) || {
      name: c.operatorName,
      totalCompleted: 0,
      totalSeconds: 0,
      lastActive: c.completedAt,
    };
    existing.totalCompleted += 1;
    existing.totalSeconds += c.durationSeconds;
    if (new Date(c.completedAt) > new Date(existing.lastActive)) {
      existing.lastActive = c.completedAt;
    }
    operatorMap.set(c.operatorId, existing);
  }

  const result: OperatorAnalytics[] = [];
  for (const [operatorId, data] of operatorMap.entries()) {
    const totalMinutes = Math.max(0.1, data.totalSeconds / 60);
    const cpm = Number((data.totalCompleted / totalMinutes).toFixed(2));
    const avgSec = Math.round(data.totalSeconds / data.totalCompleted);

    const minutesSinceLast = (Date.now() - new Date(data.lastActive).getTime()) / 60000;
    const status: "online" | "idle" | "offline" =
      minutesSinceLast < 5 ? "online" : minutesSinceLast < 20 ? "idle" : "offline";

    result.push({
      operatorId,
      operatorName: data.name,
      totalCompleted: data.totalCompleted,
      totalActiveMinutes: Number(totalMinutes.toFixed(1)),
      chartsPerMinute: cpm,
      averageSecondsPerChart: avgSec,
      lastActive: data.lastActive,
      status,
    });
  }

  return result;
}

export async function getOverallMetrics() {
  const analytics = getOperatorAnalytics();
  const allEmps = await getEmployees();
  const totalCharts = chartCompletions.length;
  const avgCPM =
    analytics.length > 0
      ? Number(
          (
            analytics.reduce((acc, curr) => acc + curr.chartsPerMinute, 0) /
            analytics.length
          ).toFixed(2)
        )
      : 0;
  const activeOperators = analytics.filter((a) => a.status === "online").length;

  return {
    totalChartsCompleted: totalCharts,
    averageChartsPerMinute: avgCPM,
    activeOperatorsCount: activeOperators,
    totalEmployeesCount: allEmps.length,
    recentCompletions: chartCompletions.slice(0, 10),
  };
}
