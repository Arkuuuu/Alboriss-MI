import { NextRequest, NextResponse } from "next/server";
import { verifyManagerSession } from "@/lib/manager-auth";
import { getEmployees, createEmployee } from "@/lib/telemetry";
import { sanitizeInput } from "@/lib/security";

export async function GET(req: NextRequest) {
  if (!verifyManagerSession(req)) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const emps = await getEmployees();
  return NextResponse.json({ success: true, employees: emps });
}

export async function POST(req: NextRequest) {
  if (!verifyManagerSession(req)) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rawName = body.name || "";
    const rawUsername = body.username || "";
    const rawPassword = body.password || "";

    const name = sanitizeInput(rawName, 100);
    const username = sanitizeInput(rawUsername, 50).trim().toLowerCase();
    const password = String(rawPassword).trim();

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Employee full name is required (min 2 characters)." },
        { status: 400 }
      );
    }

    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const result = await createEmployee(name, username, password);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Employee account created successfully.",
      employee: result.employee,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to create employee account." },
      { status: 500 }
    );
  }
}

