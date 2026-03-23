import { describe, it, expect } from "vitest";
import { Resend } from "resend";

describe("Resend API key validation", () => {
  it("should successfully connect to Resend and list domains", async () => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    // Use the domains.list endpoint as a lightweight credential check (no email sent)
    const { data, error } = await resend.domains.list();
    expect(error).toBeNull();
    expect(data).toBeDefined();
  }, 15000);
});
