import { getDb } from "../db";
import { eq, and } from "drizzle-orm";

/**
 * Agent Registry Service
 * Manages discovery, registration, and status tracking of agents in the workspace
 */

export interface RegisteredAgent {
  id: string;
  name: string;
  type: "lead-response" | "executive-board" | "intent-engine" | "custom";
  status: "online" | "offline" | "error";
  lastHeartbeat: Date;
  capabilities: string[];
  version: string;
  workspaceId: string;
  config: Record<string, unknown>;
}

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

/**
 * Register an agent in the workspace
 */
export async function registerAgent(
  workspaceId: string,
  agent: Omit<RegisteredAgent, "lastHeartbeat">
): Promise<RegisteredAgent> {
  const now = new Date();

  // In production, would insert into agents table
  const registered: RegisteredAgent = {
    ...agent,
    lastHeartbeat: now,
  };

  return registered;
}

/**
 * Update agent heartbeat (marks agent as online)
 */
export async function updateAgentHeartbeat(
  workspaceId: string,
  agentId: string
): Promise<void> {
  // In production, would update agents table
  const now = new Date();
  console.log(`[Agent Registry] Heartbeat from ${agentId} at ${now.toISOString()}`);
}

/**
 * Get agent by ID
 */
export async function getAgent(
  workspaceId: string,
  agentId: string
): Promise<RegisteredAgent | null> {
  // In production, would query agents table
  const mockAgents: Record<string, RegisteredAgent> = {
    "lead-response-1": {
      id: "lead-response-1",
      name: "Lead Response Agent",
      type: "lead-response",
      status: "online",
      lastHeartbeat: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
      capabilities: [
        "ingestLeads",
        "draftResponse",
        "executeResponse",
        "getApprovalQueue",
      ],
      version: "1.0.0",
      workspaceId,
      config: { timeout: 30000, retries: 3 },
    },
    "executive-board-1": {
      id: "executive-board-1",
      name: "Executive Board",
      type: "executive-board",
      status: "online",
      lastHeartbeat: new Date(Date.now() - 2 * 60 * 1000), // 2 min ago
      capabilities: ["ceoThinking", "cfoThinking", "cmoThinking", "ctoThinking"],
      version: "1.0.0",
      workspaceId,
      config: { cascade: true, timeout: 60000 },
    },
    "intent-engine-1": {
      id: "intent-engine-1",
      name: "Intent Engine",
      type: "intent-engine",
      status: "online",
      lastHeartbeat: new Date(Date.now() - 1 * 60 * 1000), // 1 min ago
      capabilities: ["generateActionItems", "askBoard", "getEscalatedActions"],
      version: "1.0.0",
      workspaceId,
      config: { socratic: true, timeout: 45000 },
    },
  };

  return mockAgents[agentId] || null;
}

/**
 * List all agents in workspace
 */
export async function listAgents(workspaceId: string): Promise<RegisteredAgent[]> {
  // In production, would query agents table with workspaceId filter
  const mockAgents: RegisteredAgent[] = [
    {
      id: "lead-response-1",
      name: "Lead Response Agent",
      type: "lead-response",
      status: "online",
      lastHeartbeat: new Date(Date.now() - 5 * 60 * 1000),
      capabilities: [
        "ingestLeads",
        "draftResponse",
        "executeResponse",
        "getApprovalQueue",
      ],
      version: "1.0.0",
      workspaceId,
      config: { timeout: 30000, retries: 3 },
    },
    {
      id: "executive-board-1",
      name: "Executive Board",
      type: "executive-board",
      status: "online",
      lastHeartbeat: new Date(Date.now() - 2 * 60 * 1000),
      capabilities: ["ceoThinking", "cfoThinking", "cmoThinking", "ctoThinking"],
      version: "1.0.0",
      workspaceId,
      config: { cascade: true, timeout: 60000 },
    },
    {
      id: "intent-engine-1",
      name: "Intent Engine",
      type: "intent-engine",
      status: "online",
      lastHeartbeat: new Date(Date.now() - 1 * 60 * 1000),
      capabilities: ["generateActionItems", "askBoard", "getEscalatedActions"],
      version: "1.0.0",
      workspaceId,
      config: { socratic: true, timeout: 45000 },
    },
  ];

  return mockAgents;
}

/**
 * Get agent capabilities
 */
export async function getAgentCapabilities(
  workspaceId: string,
  agentId: string
): Promise<AgentCapability[]> {
  const agent = await getAgent(workspaceId, agentId);
  if (!agent) return [];

  // Map agent capabilities to detailed schemas
  const capabilityMap: Record<string, AgentCapability> = {
    ingestLeads: {
      name: "Ingest Leads",
      description: "Parse incoming lead emails and create action items",
      inputSchema: {
        type: "object",
        properties: {
          email: { type: "string", description: "Raw email content" },
          from: { type: "string", description: "Sender email address" },
        },
        required: ["email", "from"],
      },
      outputSchema: {
        type: "object",
        properties: {
          leadId: { type: "number" },
          buyerName: { type: "string" },
          equipment: { type: "string" },
          urgency: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
    draftResponse: {
      name: "Draft Response",
      description: "Generate personalized response to lead",
      inputSchema: {
        type: "object",
        properties: {
          leadId: { type: "number" },
          templateId: { type: "string", description: "Email template to use" },
        },
        required: ["leadId"],
      },
      outputSchema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          body: { type: "string" },
          quoteLink: { type: "string" },
        },
      },
    },
    ceoThinking: {
      name: "CEO Thinking (5-year horizon)",
      description: "Strategic 5-year perspective on action items",
      inputSchema: {
        type: "object",
        properties: {
          actionItem: { type: "string" },
          context: { type: "object" },
        },
        required: ["actionItem"],
      },
      outputSchema: {
        type: "object",
        properties: {
          perspective: { type: "string" },
          recommendation: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  };

  return agent.capabilities
    .map((cap) => capabilityMap[cap])
    .filter((cap) => cap !== undefined);
}

/**
 * Check agent health (online/offline based on heartbeat timeout)
 */
export async function checkAgentHealth(
  workspaceId: string,
  agentId: string,
  timeoutMs: number = 60000
): Promise<"online" | "offline" | "error"> {
  const agent = await getAgent(workspaceId, agentId);
  if (!agent) return "error";

  const timeSinceHeartbeat = Date.now() - agent.lastHeartbeat.getTime();
  return timeSinceHeartbeat < timeoutMs ? "online" : "offline";
}

/**
 * Get agent status summary for workspace
 */
export async function getWorkspaceStatus(workspaceId: string) {
  const agents = await listAgents(workspaceId);

  const onlineCount = agents.filter((a) => a.status === "online").length;
  const offlineCount = agents.filter((a) => a.status === "offline").length;
  const errorCount = agents.filter((a) => a.status === "error").length;

  return {
    totalAgents: agents.length,
    onlineCount,
    offlineCount,
    errorCount,
    agents,
  };
}

/**
 * Deregister an agent from workspace
 */
export async function deregisterAgent(
  workspaceId: string,
  agentId: string
): Promise<void> {
  // In production, would delete from agents table
  console.log(`[Agent Registry] Deregistered agent ${agentId} from workspace ${workspaceId}`);
}
