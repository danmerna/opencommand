import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";

describe("Nango configuration", () => {
  it("should have NANGO_SECRET_KEY configured", () => {
    expect(ENV.nangoSecretKey).toBeTruthy();
    expect(ENV.nangoSecretKey.length).toBeGreaterThan(10);
  });

  it("should have NANGO_PUBLIC_KEY configured", () => {
    expect(ENV.nangoPublicKey).toBeTruthy();
    expect(ENV.nangoPublicKey.length).toBeGreaterThan(10);
  });

  it("should have valid UUID format for secret key", () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(ENV.nangoSecretKey).toMatch(uuidRegex);
  });

  it("should have valid UUID format for public key", () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(ENV.nangoPublicKey).toMatch(uuidRegex);
  });
});
