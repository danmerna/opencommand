/**
 * BYOA Connector Dispatcher
 *
 * Routes task execution to the correct provider based on agent.connectorType.
 * All external API keys are stored encrypted in agent.connectorConfig.
 * The dispatcher decrypts them at execution time and never returns them to the client.
 */

import { decryptConnectorConfig } from "./encrypt";

export type ConnectorType =
  | "internal"
  | "openai"
  | "anthropic"
  | "gemini"
  | "custom_api"
  | "crewai";

export interface DispatchInput {
  connectorType: ConnectorType | string | null;
  connectorConfig: string | null; // encrypted JSON blob
  agentName: string;
  agentRole: string;
  systemPrompt: string;
  userMessage: string;
}

export interface DispatchResult {
  content: string;
  provider: string;
  model?: string;
}

// ─── Internal (built-in LLM) ─────────────────────────────────────────────────

async function dispatchInternal(input: DispatchInput): Promise<DispatchResult> {
  const { invokeLLM } = await import("../_core/llm");
  const response = await invokeLLM({
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.userMessage },
    ],
  });
  const content = (response.choices[0]?.message?.content ?? "") as string;
  return { content, provider: "internal" };
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

async function dispatchOpenAI(input: DispatchInput): Promise<DispatchResult> {
  const config = parseConfig(input.connectorConfig);
  const apiKey = config.apiKey as string;
  const model = (config.model as string) || "gpt-4o";
  if (!apiKey) throw new Error("OpenAI connector is missing apiKey in connectorConfig");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userMessage },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return { content: data.choices[0]?.message?.content ?? "", provider: "openai", model };
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

async function dispatchAnthropic(input: DispatchInput): Promise<DispatchResult> {
  const config = parseConfig(input.connectorConfig);
  const apiKey = config.apiKey as string;
  const model = (config.model as string) || "claude-3-5-sonnet-20241022";
  if (!apiKey) throw new Error("Anthropic connector is missing apiKey in connectorConfig");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: input.systemPrompt,
      messages: [{ role: "user", content: input.userMessage }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { content: Array<{ text: string }> };
  return { content: data.content[0]?.text ?? "", provider: "anthropic", model };
}

// ─── Gemini ──────────────────────────────────────────────────────────────────

async function dispatchGemini(input: DispatchInput): Promise<DispatchResult> {
  const config = parseConfig(input.connectorConfig);
  const apiKey = config.apiKey as string;
  const model = (config.model as string) || "gemini-1.5-pro";
  if (!apiKey) throw new Error("Gemini connector is missing apiKey in connectorConfig");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: `${input.systemPrompt}\n\n${input.userMessage}` }] },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return {
    content: data.candidates[0]?.content?.parts[0]?.text ?? "",
    provider: "gemini",
    model,
  };
}

// ─── Custom HTTP Endpoint ────────────────────────────────────────────────────

async function dispatchCustomApi(input: DispatchInput): Promise<DispatchResult> {
  const config = parseConfig(input.connectorConfig);
  const url = config.url as string;
  const authHeader = config.authHeader as string | undefined;
  if (!url) throw new Error("custom_api connector is missing url in connectorConfig");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader) headers["Authorization"] = authHeader;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      agent: { name: input.agentName, role: input.agentRole },
      systemPrompt: input.systemPrompt,
      message: input.userMessage,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Custom API error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { content?: string; output?: string; result?: string };
  const content = data.content ?? data.output ?? data.result ?? JSON.stringify(data);
  return { content, provider: "custom_api" };
}

// ─── CrewAI ──────────────────────────────────────────────────────────────────

async function dispatchCrewAI(input: DispatchInput): Promise<DispatchResult> {
  const config = parseConfig(input.connectorConfig);
  const url = config.url as string;
  const crewName = (config.crewName as string) || "default";
  if (!url) throw new Error("crewai connector is missing url in connectorConfig");

  const res = await fetch(`${url}/kickoff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      crew: crewName,
      inputs: {
        agent: input.agentName,
        role: input.agentRole,
        task: input.userMessage,
        context: input.systemPrompt,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CrewAI error ${res.status}: ${err}`);
  }
  const data = (await res.json()) as { result?: string; output?: string };
  return { content: data.result ?? data.output ?? "", provider: "crewai" };
}

// ─── Main Dispatcher ─────────────────────────────────────────────────────────

/**
 * Dispatch a task to the appropriate connector based on agent.connectorType.
 * Decrypts connectorConfig before use; never exposes raw keys.
 */
export async function dispatchToConnector(input: DispatchInput): Promise<DispatchResult> {
  const type = (input.connectorType ?? "internal") as ConnectorType;

  // Decrypt config if present
  const decryptedInput: DispatchInput = {
    ...input,
    connectorConfig: input.connectorConfig
      ? decryptConnectorConfig(input.connectorConfig)
      : null,
  };

  switch (type) {
    case "internal":
      return dispatchInternal(decryptedInput);
    case "openai":
      return dispatchOpenAI(decryptedInput);
    case "anthropic":
      return dispatchAnthropic(decryptedInput);
    case "gemini":
      return dispatchGemini(decryptedInput);
    case "custom_api":
      return dispatchCustomApi(decryptedInput);
    case "crewai":
      return dispatchCrewAI(decryptedInput);
    default:
      // Unknown connector type — fall back to internal
      console.warn(`[Dispatcher] Unknown connectorType "${type}", falling back to internal`);
      return dispatchInternal(decryptedInput);
  }
}

/**
 * Lightweight ping to verify a connector is reachable and credentials are valid.
 * Returns { ok: boolean, message: string }.
 */
export async function testConnector(
  connectorType: ConnectorType | string,
  encryptedConfig: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const config = parseConfig(decryptConnectorConfig(encryptedConfig));
    switch (connectorType as ConnectorType) {
      case "internal":
        return { ok: true, message: "Internal connector is always available." };

      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { ok: true, message: "OpenAI credentials verified." };
      }

      case "anthropic": {
        // Anthropic doesn't have a /models endpoint; send a minimal message
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey as string,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: (config.model as string) || "claude-3-haiku-20240307",
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { ok: true, message: "Anthropic credentials verified." };
      }

      case "gemini": {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { ok: true, message: "Gemini credentials verified." };
      }

      case "custom_api":
      case "crewai": {
        const url = config.url as string;
        if (!url) throw new Error("No URL configured");
        const res = await fetch(url, { method: "HEAD" });
        // HEAD might return 405 but still means the endpoint is reachable
        if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
        return { ok: true, message: `Endpoint reachable (HTTP ${res.status}).` };
      }

      default:
        return { ok: false, message: `Unknown connector type: ${connectorType}` };
    }
  } catch (err) {
    return { ok: false, message: String(err instanceof Error ? err.message : err) };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseConfig(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}
