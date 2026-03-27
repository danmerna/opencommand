import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.BYOA_ENCRYPTION_KEY ?? "";
  if (raw.length !== 64) {
    throw new Error("BYOA_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(raw, "hex");
}

/**
 * Encrypt a plaintext string.
 * Returns a base64-encoded string: iv (12 bytes) + authTag (16 bytes) + ciphertext
 */
export function encryptConnectorConfig(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Layout: [iv (12)] [authTag (16)] [ciphertext (variable)]
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypt a base64-encoded string produced by encryptConnectorConfig.
 * Returns the original plaintext.
 */
export function decryptConnectorConfig(encoded: string): string {
  const key = getKey();
  const combined = Buffer.from(encoded, "base64");
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Mask an API key for safe display in the UI.
 * e.g. "sk-abc123xyz789" → "sk-abc1••••••••"
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 6) + "••••••••" + key.slice(-4);
}
