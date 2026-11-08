import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.delete("auth_session");
  return response;
}

export async function GET() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.delete("auth_session");
  return response;
}
