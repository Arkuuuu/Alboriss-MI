import { NextRequest, NextResponse } from "next/server";
import { getEmployees } from "@/lib/telemetry";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("auth_session");
  if (!cookie || !cookie.value) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const [userId] = cookie.value.split(":");
    const emps = await getEmployees();
    const matched = emps.find((e) => e.id === userId);

    if (!matched || matched.status !== "active") {
      return NextResponse.json({ authenticated: false });
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
    return NextResponse.json({ authenticated: false });
  }
}

