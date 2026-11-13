import { NextRequest, NextResponse } from "next/server";
import { verifyManagerSession } from "@/lib/manager-auth";
import { getAllPracticeImages, addPracticeImage } from "@/lib/practice-pool";
import { uploadPracticeImageToSupabase } from "@/lib/supabase";
import { sanitizeFilename } from "@/lib/security";

export async function GET(req: NextRequest) {
  const isAuth = verifyManagerSession(req);
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized manager session." }, { status: 401 });
  }

  try {
    const images = await getAllPracticeImages();
    return NextResponse.json({ success: true, images });
  } catch (err) {
    console.error("Manager fetch images error:", err);
    return NextResponse.json({ error: "Failed to retrieve practice images." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const isAuth = verifyManagerSession(req);
  if (!isAuth) {
    return NextResponse.json({ error: "Unauthorized manager session." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const rawFileName = body.fileName || `Practice_Doc_${Date.now()}.jpg`;
    const fileName = sanitizeFilename(rawFileName);
    const imageDataUrl = body.imageDataUrl || "";
    const groundTruth = body.groundTruth || {};
    const fileSize = body.fileSize || "150 KB";

    if (!imageDataUrl) {
      return NextResponse.json({ error: "Image data is required." }, { status: 400 });
    }

    // Upload to Supabase Storage if configured, or use data URL
    const storedUrl = await uploadPracticeImageToSupabase(imageDataUrl, fileName);

    const newImage = await addPracticeImage(fileName, storedUrl, groundTruth, fileSize);

    return NextResponse.json({ success: true, image: newImage });
  } catch (err) {
    console.error("Manager upload image error:", err);
    return NextResponse.json({ error: "Failed to dump practice image." }, { status: 500 });
  }
}
