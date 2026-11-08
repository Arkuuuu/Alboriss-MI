import { NextRequest, NextResponse } from "next/server";
import { getEmployees } from "@/lib/telemetry";
import { verifySessionToken } from "@/lib/session-token";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("auth_session");
  if (!cookie || !cookie.value) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const { valid, payload } = await verifySessionToken(cookie.value);
    if (!valid || !payload) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      response.cookies.delete("auth_session");
      return response;
    }

    const emps = await getEmployees();
    const matched = emps.find((e) => e.id === payload.userId);

    if (!matched || matched.status !== "active") {
      const response = NextResponse.json(
        { authenticated: false, reason: "Account inactive or not found" },
        { status: 401 }
      );
      response.cookies.delete("auth_session");
      return response;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: matched.id,
        username: matched.username,
        name: matched.name,
        role: "operator",
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
