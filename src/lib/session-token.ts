/**
 * Universal Cryptographic Session Token Signer & Verifier
 * Compatible with both Edge Runtime (middleware) and Node.js (API routes).
 */

const SECRET_KEY =
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  "alboriss-mi-production-secret-token-key-2026-secure";

export interface SessionPayload {
  userId: string;
  username: string;
  role: "operator" | "manager";
  issuedAt: number;
  nonce: string;
}

/**
 * Derives HMAC-SHA256 key from secret string using Web Crypto
 */
async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Signs an employee or user session into a tamper-proof signed string.
 */
export async function signSessionToken(
  userId: string,
  username: string,
  role: "operator" | "manager" = "operator",
  maxAgeSeconds: number = 8 * 60 * 60 // 8 hours
): Promise<string> {
  const issuedAt = Date.now();
  const nonce = Math.random().toString(36).substring(2, 10);
  const data = `${userId}:${username}:${role}:${issuedAt}:${maxAgeSeconds}:${nonce}`;

  const key = await getCryptoKey();
  const enc = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const signatureHex = arrayBufferToHex(signatureBuffer);

  const payload = Buffer.from(data).toString("base64url");
  return `${payload}.${signatureHex}`;
}

/**
 * Verifies the tamper-proof signature and expiration of a session token.
 */
export async function verifySessionToken(
  token: string
): Promise<{ valid: boolean; payload?: SessionPayload }> {
  if (!token || typeof token !== "string") {
    return { valid: false };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false };
  }

  const [payloadB64, signatureHex] = parts;

  try {
    const rawData = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const fields = rawData.split(":");
    if (fields.length !== 6) {
      return { valid: false };
    }

    const [userId, username, role, issuedAtStr, maxAgeStr, nonce] = fields;
    const issuedAt = parseInt(issuedAtStr, 10);
    const maxAgeSeconds = parseInt(maxAgeStr, 10);

    if (isNaN(issuedAt) || isNaN(maxAgeSeconds)) {
      return { valid: false };
    }

    // Expiration check
    const now = Date.now();
    if (now - issuedAt > maxAgeSeconds * 1000) {
      return { valid: false }; // Expired
    }

    // Cryptographic signature check via HMAC recomputation
    const key = await getCryptoKey();
    const enc = new TextEncoder();
    const recomputedSigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(rawData));
    const recomputedHex = arrayBufferToHex(recomputedSigBuffer);

    if (signatureHex.length !== recomputedHex.length) {
      return { valid: false };
    }

    // Constant-time XOR comparison
    let mismatch = 0;
    for (let i = 0; i < signatureHex.length; i++) {
      mismatch |= signatureHex.charCodeAt(i) ^ recomputedHex.charCodeAt(i);
    }

    if (mismatch !== 0) {
      return { valid: false };
    }

    return {
      valid: true,
      payload: {
        userId,
        username,
        role: role as "operator" | "manager",
        issuedAt,
        nonce,
      },
    };
  } catch {
    return { valid: false };
  }
}
