import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session-token";
import { getCandidateImageFolders, getCandidateQASummary } from "@/lib/practice-pool";

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

    const folders = await getCandidateImageFolders(payload.userId);
    const qaSummary = await getCandidateQASummary(payload.userId);

    return NextResponse.json({
      success: true,
      pending: folders.pending,
      completed: folders.completed,
      qaSummary,
    });
  } catch (err) {
    console.error("Fetch images error:", err);
    return NextResponse.json({ error: "Failed to load practice images." }, { status: 500 });
  }
}

