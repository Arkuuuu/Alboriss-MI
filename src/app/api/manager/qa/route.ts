import { NextRequest, NextResponse } from "next/server";
import { verifyManagerSession } from "@/lib/manager-auth";
import { getAllCandidatesQASummary } from "@/lib/practice-pool";
import { getEmployees } from "@/lib/telemetry";

export async function GET(req: NextRequest) {
  const isAuth = verifyManagerSession(req);
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized manager session." }, { status: 401 });
  }

  try {
    const qaList = await getAllCandidatesQASummary();
    const employees = await getEmployees();

    const empMap = new Map(employees.map((e) => [e.id, e]));

    const enrichedList = qaList.map((item) => {
      const emp = empMap.get(item.operatorId);
      return {
        ...item,
        operatorName: emp ? emp.name : item.operatorId,
        username: emp ? emp.username : item.operatorId,
      };
    });

    return NextResponse.json({ success: true, qaLeaderboard: enrichedList });
  } catch (err) {
    console.error("Manager fetch QA error:", err);
    return NextResponse.json({ error: "Failed to load QA leaderboard." }, { status: 500 });
  }
}

