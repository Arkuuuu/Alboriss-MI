import { NextRequest, NextResponse } from "next/server";
import { verifyManagerSession } from "@/lib/manager-auth";
import { toggleEmployeeStatus, deleteEmployee } from "@/lib/telemetry";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyManagerSession(req)) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const { id } = await params;
  const success = await toggleEmployeeStatus(id);

  if (!success) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Status updated." });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyManagerSession(req)) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
  }

  const { id } = await params;
  const success = await deleteEmployee(id);

  if (!success) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Employee deleted." });
}

