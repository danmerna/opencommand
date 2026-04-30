import { describe, it, expect } from "vitest";
import {
  BOARD_MEMBERS,
  getBoardCascade,
  getSigmaPerspective,
} from "./agents/executiveBoard/boardThinking";

describe("Σ as 5th Executive in Temporal Cascade", () => {
  describe("BOARD_MEMBERS registry", () => {
    it("should include all 6 members: ceo, cfo, cmo, cto, briefing, sigma", () => {
      const keys = Object.keys(BOARD_MEMBERS);
      expect(keys).toContain("ceo");
      expect(keys).toContain("cfo");
      expect(keys).toContain("cmo");
      expect(keys).toContain("cto");
      expect(keys).toContain("briefing");
      expect(keys).toContain("sigma");
      expect(keys.length).toBe(6);
    });

    it("should use correct codenames (ARCH, LEDGER, SIGNAL, FORGE, YOU, SIGMA)", () => {
      expect(BOARD_MEMBERS.ceo.codename).toBe("ARCH");
      expect(BOARD_MEMBERS.cfo.codename).toBe("LEDGER");
      expect(BOARD_MEMBERS.cmo.codename).toBe("SIGNAL");
      expect(BOARD_MEMBERS.cto.codename).toBe("FORGE");
      expect(BOARD_MEMBERS.briefing.codename).toBe("YOU");
      expect(BOARD_MEMBERS.sigma.codename).toBe("SIGMA");
    });

    it("should have correct time horizons in cascade order", () => {
      expect(BOARD_MEMBERS.ceo.timeHorizon).toBe("5-year");
      expect(BOARD_MEMBERS.cfo.timeHorizon).toBe("4-month");
      expect(BOARD_MEMBERS.cmo.timeHorizon).toBe("3-week");
      expect(BOARD_MEMBERS.cto.timeHorizon).toBe("2-day");
      expect(BOARD_MEMBERS.briefing.timeHorizon).toBe("now");
      expect(BOARD_MEMBERS.sigma.timeHorizon).toBe("sigma");
    });

    it("Σ should focus on highest-leverage move synthesis", () => {
      expect(BOARD_MEMBERS.sigma.focus).toContain("Highest-Leverage");
      expect(BOARD_MEMBERS.sigma.focus).toContain("synthesize");
    });

    it("Σ should have the correct color (#00D4AA)", () => {
      expect(BOARD_MEMBERS.sigma.color).toBe("#00D4AA");
    });

    it("Σ role should be 'sigma'", () => {
      expect(BOARD_MEMBERS.sigma.role).toBe("sigma");
      expect(BOARD_MEMBERS.sigma.name).toBe("Σ");
    });
  });

  describe("Cascade order validation", () => {
    it("should follow 5-4-3-2-1-Σ order", () => {
      const cascadeOrder = ["ceo", "cfo", "cmo", "cto", "briefing", "sigma"];
      const timeHorizons = cascadeOrder.map(
        (key) => BOARD_MEMBERS[key].timeHorizon
      );
      expect(timeHorizons).toEqual([
        "5-year",
        "4-month",
        "3-week",
        "2-day",
        "now",
        "sigma",
      ]);
    });

    it("each member should have unique codename", () => {
      const codenames = Object.values(BOARD_MEMBERS).map((m) => m.codename);
      const uniqueCodenames = new Set(codenames);
      expect(uniqueCodenames.size).toBe(codenames.length);
    });

    it("each member should have unique color", () => {
      const colors = Object.values(BOARD_MEMBERS).map((m) => m.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(colors.length);
    });
  });

  describe("SigmaThought extended fields", () => {
    it("getSigmaPerspective function should exist and accept priorThoughts", () => {
      expect(typeof getSigmaPerspective).toBe("function");
      // getSigmaPerspective requires (question, priorThoughts[])
      expect(getSigmaPerspective.length).toBe(2);
    });

    it("getBoardCascade function should exist", () => {
      expect(typeof getBoardCascade).toBe("function");
      // getBoardCascade requires (question)
      expect(getBoardCascade.length).toBe(1);
    });
  });
});
