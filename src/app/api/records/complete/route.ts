import { NextRequest, NextResponse } from "next/server";
import { recordChartCompletion, getEmployees } from "@/lib/telemetry";
import { sanitizeInput } from "@/lib/security";
import { verifySessionToken } from "@/lib/session-token";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate operator from session cookie
    const cookie = req.cookies.get("auth_session");
    if (!cookie || !cookie.value) {
      return NextResponse.json({ error: "Unauthorized session." }, { status: 401 });
    }

    const { valid, payload } = await verifySessionToken(cookie.value);
    if (!valid || !payload) {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    const emps = await getEmployees();
    const matched = emps.find((e) => e.id === payload.userId);
    if (!matched || matched.status !== "active") {
      return NextResponse.json({ error: "Employee account inactive or not found." }, { status: 403 });
    }

    const body = await req.json();

    const recordNo = sanitizeInput(body.recordNo || "1797", 50);
    const imageName = sanitizeInput(body.imageName || "Document.jpg", 100);
    const durationSeconds = Math.max(1, Number(body.durationSeconds) || 30);

    const record = await recordChartCompletion(
      matched.id,
      matched.name,
      recordNo,
      imageName,
      durationSeconds
    );

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (err) {
    console.error("Error recording chart completion:", err);
    return NextResponse.json(
      { error: "Failed to record chart completion." },
      { status: 500 }
    );
  }
}
