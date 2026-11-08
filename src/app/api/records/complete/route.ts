import { NextRequest, NextResponse } from "next/server";
import { recordChartCompletion } from "@/lib/telemetry";
import { sanitizeInput } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const operatorId = sanitizeInput(body.operatorId || "usr-01", 50);
    const operatorName = sanitizeInput(body.operatorName || "Sarah Jenkins", 100);
    const recordNo = sanitizeInput(body.recordNo || "1797", 50);
    const imageName = sanitizeInput(body.imageName || "Document.jpg", 100);
    const durationSeconds = Number(body.durationSeconds) || 30;

    const record = recordChartCompletion(
      operatorId,
      operatorName,
      recordNo,
      imageName,
      durationSeconds
    );

    return NextResponse.json({
      success: true,
      record,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to record chart completion." },
      { status: 500 }
    );
  }
}

