import { NextRequest, NextResponse } from "next/server";
import {
  extractClientIp,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  logLoginEvent,
} from "@/lib/telemetry";
import {
  verifyManagerCredentials,
  createManagerToken,
} from "@/lib/manager-auth";
import { sanitizeInput } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const clientIp = extractClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown Device";

    // 1. Rate limiting & brute-force defense
    const rateCheck = checkRateLimit(`manager:${clientIp}`);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed manager login attempts. Access temporarily locked. Please retry in ${rateCheck.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawUsername = sanitizeInput(body.username || "", 50);
    const rawPassword = body.password || "";

    // 2. Constant-time credential verification
    const isValid = verifyManagerCredentials(rawUsername, rawPassword);

    if (!isValid) {
      recordFailedAttempt(`manager:${clientIp}`);
      logLoginEvent({
        userId: "unknown",
        username: rawUsername || "manager_probe",
        timestamp: new Date().toISOString(),
        ipAddress: clientIp,
        userAgent,
        photoDataUrl: "",
        status: "failed",
        failureReason: "Manager authentication failed: invalid credentials",
      });

      return NextResponse.json(
        { error: "Access denied. Invalid credentials or unauthorized account." },
        { status: 401 }
      );
    }

    // 3. Reset rate limits on success
    resetFailedAttempts(`manager:${clientIp}`);

    // 4. Log successful manager login
    logLoginEvent({
      userId: "usr-manager",
      username: rawUsername,
      timestamp: new Date().toISOString(),
      ipAddress: clientIp,
      userAgent,
      photoDataUrl: "",
      status: "success",
    });

    // 5. Create secure signed token and set HttpOnly cookie
    const token = createManagerToken();
    const response = NextResponse.json({
      success: true,
      message: "Manager authenticated successfully.",
    });

    response.cookies.set("manager_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred during manager authentication." },
      { status: 500 }
    );
  }
}

