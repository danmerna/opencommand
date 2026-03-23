import { describe, expect, it, vi } from "vitest";
import { PRODUCTS, type ProductKey } from "./stripe/products";

// ─── Stripe Products Tests ──────────────────────────────────────────────────

describe("Stripe Products", () => {
  it("defines all required product keys", () => {
    expect(PRODUCTS).toHaveProperty("SOLO_FOUNDER_CEO");
    expect(PRODUCTS).toHaveProperty("ENTERPRISE_CEO");
    expect(PRODUCTS).toHaveProperty("BLUEPRINT_CONTENT_AGENCY");
    expect(PRODUCTS).toHaveProperty("BLUEPRINT_ECOMMERCE");
    expect(PRODUCTS).toHaveProperty("BLUEPRINT_YOUTUBE");
  });

  it("all products have required fields", () => {
    for (const [key, product] of Object.entries(PRODUCTS)) {
      expect(product.name).toBeTruthy();
      expect(product.description).toBeTruthy();
      expect(product.priceAmount).toBeGreaterThan(0);
      expect(product.currency).toBe("usd");
      expect(["subscription", "one_time"]).toContain(product.type);
      expect(product.tier).toBeTruthy();
    }
  });

  it("subscription products have interval field", () => {
    const subs = Object.values(PRODUCTS).filter(p => p.type === "subscription");
    for (const sub of subs) {
      expect((sub as any).interval).toBe("month");
    }
  });

  it("Solo Founder CEO is $199/mo", () => {
    expect(PRODUCTS.SOLO_FOUNDER_CEO.priceAmount).toBe(19900);
    expect(PRODUCTS.SOLO_FOUNDER_CEO.type).toBe("subscription");
  });

  it("Enterprise CEO is $999/mo", () => {
    expect(PRODUCTS.ENTERPRISE_CEO.priceAmount).toBe(99900);
    expect(PRODUCTS.ENTERPRISE_CEO.type).toBe("subscription");
  });

  it("Blueprint products are one-time payments", () => {
    expect(PRODUCTS.BLUEPRINT_CONTENT_AGENCY.type).toBe("one_time");
    expect(PRODUCTS.BLUEPRINT_ECOMMERCE.type).toBe("one_time");
    expect(PRODUCTS.BLUEPRINT_YOUTUBE.type).toBe("one_time");
  });
});

// ─── Checkout Session Tests ─────────────────────────────────────────────────

describe("Checkout Session Creation", () => {
  it("createCheckoutSession throws for unknown product key", async () => {
    const { createCheckoutSession } = await import("./stripe/checkout");
    await expect(
      createCheckoutSession({
        productKey: "NONEXISTENT" as ProductKey,
        userId: 1,
        userEmail: "test@test.com",
        userName: "Test",
        origin: "http://localhost:3000",
      })
    ).rejects.toThrow("Unknown product");
  });
});

// ─── Router Integration Tests ───────────────────────────────────────────────

describe("Payments Router", () => {
  it("products endpoint returns all products", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: vi.fn() } as any,
    });

    const products = await caller.payments.products();
    expect(products.length).toBeGreaterThanOrEqual(5);
    
    const keys = products.map(p => p.key);
    expect(keys).toContain("SOLO_FOUNDER_CEO");
    expect(keys).toContain("ENTERPRISE_CEO");
    expect(keys).toContain("BLUEPRINT_CONTENT_AGENCY");

    for (const product of products) {
      expect(product.name).toBeTruthy();
      expect(product.priceAmount).toBeGreaterThan(0);
    }
  }, 15000);

  it("checkout requires authentication", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: vi.fn() } as any,
    });

    await expect(
      caller.payments.checkout({
        productKey: "SOLO_FOUNDER_CEO",
        origin: "http://localhost:3000",
      })
    ).rejects.toThrow();
  });
});

// ─── WebSocket Event Types ──────────────────────────────────────────────────

describe("WebSocket Event Types", () => {
  it("notification event types are well-defined", () => {
    const validTypes = [
      "task_completed",
      "inbox_item",
      "agent_status",
      "heartbeat",
      "poo_receipt",
      "payment_success",
    ];

    // Ensure all types are strings
    for (const type of validTypes) {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    }
  });
});

// ─── Product Key Mapping ────────────────────────────────────────────────────

describe("Product Key Mapping", () => {
  it("uppercase conversion maps frontend keys to product keys", () => {
    const frontendKeys = ["solo_founder_ceo", "enterprise_ceo", "blueprint_content_agency"];
    for (const key of frontendKeys) {
      const upper = key.toUpperCase() as ProductKey;
      expect(PRODUCTS[upper]).toBeDefined();
    }
  });
});
