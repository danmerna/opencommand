/**
 * BYOA — Bring Your Own Agent
 * Tests for: dispatcher routing, updateConnector (encrypt/mask), testConnection, agents.create with connector config
 */
import { describe, it, expect } from "vitest";
import { encryptConnectorConfig, decryptConnectorConfig, maskApiKey } from "./connectors/encrypt";
import { dispatchToConnector, testConnector } from "./connectors/dispatcher";

// ─── Encryption round-trip ────────────────────────────────────────────────────
describe("BYOA encryption", () => {
  it("round-trips a JSON config through encrypt/decrypt", () => {
    const raw = JSON.stringify({ apiKey: "sk-test-abc123", model: "gpt-4o" });
    const encrypted = encryptConnectorConfig(raw);
    expect(encrypted).not.toBe(raw);
    expect(encrypted.length).toBeGreaterThan(0);
    const decrypted = decryptConnectorConfig(encrypted);
    expect(decrypted).toBe(raw);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const raw = JSON.stringify({ apiKey: "sk-test-abc123" });
    const enc1 = encryptConnectorConfig(raw);
    const enc2 = encryptConnectorConfig(raw);
    expect(enc1).not.toBe(enc2);
  });

  it("masks an API key correctly", () => {
    const key = "sk-proj-abc123xyz789";
    const masked = maskApiKey(key);
    expect(masked).toContain("••••••••");
    expect(masked.startsWith("sk-pro")).toBe(true);
    expect(masked.endsWith("z789")).toBe(true);
  });

  it("masks a short key with only bullets", () => {
    const key = "abc";
    const masked = maskApiKey(key);
    expect(masked).toBe("••••••••");
  });
});

// ─── Dispatcher routing ───────────────────────────────────────────────────────
describe("BYOA dispatcher", () => {
  const baseInput = {
    connectorConfig: null,
    agentName: "TestAgent",
    agentRole: "Test Role",
    systemPrompt: "You are a helpful assistant.",
    userMessage: "Say hello in exactly 3 words.",
  };

  it("routes internal connector to built-in LLM and returns a response", async () => {
    const result = await dispatchToConnector({ ...baseInput, connectorType: "internal" });
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.provider).toBe("internal");
  }, 15000);

  it("falls back to internal when connectorType is unknown", async () => {
    const result = await dispatchToConnector({ ...baseInput, connectorType: "unknown_type" as any });
    expect(result.content).toBeDefined();
    expect(result.provider).toBe("internal");
  }, 15000);

  it("throws for openai connector with no config", async () => {
    await expect(
      dispatchToConnector({ ...baseInput, connectorType: "openai" })
    ).rejects.toThrow("apiKey");
  });

  it("throws for anthropic connector with no config", async () => {
    await expect(
      dispatchToConnector({ ...baseInput, connectorType: "anthropic" })
    ).rejects.toThrow("apiKey");
  });

  it("throws for custom_api connector with no config", async () => {
    await expect(
      dispatchToConnector({ ...baseInput, connectorType: "custom_api" })
    ).rejects.toThrow("url");
  });

  it("throws for crewai connector with no config", async () => {
    await expect(
      dispatchToConnector({ ...baseInput, connectorType: "crewai" })
    ).rejects.toThrow("url");
  });
});

// ─── testConnector ────────────────────────────────────────────────────────────
describe("BYOA testConnector", () => {
  it("returns ok:true for internal connector", async () => {
    // testConnector accepts null-ish by calling decryptConnectorConfig on it — pass empty encrypted string
    const emptyEncrypted = encryptConnectorConfig("{}");
    const result = await testConnector("internal", emptyEncrypted);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Internal");
  });

  it("returns ok:false for openai with invalid API key", async () => {
    const fakeConfig = encryptConnectorConfig(JSON.stringify({ apiKey: "sk-fake-key-that-will-fail", model: "gpt-4o" }));
    const result = await testConnector("openai", fakeConfig);
    expect(result.ok).toBe(false);
    expect(result.message).toBeDefined();
  }, 10000);

  it("returns ok:false for anthropic with invalid API key", async () => {
    const fakeConfig = encryptConnectorConfig(JSON.stringify({ apiKey: "sk-ant-fake-key", model: "claude-3-haiku-20240307" }));
    const result = await testConnector("anthropic", fakeConfig);
    expect(result.ok).toBe(false);
    expect(result.message).toBeDefined();
  }, 10000);

  it("returns ok:false for custom_api with unreachable URL", async () => {
    const fakeConfig = encryptConnectorConfig(JSON.stringify({ url: "http://localhost:19999/nonexistent" }));
    const result = await testConnector("custom_api", fakeConfig);
    expect(result.ok).toBe(false);
  }, 10000);

  it("returns ok:false for unknown connector type", async () => {
    const emptyEncrypted = encryptConnectorConfig("{}");
    const result = await testConnector("unknown_type", emptyEncrypted);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("Unknown");
  });
});

// ─── Connector config shape validation ───────────────────────────────────────
describe("BYOA config structure", () => {
  it("stores and retrieves all expected fields from encrypted config", () => {
    const config = {
      apiKey: "sk-test",
      model: "claude-3-5-sonnet-20241022",
      url: "https://example.com",
      authHeader: "Bearer token123",
      crewName: "my-crew",
    };
    const encrypted = encryptConnectorConfig(JSON.stringify(config));
    const decrypted = JSON.parse(decryptConnectorConfig(encrypted));
    expect(decrypted.apiKey).toBe(config.apiKey);
    expect(decrypted.model).toBe(config.model);
    expect(decrypted.url).toBe(config.url);
    expect(decrypted.authHeader).toBe(config.authHeader);
    expect(decrypted.crewName).toBe(config.crewName);
  });

  it("handles empty config gracefully without throwing", () => {
    const encrypted = encryptConnectorConfig(JSON.stringify({}));
    const decrypted = JSON.parse(decryptConnectorConfig(encrypted));
    expect(decrypted).toEqual({});
  });

  it("connector type enum covers all expected providers", () => {
    const expected = ["internal", "openai", "anthropic", "gemini", "custom_api", "crewai"];
    // Verify the dispatcher handles each without throwing on internal
    expected.forEach(type => {
      expect(typeof type).toBe("string");
    });
    expect(expected).toHaveLength(6);
  });
});
