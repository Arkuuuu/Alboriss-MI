import { NextRequest, NextResponse } from "next/server";
import {
  extractClientIp,
  extractGeoLocation,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  logLoginEvent,
  verifyEmployeeLogin,
  updateEmployeeBiometrics,
} from "@/lib/telemetry";
import { sanitizeInput } from "@/lib/security";
import { uploadAuditPhotoToSupabase } from "@/lib/supabase";
import {
  DeviceTelemetry,
  LocationTelemetry,
  NetworkTelemetry,
  FaceVerificationTelemetry,
} from "@/types/auth";
import { signSessionToken } from "@/lib/session-token";
import { FaceLivenessEngine } from "@/lib/face-liveness";

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
    const clientNetwork: Partial<NetworkTelemetry> = body.network || {};
    const faceVerification: Partial<FaceVerificationTelemetry> = body.faceVerification || {};

    const username = sanitizeInput(rawUsername, 50).trim().toLowerCase();

    // 2. Mandatory Permission Enforcement: High-Accuracy Location Check
    if (
      clientLocation.latitude === undefined ||
      clientLocation.longitude === undefined ||
      isNaN(Number(clientLocation.latitude)) ||
      isNaN(Number(clientLocation.longitude))
    ) {
      await logLoginEvent({
        userId: "unknown",
        username: username || "unspecified",
        timestamp: new Date().toISOString(),
        ipAddress: clientIp,
        userAgent,
        photoDataUrl: photoDataUrl || "",
        status: "failed",
        failureReason: "Mandatory GPS Location permission denied or missing",
      });

      return NextResponse.json(
        {
          error:
            "Mandatory Security Policy: Precise GPS Location permission must be granted. Please allow location access in your browser to verify your work location.",
        },
        { status: 403 }
      );
    }

    // 3. Mandatory Face Verification & Anti-Spoofing Checks
    if (!photoDataUrl || !photoDataUrl.startsWith("data:image/") || photoDataUrl.length < 3000) {
      await logLoginEvent({
        userId: "unknown",
        username: username || "unspecified",
        timestamp: new Date().toISOString(),
        ipAddress: clientIp,
        userAgent,
        photoDataUrl: "",
        status: "failed",
        failureReason: "Camera verification photo missing or corrupt",
      });

      return NextResponse.json(
        {
          error:
            "Identity verification required: Camera photo must be captured to log in.",
        },
        { status: 400 }
      );
    }

    // Strictly enforce that a human face was detected
    if (!faceVerification.faceDetected) {
      await logLoginEvent({
        userId: "unknown",
        username: username || "unspecified",
        timestamp: new Date().toISOString(),
        ipAddress: clientIp,
        userAgent,
        photoDataUrl,
        status: "failed",
        failureReason: "No human face detected in camera feed",
      });

      return NextResponse.json(
        {
          error:
            "Biometric Verification Blocked: No human face was detected. You must position your face clearly in front of the camera to log in.",
        },
        { status: 403 }
      );
    }

    // Strictly enforce Anti-Spoofing: Reject static photos or phone screens
    if (faceVerification.isStaticPhoto) {
      await logLoginEvent({
        userId: "unknown",
        username: username || "unspecified",
        timestamp: new Date().toISOString(),
        ipAddress: clientIp,
        userAgent,
        photoDataUrl,
        status: "failed",
        failureReason: "Anti-Spoofing Violation: Static printed photo detected",
      });

      return NextResponse.json(
        {
          error:
            "SECURITY VIOLATION: Static photograph detected. Holding up a printed picture or photo is strictly prohibited. Live human presence is required.",
        },
        { status: 403 }
      );
    }

    if (faceVerification.isScreenSpoof) {
      await logLoginEvent({
        userId: "unknown",
        username: username || "unspecified",
        timestamp: new Date().toISOString(),
        ipAddress: clientIp,
        userAgent,
        photoDataUrl,
        status: "failed",
        failureReason: "Anti-Spoofing Violation: Phone screen or digital display detected",
      });

      return NextResponse.json(
        {
          error:
            "SECURITY VIOLATION: Screen display or image reflection detected. You cannot log in using a photo displayed on another device.",
        },
        { status: 403 }
      );
    }

    // Strictly enforce liveness confirmation
    if (!faceVerification.livenessPassed || (faceVerification.livenessScore || 0) < 0.7) {
      await logLoginEvent({
        userId: "unknown",
        username: username || "unspecified",
        timestamp: new Date().toISOString(),
        ipAddress: clientIp,
        userAgent,
        photoDataUrl,
        status: "failed",
        failureReason: `Liveness test failed (score: ${faceVerification.livenessScore || 0})`,
      });

      return NextResponse.json(
        {
          error:
            "Biometric Liveness Incomplete: Please blink your eyes naturally or follow on-screen camera instructions to confirm live biological presence.",
        },
        { status: 403 }
      );
    }

    // 4. User verification against employee database
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

    // 5. Biometric Identity Matching (Prevent logging in using picture/presence of someone else)
    const currentSignature = faceVerification.biometricSignature;

    if (matched.enrolledBiometricHash && currentSignature) {
      const matchResult = FaceLivenessEngine.compareBiometrics(
        matched.enrolledBiometricHash,
        currentSignature
      );

      if (!matchResult.isMatch) {
        recordFailedAttempt(`login:${clientIp}`);
        await logLoginEvent({
          userId: matched.id,
          username: matched.username,
          timestamp: new Date().toISOString(),
          ipAddress: clientIp,
          userAgent,
          photoDataUrl,
          status: "failed",
          failureReason: `Identity mismatch: Face does not match registered employee portrait (Similarity: ${(
            matchResult.similarity * 100
          ).toFixed(1)}%)`,
        });

        return NextResponse.json(
          {
            error: `Biometric Identity Mismatch: The detected face does not match the registered operator profile for '${matched.username}'. Showing photos of others or unauthorized access is forbidden.`,
          },
          { status: 403 }
        );
      }
    }

    // 6. Success: Reset rate limits
    resetFailedAttempts(`login:${clientIp}`);

    // Upload photo to Supabase storage if available
    const storedPhotoUrl = await uploadAuditPhotoToSupabase(
      photoDataUrl,
      `${matched.username}_${Date.now()}`
    );

    // If employee does not have an enrolled biometric baseline yet, enroll this verified face
    if (!matched.enrolledBiometricHash && currentSignature) {
      await updateEmployeeBiometrics(matched.id, storedPhotoUrl, currentSignature);
    }

    // Derive server & client location
    const serverGeo = extractGeoLocation(req, clientIp);
    const mergedLocation: LocationTelemetry = {
      city: clientLocation.city || serverGeo.city,
      region: clientLocation.region || serverGeo.region,
      country: clientLocation.country || serverGeo.country,
      latitude: clientLocation.latitude,
      longitude: clientLocation.longitude,
      accuracy: clientLocation.accuracy,
      altitude: clientLocation.altitude,
      speed: clientLocation.speed,
      source: "browser_gps",
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

    // Complete network telemetry
    const completeNetwork: NetworkTelemetry = {
      effectiveType: clientNetwork.effectiveType || "4g",
      downlinkMbps: clientNetwork.downlinkMbps,
      rttMs: clientNetwork.rttMs,
      connectionType: clientNetwork.connectionType || "wifi",
      saveData: clientNetwork.saveData,
      localIp: clientNetwork.localIp,
      publicIp: clientIp,
      networkOnline: clientNetwork.networkOnline !== undefined ? clientNetwork.networkOnline : true,
    };

    const completeFaceVerification: FaceVerificationTelemetry = {
      faceDetected: true,
      livenessPassed: true,
      livenessScore: faceVerification.livenessScore || 0.95,
      isStaticPhoto: false,
      isScreenSpoof: false,
      blinkDetected: !!faceVerification.blinkDetected,
      motionVariance: faceVerification.motionVariance || 2.4,
      biometricSignature: currentSignature,
      timestamp: new Date().toISOString(),
    };

    // Log complete audit entry with all telemetry and face verification
    const auditEntry = await logLoginEvent({
      userId: matched.id,
      username: matched.username,
      timestamp: new Date().toISOString(),
      ipAddress: clientIp,
      location: mergedLocation,
      device: completeDevice,
      network: completeNetwork,
      faceVerification: completeFaceVerification,
      photoDataUrl: storedPhotoUrl,
      status: "success",
    });

    // 7. Issue secure HTTP-only session cookie
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

    const sessionToken = await signSessionToken(
      matched.id,
      matched.username,
      "operator",
      8 * 60 * 60
    );

    response.cookies.set("auth_session", sessionToken, {
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
