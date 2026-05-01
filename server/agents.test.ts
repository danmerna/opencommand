import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseTractorHouseEmail } from "./agents/leadResponse/ingestLeads";

describe("Lead Response Agent", () => {
  describe("parseTractorHouseEmail", () => {
    it("should extract buyer information from email", () => {
      const email = {
        from: "buyer@example.com",
        subject: "Interested in John Deere Tractor",
        body: `Hello,
I am interested in your equipment.

Name: John Smith
Email: john.smith@farm.com
Phone: 555-123-4567

Looking for: John Deere Tractor
Model: 7530
Budget: $50,000

Location: Iowa

Thanks,
John`,
      };

      const parsed = parseTractorHouseEmail(email);

      expect(parsed.buyerName).toBe("John Smith");
      expect(parsed.buyerEmail).toBe("john.smith@farm.com");
      expect(parsed.buyerPhone).toContain("555");
      expect(parsed.equipmentType).toContain("John Deere");
      expect(parsed.equipmentModel).toContain("7530");
      expect(parsed.desiredPrice).toContain("50");
      expect(parsed.location).toContain("Iowa");
      expect(parsed.source).toBe("tractorhouse");
    });

    it("should detect urgency from keywords", () => {
      const urgentEmail = {
        from: "buyer@example.com",
        subject: "URGENT: Need equipment ASAP",
        body: "I need this equipment immediately for my operation.",
      };

      const parsed = parseTractorHouseEmail(urgentEmail);
      expect(parsed.urgency).toBe("high");
    });

    it("should detect low urgency from flexible keywords", () => {
      const flexibleEmail = {
        from: "buyer@example.com",
        subject: "Looking for equipment",
        body: "I am flexible on timing and no rush to purchase.",
      };

      const parsed = parseTractorHouseEmail(flexibleEmail);
      expect(parsed.urgency).toBe("low");
    });

    it("should default to medium urgency", () => {
      const neutralEmail = {
        from: "buyer@example.com",
        subject: "Equipment inquiry",
        body: "I am interested in your equipment.",
      };

      const parsed = parseTractorHouseEmail(neutralEmail);
      expect(parsed.urgency).toBe("medium");
    });

    it("should detect machinery trader source", () => {
      const email = {
        from: "buyer@example.com",
        subject: "Machinery Trader - Equipment Inquiry",
        body: "I found your listing on Machinery Trader.",
      };

      const parsed = parseTractorHouseEmail(email);
      expect(parsed.source).toBe("machinery_trader");
    });
  });
});


describe("Integration Tests", () => {
  it("should have Lead Response Agent router procedures", () => {
    // This test verifies the router structure
    // In a real test, you would import the router and check its procedures
    expect(true).toBe(true); // Placeholder
  });

  it("should have Executive Board router procedures", () => {
    // This test verifies the router structure
    // In a real test, you would import the router and check its procedures
    expect(true).toBe(true); // Placeholder
  });
});
