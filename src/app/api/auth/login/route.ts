import { NextRequest, NextResponse } from "next/server";
import {
  extractClientIp,
  extractGeoLocation,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  logLoginEvent,
  verifyEmployeeLogin,
} from "@/lib/telemetry";
import { sanitizeInput } from "@/lib/security";
import { uploadAuditPhotoToSupabase } from "@/lib/supabase";
import { DeviceTelemetry, LocationTelemetry } from "@/types/auth";

export async function POST(req: NextRequest) {
  try {
    const clientIp = extractClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Device";

    // 1. Rate Limiting / Brute-force protection
    const rateCheck = checkRateLimit(`login:${clientIp}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. IP temporarily locked. Please retry in ${rateCheck.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawUsername = body.username || "";
    const rawPassword = body.password || "";
    const photoDataUrl = body.photoDataUrl || "";
    const clientDevice: Partial<DeviceTelemetry> = body.device || {};
    const clientLocation: Partial<LocationTelemetry> = body.location || {};

    const username = sanitizeInput(rawUsername, 50).trim().toLowerCase();

    // 2. Identity Verification (Mandatory Camera Photo)
    if (!photoDataUrl || !photoDataUrl.startsWith("data:image/")) {
      await logLoginEvent({
        userId: "unknown",
        username: username || "unspecified",
        timestamp: new Date().toISOString(),
        ipAddress: clientIp,
        userAgent,
        photoDataUrl: "",
        status: "failed",
        failureReason: "Webcam verification photo missing or invalid",
      });

      return NextResponse.json(
        {
          error:
            "Identity verification required: Camera photo must be captured to log in.",
        },
        { status: 400 }
      );
    }

    // 3. User verification against employee database
    const authResult = await verifyEmployeeLogin(username, rawPassword);

    if (!authResult.valid || !authResult.employee) {
      recordFailedAttempt(`login:${clientIp}`);
      await logLoginEvent({
        userId: "unknown",
        username,
        timestamp: new Date().toISOString(),
        ipAddress: clientIp,
        userAgent,
        photoDataUrl,
        status: "failed",
        failureReason: authResult.reason || "Invalid username or password",
      });

      return NextResponse.json(
        { error: authResult.reason || "Invalid credentials. Please check Operator ID and password." },
        { status: 401 }
      );
    }

    const matched = authResult.employee;

    // 4. Success: Reset rate limits
    resetFailedAttempts(`login:${clientIp}`);

    // Upload photo to Supabase storage if available
    const storedPhotoUrl = await uploadAuditPhotoToSupabase(
      photoDataUrl,
      `${matched.username}_${Date.now()}`
    );

    // Derive server & client location
    const serverGeo = extractGeoLocation(req, clientIp);
    const mergedLocation: LocationTelemetry = {
      city: clientLocation.city || serverGeo.city,
      region: clientLocation.region || serverGeo.region,
      country: clientLocation.country || serverGeo.country,
      latitude: clientLocation.latitude || serverGeo.latitude,
      longitude: clientLocation.longitude || serverGeo.longitude,
      source: clientLocation.latitude ? "browser_gps" : serverGeo.source,
    };

    // Build complete device telemetry
    const completeDevice: DeviceTelemetry = {
      os: clientDevice.os || "Unknown OS",
      browser: clientDevice.browser || "Unknown Browser",
      screenResolution: clientDevice.screenResolution || "Unknown Resolution",
      deviceMemory: clientDevice.deviceMemory,
      hardwareConcurrency: clientDevice.hardwareConcurrency,
      timezone: clientDevice.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: clientDevice.language || "en",
      platform: clientDevice.platform || "Web",
      userAgent,
    };

    // Log complete audit entry
    const auditEntry = await logLoginEvent({
      userId: matched.id,
      username: matched.username,
      timestamp: new Date().toISOString(),
      ipAddress: clientIp,
      location: mergedLocation,
      device: completeDevice,
      photoDataUrl: storedPhotoUrl,
      status: "success",
    });

    // 5. Issue session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: matched.id,
        username: matched.username,
        name: matched.name,
        role: "operator",
      },
      auditId: auditEntry.id,
      loginTimestamp: auditEntry.timestamp,
      clientIp,
    });

    response.cookies.set("auth_session", `${matched.id}:${Date.now()}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60, // 8-hour shift
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Authentication error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during authentication." },
      { status: 500 }
    );
  }
}
