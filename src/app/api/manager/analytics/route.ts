import { NextRequest, NextResponse } from "next/server";
import { verifyManagerSession } from "@/lib/manager-auth";
import {
  getOperatorAnalytics,
  getOverallMetrics,
  getAuditLogs,
} from "@/lib/telemetry";

export async function GET(req: NextRequest) {
  // Enforce session authorization
  const isAuthenticated = verifyManagerSession(req);
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized access: Valid manager session required." },
      { status: 401 }
    );
  }

  try {
    const operators = await getOperatorAnalytics();
    const overview = await getOverallMetrics();
    const auditLogs = await getAuditLogs();

    return NextResponse.json({
      success: true,
      data: {
        overview,
        operators,
        auditLogs,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to retrieve management analytics." },
      { status: 500 }
    );
  }
}

