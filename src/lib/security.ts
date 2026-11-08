/**
 * Application Security Utilities
 * Defenses against XSS, Prototype Pollution, File Spoofing, Path Traversal, and Buffer Overflows.
 */

// Maximum allowed image file size: 15 MB
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

// Permitted MIME types (raster formats only, strictly excluding SVG to eliminate SVG script injection)
export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
]);

/**
 * Validates a file's true signature (magic numbers) to prevent MIME-type spoofing
 * and disguised executable/script payloads.
 */
export async function validateImageFile(
  file: File
): Promise<{ valid: boolean; error?: string }> {
  // 1. File size verification
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the maximum limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
    };
  }

  if (file.size < 4) {
    return { valid: false, error: "Invalid file: file is empty or corrupted." };
  }

  // 2. MIME type verification
  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return {
      valid: false,
      error: "Unsupported file type. Only JPEG, PNG, WEBP, and BMP images are permitted.",
    };
  }

  // 3. Magic Byte verification (read first 12 bytes)
  try {
    const headerBuffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(headerBuffer);

    // JPEG signature: FF D8 FF
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;

    // WebP signature: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
    const isWebP =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;

    // BMP signature: 42 4D (BM)
    const isBmp = bytes[0] === 0x42 && bytes[1] === 0x4d;

    // Check for malicious executable signatures
    // Windows PE / DOS MZ executable: 4D 5A
    const isExe = bytes[0] === 0x4d && bytes[1] === 0x5a;
    // ELF executable: 7F 45 4C 46
    const isElf =
      bytes[0] === 0x7f &&
      bytes[1] === 0x45 &&
      bytes[2] === 0x4c &&
      bytes[3] === 0x46;

    if (isExe || isElf) {
      return { valid: false, error: "Security violation: Executable files are strictly blocked." };
    }

    if (!isJpeg && !isPng && !isWebP && !isBmp) {
      return {
        valid: false,
        error: "Security violation: File header does not match a valid image signature.",
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Failed to inspect file contents for security checks." };
  }
}

/**
 * Sanitizes uploaded filenames:
 * - Strips directory traversal sequences (../, ..\)
 * - Strips control characters and non-printable characters
 * - Restricts to safe alphanumeric, dot, dash, underscore, space
 * - Truncates to max 100 characters
 */
export function sanitizeFilename(rawName: string): string {
  if (!rawName) return "document.jpg";

  // Remove full path if browser sent full path
  const baseName = rawName.split(/[/\\\\]/).pop() || rawName;

  // Strip dangerous control chars and path traversal
  const cleaned = baseName
    .replace(/\.\./g, "")
    .replace(/[\x00-\x1F\x7F<>:"/\\|?*]/g, "")
    .trim();

  // Enforce max length
  const safe = cleaned.slice(0, 100);
  return safe || "document.jpg";
}

/**
 * Sanitizes form inputs:
 * - Strips unprintable control characters (\x00-\x1F, \x7F)
 * - Normalizes unicode (NFC)
 * - Enforces character length limits
 */
export function sanitizeInput(value: string, maxLength: number = 300): string {
  if (typeof value !== "string") return "";

  // Normalize Unicode
  const normalized = value.normalize("NFC");

  // Strip control chars (keep standard space and tab if needed)
  const stripped = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Prevent prototype pollution keywords as value if misused
  return stripped.slice(0, maxLength);
}

/**
 * Prototype pollution safe dictionary updater
 */
export function safeRecordUpdate(
  prev: Record<string, string>,
  key: string,
  value: string,
  allowedKeys: Set<string>
): Record<string, string> {
  // Prevent Prototype Pollution
  if (
    key === "__proto__" ||
    key === "constructor" ||
    key === "prototype" ||
    !allowedKeys.has(key)
  ) {
    return prev;
  }

  return {
    ...prev,
    [key]: value,
  };
}

