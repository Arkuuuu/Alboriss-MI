import crypto from "crypto";
import { NextRequest } from "next/server";

// Server secret for signing manager session cookies
const MANAGER_SECRET = process.env.MANAGER_SECRET || "med-insurance-manager-secret-key-3914a82b";

// Manager credentials (can be overridden via environment variables)
const MANAGER_USERNAME = process.env.MANAGER_USERNAME || "manager";
const MANAGER_PASSWORD_HASH = crypto
  .createHash("sha256")
  .update(process.env.MANAGER_PASSWORD || "manager@secure2026")
  .digest("hex");

/**
 * Verifies credentials using constant-time comparison to prevent timing side-channel attacks.
 */
export function verifyManagerCredentials(user: string, pass: string): boolean {
  if (!user || !pass) return false;

  const inputUserBuffer = Buffer.from(user.trim().toLowerCase());
  const expectedUserBuffer = Buffer.from(MANAGER_USERNAME.toLowerCase());

  if (inputUserBuffer.length !== expectedUserBuffer.length) {
    return false;
  }
  if (!crypto.timingSafeEqual(inputUserBuffer, expectedUserBuffer)) {
    return false;
  }

  const inputPassHash = crypto.createHash("sha256").update(pass).digest("hex");
  const inputHashBuffer = Buffer.from(inputPassHash);
  const expectedHashBuffer = Buffer.from(MANAGER_PASSWORD_HASH);

  if (inputHashBuffer.length !== expectedHashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputHashBuffer, expectedHashBuffer);
}

/**
 * Creates a cryptographically signed session token for the manager.
 */
export function createManagerToken(): string {
  const timestamp = Date.now();
  const randomSalt = crypto.randomBytes(16).toString("hex");
  const payload = `${MANAGER_USERNAME}:${timestamp}:${randomSalt}`;
  const signature = crypto
    .createHmac("sha256", MANAGER_SECRET)
    .update(payload)
    .digest("hex");

  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

/**
 * Verifies the validity and expiration of the manager session cookie.
 */
export function verifyManagerSession(req: NextRequest): boolean {
  const cookie = req.cookies.get("manager_session");
  if (!cookie || !cookie.value) return false;

  try {
    const raw = Buffer.from(cookie.value, "base64url").toString("utf-8");
    const parts = raw.split(":");
    if (parts.length !== 4) return false;

    const [user, timestampStr, randomSalt, signature] = parts;
    if (user !== MANAGER_USERNAME) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    // 8-hour session expiration
    if (Date.now() - timestamp > 8 * 60 * 60 * 1000) {
      return false;
    }

    const payload = `${user}:${timestampStr}:${randomSalt}`;
    const expectedSig = crypto
      .createHmac("sha256", MANAGER_SECRET)
      .update(payload)
      .digest("hex");

    const sigBuffer = Buffer.from(signature);
    const expectedSigBuffer = Buffer.from(expectedSig);

    if (sigBuffer.length !== expectedSigBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedSigBuffer);
  } catch {
    return false;
  }
}

