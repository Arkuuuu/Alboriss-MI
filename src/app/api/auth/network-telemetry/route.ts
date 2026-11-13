import { NextRequest, NextResponse } from "next/server";
import { extractClientIp, extractGeoLocation } from "@/lib/telemetry";

export async function GET(req: NextRequest) {
  const ip = extractClientIp(req);
  const geo = extractGeoLocation(req, ip);

  return NextResponse.json({
    ip,
    geo,
    timestamp: new Date().toISOString(),
  });
}

