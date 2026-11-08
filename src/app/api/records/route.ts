import { NextRequest, NextResponse } from "next/server";
import { getEmployees, recordChartCompletion } from "@/lib/telemetry";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { sanitizeInput } from "@/lib/security";
import { verifySessionToken } from "@/lib/session-token";

interface SavedRecord {
  id: string;
  operatorId: string;
  operatorName: string;
  recordNo: string;
  imageName: string;
  customerName: string;
  totalAmount: string;
  formData: Record<string, string>;
  createdAt: string;
}

// In-memory fallback
const inMemoryRecords: SavedRecord[] = [];

export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get("auth_session");
    if (!cookie || !cookie.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { valid, payload } = await verifySessionToken(cookie.value);
    if (!valid || !payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from("medical_records")
          .select("*")
          .eq("operator_id", payload.userId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (!error && data) {
          return NextResponse.json({
            records: data.map((d) => ({
              id: d.id,
              operatorId: d.operator_id,
              operatorName: d.operator_name,
              recordNo: d.record_no,
              imageName: d.image_name,
              customerName: d.customer_name,
              totalAmount: d.total_amount,
              formData: d.form_data,
              createdAt: d.created_at,
            })),
          });
        }
      } catch (e) {
        console.warn("Supabase fetch records fallback:", e);
      }
    }

    // Filter memory records for this operator
    const operatorRecords = inMemoryRecords.filter(
      (r) => r.operatorId === payload.userId
    );
    return NextResponse.json({ records: operatorRecords });
  } catch {
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookie = req.cookies.get("auth_session");
    if (!cookie || !cookie.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { valid, payload } = await verifySessionToken(cookie.value);
    if (!valid || !payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const emps = await getEmployees();
    const matched = emps.find((e) => e.id === payload.userId);
    if (!matched || matched.status !== "active") {
      return NextResponse.json({ error: "Inactive employee" }, { status: 403 });
    }

    const body = await req.json();
    const formData = body.formData || {};
    const recordNo = sanitizeInput(formData.recordNo || "1797", 50);
    const imageName = sanitizeInput(formData.imageName || "Document.jpg", 100);
    const customerName = sanitizeInput(formData.customerName || "N/A", 150);
    const totalAmount = sanitizeInput(formData.totalAmount || "$0.00", 50);
    const durationSeconds = Math.max(1, Number(body.durationSeconds) || 30);

    const recordId = `rec-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const newRecord: SavedRecord = {
      id: recordId,
      operatorId: matched.id,
      operatorName: matched.name,
      recordNo,
      imageName,
      customerName,
      totalAmount,
      formData,
      createdAt,
    };

    inMemoryRecords.unshift(newRecord);

    // Save to Supabase if configured
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from("medical_records").insert({
          id: newRecord.id,
          operator_id: newRecord.operatorId,
          operator_name: newRecord.operatorName,
          record_no: newRecord.recordNo,
          image_name: newRecord.imageName,
          customer_name: newRecord.customerName,
          total_amount: newRecord.totalAmount,
          form_data: newRecord.formData,
          created_at: newRecord.createdAt,
        });
      } catch (e) {
        console.warn("Supabase medical record insert warning:", e);
      }
    }

    // Also record productivity throughput (CPM)
    await recordChartCompletion(
      matched.id,
      matched.name,
      recordNo,
      imageName,
      durationSeconds
    );

    return NextResponse.json({ success: true, record: newRecord });
  } catch (err) {
    console.error("Save medical record error:", err);
    return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
  }
}
