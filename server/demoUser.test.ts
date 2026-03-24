import { describe, it, expect } from "vitest";
import { DEMO_EMAIL, DEMO_OPEN_ID, DEMO_NAME } from "./demoUser";

describe("Demo User constants", () => {
  it("should have correct demo email", () => {
    expect(DEMO_EMAIL).toBe("demo@opencommand.co");
  });

  it("should have correct demo open ID", () => {
    expect(DEMO_OPEN_ID).toBe("demo_user_opencommand_2026");
  });

  it("should have Meridian Software in the demo name", () => {
    expect(DEMO_NAME).toContain("Meridian Software");
  });
});
