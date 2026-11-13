import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session-token";
import { getCandidateQASummary } from "@/lib/practice-pool";

export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get("auth_session");
    if (!cookie || !cookie.value) {
      return NextResponse.json({ error: "Unauthorized session." }, { status: 401 });
    }

    const { valid, payload } = await verifySessionToken(cookie.value);
    if (!valid || !payload) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const summary = await getCandidateQASummary(payload.userId);
    return NextResponse.json({ success: true, summary });
  } catch (err) {
    console.error("QA summary error:", err);
    return NextResponse.json({ error: "Failed to load QA summary." }, { status: 500 });
  }
}

