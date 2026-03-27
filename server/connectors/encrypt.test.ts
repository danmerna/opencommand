import { describe, it, expect } from "vitest";
import { encryptConnectorConfig, decryptConnectorConfig, maskApiKey } from "./encrypt";

describe("BYOA_ENCRYPTION_KEY — AES-256-GCM encrypt/decrypt", () => {
  it("should have a valid 64-char hex BYOA_ENCRYPTION_KEY env var", () => {
    const key = process.env.BYOA_ENCRYPTION_KEY ?? "";
    expect(key).toMatch(/^[0-9a-fA-F]{64}$/);
  });

  it("round-trips a simple string", () => {
    const original = '{"apiKey":"sk-test-abc123","model":"gpt-4o"}';
    const encrypted = encryptConnectorConfig(original);
    expect(encrypted).not.toBe(original);
    const decrypted = decryptConnectorConfig(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext each call (random IV)", () => {
    const original = "same-plaintext";
    const a = encryptConnectorConfig(original);
    const b = encryptConnectorConfig(original);
    expect(a).not.toBe(b);
    expect(decryptConnectorConfig(a)).toBe(original);
    expect(decryptConnectorConfig(b)).toBe(original);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptConnectorConfig("sensitive-key");
    const tampered = Buffer.from(encrypted, "base64");
    tampered[30] ^= 0xff; // flip bits in ciphertext region
    expect(() => decryptConnectorConfig(tampered.toString("base64"))).toThrow();
  });

  it("masks an API key correctly", () => {
    expect(maskApiKey("sk-abc123xyz789")).toBe("sk-abc••••••••z789");
    expect(maskApiKey("short")).toBe("••••••••");
  });
});
