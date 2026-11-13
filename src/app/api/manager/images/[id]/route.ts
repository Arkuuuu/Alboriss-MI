import { NextRequest, NextResponse } from "next/server";
import { verifyManagerSession } from "@/lib/manager-auth";
import { deletePracticeImage } from "@/lib/practice-pool";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = verifyManagerSession(req);
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized manager session." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const success = await deletePracticeImage(id);
    return NextResponse.json({ success });
  } catch (err) {
    console.error("Manager delete image error:", err);
    return NextResponse.json({ error: "Failed to delete practice image." }, { status: 500 });
  }
}

