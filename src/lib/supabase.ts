import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Check if Supabase is configured via environment variables
export const isSupabaseConfigured = Boolean(
  supabaseUrl && (supabaseAnonKey || supabaseServiceKey)
);

// Public / Browser client
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey, {
      auth: { persistSession: false },
    })
  : null;

// Server / Admin client (using service role key if available for bypassing RLS in server routes)
export const supabaseAdmin: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;

/**
 * Uploads a base64 webcam photo to Supabase Storage bucket ('audit-photos').
 * Returns the public or signed URL, or falls back to base64 data URL if storage is unconfigured.
 */
export async function uploadAuditPhotoToSupabase(
  photoDataUrl: string,
  filename: string
): Promise<string> {
  if (!supabaseAdmin || !photoDataUrl.startsWith("data:image/")) {
    return photoDataUrl; // Return raw data URL as fallback
  }

  try {
    // Extract base64 payload and MIME type
    const matches = photoDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches) return photoDataUrl;

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    const filePath = `logins/${Date.now()}_${filename}.jpg`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("audit-photos")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase storage upload warning:", uploadError.message);
      return photoDataUrl; // Fallback to inline data URL
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("audit-photos")
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || photoDataUrl;
  } catch (err) {
    console.error("Failed to upload photo to Supabase storage:", err);
    return photoDataUrl;
  }
}

/**
 * Uploads practice chart images dumped by Manager to Supabase Storage bucket ('practice-images').
 */
export async function uploadPracticeImageToSupabase(
  imageDataUrl: string,
  filename: string
): Promise<string> {
  if (!supabaseAdmin || !imageDataUrl.startsWith("data:image/")) {
    return imageDataUrl; // Return raw data URL as fallback
  }

  try {
    const matches = imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!matches) return imageDataUrl;

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `pool/${Date.now()}_${cleanName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("practice-images")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase storage upload warning for practice image:", uploadError.message);
      return imageDataUrl;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("practice-images")
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || imageDataUrl;
  } catch (err) {
    console.error("Failed to upload practice image to Supabase storage:", err);
    return imageDataUrl;
  }
}


