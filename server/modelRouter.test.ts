import { describe, it, expect } from "vitest";
import {
  MODEL_REGISTRY,
  ROLE_DEFAULTS,
  TASK_CATEGORY_DEFAULTS,
  getModelById,
  getModelsByRole,
  getModelsByTier,
  getModelsByProvider,
  getDefaultModelForRole,
  getDefaultModelForTask,
  estimateCost,
  getTierColor,
  getProviderColor,
} from "../shared/modelRegistry";

describe("Model Registry", () => {
  it("contains 11 models", () => {
    expect(MODEL_REGISTRY.length).toBe(11);
  });

  it("each model has required fields", () => {
    MODEL_REGISTRY.forEach((model) => {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(["anthropic", "openai", "google"]).toContain(model.provider);
      expect(["premium", "standard", "economy"]).toContain(model.tier);
      expect(model.costPerMillionInput).toBeGreaterThan(0);
      expect(model.costPerMillionOutput).toBeGreaterThan(0);
      expect(model.contextWindow).toBeGreaterThan(0);
      expect(model.recommendedRoles.length).toBeGreaterThan(0);
      expect(model.strengths).toBeTruthy();
      expect(typeof model.supportsVision).toBe("boolean");
      expect(typeof model.supportsStructuredOutput).toBe("boolean");
    });
  });

  it("has models from all three providers", () => {
    const providers = new Set(MODEL_REGISTRY.map((m) => m.provider));
    expect(providers.has("anthropic")).toBe(true);
    expect(providers.has("openai")).toBe(true);
    expect(providers.has("google")).toBe(true);
  });

  it("has models in all three tiers", () => {
    const tiers = new Set(MODEL_REGISTRY.map((m) => m.tier));
    expect(tiers.has("premium")).toBe(true);
    expect(tiers.has("standard")).toBe(true);
    expect(tiers.has("economy")).toBe(true);
  });
});

describe("getModelById", () => {
  it("returns correct model for valid ID", () => {
    const model = getModelById("claude-opus-4-7");
    expect(model).toBeDefined();
    expect(model!.name).toBe("Claude Opus 4.7");
    expect(model!.provider).toBe("anthropic");
    expect(model!.tier).toBe("premium");
  });

  it("returns undefined for invalid ID", () => {
    expect(getModelById("nonexistent-model")).toBeUndefined();
  });
});

describe("getModelsByRole", () => {
  it("returns models for coordinator role", () => {
    const models = getModelsByRole("coordinator");
    expect(models.length).toBeGreaterThan(0);
    expect(models.some((m) => m.id === "claude-opus-4-7")).toBe(true);
  });

  it("returns models for bulk_worker role", () => {
    const models = getModelsByRole("bulk_worker");
    expect(models.length).toBeGreaterThan(0);
    // Economy models should be recommended for bulk work
    expect(models.some((m) => m.tier === "economy")).toBe(true);
  });
});

describe("getModelsByTier", () => {
  it("returns only premium models", () => {
    const models = getModelsByTier("premium");
    expect(models.length).toBeGreaterThan(0);
    models.forEach((m) => expect(m.tier).toBe("premium"));
  });

  it("returns only economy models", () => {
    const models = getModelsByTier("economy");
    expect(models.length).toBeGreaterThan(0);
    models.forEach((m) => expect(m.tier).toBe("economy"));
  });
});

describe("getModelsByProvider", () => {
  it("returns only Anthropic models", () => {
    const models = getModelsByProvider("anthropic");
    expect(models.length).toBeGreaterThan(0);
    models.forEach((m) => expect(m.provider).toBe("anthropic"));
  });
});

describe("Role Defaults", () => {
  it("coordinator defaults to premium model", () => {
    const modelId = getDefaultModelForRole("coordinator");
    const model = getModelById(modelId);
    expect(model).toBeDefined();
    expect(model!.tier).toBe("premium");
  });

  it("bulk_worker defaults to economy model", () => {
    const modelId = getDefaultModelForRole("bulk_worker");
    const model = getModelById(modelId);
    expect(model).toBeDefined();
    expect(model!.tier).toBe("economy");
  });

  it("web_research defaults to GPT-5.5", () => {
    expect(getDefaultModelForRole("web_research")).toBe("gpt-5.5");
  });

  it("vision defaults to Opus 4.7", () => {
    expect(getDefaultModelForRole("vision")).toBe("claude-opus-4-7");
  });

  it("all roles have valid model defaults", () => {
    Object.entries(ROLE_DEFAULTS).forEach(([role, modelId]) => {
      const model = getModelById(modelId);
      expect(model).toBeDefined();
    });
  });
});

describe("Task Category Defaults", () => {
  it("strategy uses premium model", () => {
    const modelId = getDefaultModelForTask("strategy");
    const model = getModelById(modelId);
    expect(model).toBeDefined();
    expect(model!.tier).toBe("premium");
  });

  it("data_processing uses economy model", () => {
    const modelId = getDefaultModelForTask("data_processing");
    const model = getModelById(modelId);
    expect(model).toBeDefined();
    expect(model!.tier).toBe("economy");
  });

  it("all task categories have valid model defaults", () => {
    Object.entries(TASK_CATEGORY_DEFAULTS).forEach(([category, modelId]) => {
      const model = getModelById(modelId);
      expect(model).toBeDefined();
    });
  });
});

describe("estimateCost", () => {
  it("calculates cost correctly for known model", () => {
    // GPT-5 Nano: $0.3/M input, $1.2/M output
    const cost = estimateCost("gpt-5-nano", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.3 + 1.2, 2);
  });

  it("returns 0 for unknown model", () => {
    expect(estimateCost("nonexistent", 1000, 1000)).toBe(0);
  });

  it("scales linearly with token count", () => {
    const cost1 = estimateCost("gpt-5-nano", 1000, 1000);
    const cost2 = estimateCost("gpt-5-nano", 2000, 2000);
    expect(cost2).toBeCloseTo(cost1 * 2, 6);
  });

  it("premium models cost more than economy models for same tokens", () => {
    const premiumCost = estimateCost("claude-opus-4-7", 10000, 5000);
    const economyCost = estimateCost("gpt-5-nano", 10000, 5000);
    expect(premiumCost).toBeGreaterThan(economyCost);
  });
});

describe("UI Helpers", () => {
  it("getTierColor returns correct classes", () => {
    expect(getTierColor("premium")).toContain("amber");
    expect(getTierColor("standard")).toContain("blue");
    expect(getTierColor("economy")).toContain("emerald");
  });

  it("getProviderColor returns hex colors", () => {
    expect(getProviderColor("anthropic")).toMatch(/^#[0-9a-f]{6}$/);
    expect(getProviderColor("openai")).toMatch(/^#[0-9a-f]{6}$/);
    expect(getProviderColor("google")).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("Dynamic Workflow Cost Optimization", () => {
  it("coordinator model costs more than bulk worker model", () => {
    const coordModel = getModelById(ROLE_DEFAULTS.coordinator)!;
    const bulkModel = getModelById(ROLE_DEFAULTS.bulk_worker)!;
    expect(coordModel.costPerMillionInput).toBeGreaterThan(
      bulkModel.costPerMillionInput
    );
  });

  it("a 300-agent swarm on economy models costs less than 10 agents on premium", () => {
    // 300 bulk workers at 2000 input + 1000 output tokens each
    const bulkCost =
      300 * estimateCost(ROLE_DEFAULTS.bulk_worker, 2000, 1000);
    // 10 coordinators at same token usage
    const premiumCost =
      10 * estimateCost(ROLE_DEFAULTS.coordinator, 2000, 1000);
    expect(bulkCost).toBeLessThan(premiumCost);
  });

  it("total swarm cost (1 coordinator + 300 workers) is economically viable", () => {
    const coordCost = estimateCost(ROLE_DEFAULTS.coordinator, 5000, 2000);
    const workerCost =
      300 * estimateCost(ROLE_DEFAULTS.bulk_worker, 2000, 1000);
    const totalCost = coordCost + workerCost;
    // Should be under $1 for a single run
    expect(totalCost).toBeLessThan(1.0);
  });
});
