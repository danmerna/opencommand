import { getWebSocketServer } from "../../websocket";

/**
 * Goal Progress WebSocket Broadcasting
 * Sends real-time goal updates to connected dashboard clients
 */

export interface GoalProgressEvent {
  type: "goal_created" | "goal_updated" | "goal_deleted" | "agent_assigned" | "progress_updated" | "collaboration_message";
  goalId: number;
  goalTitle: string;
  data: Record<string, any>;
  timestamp: string;
}

/**
 * Broadcast goal creation to all workspace clients
 */
export function broadcastGoalCreated(companyId: number, goalId: number, goalTitle: string, agents: any[]) {
  const ws = getWebSocketServer();
  if (!ws) return;

  ws.broadcastDashboardUpdate(companyId, {
    type: "goal_created",
    goalId,
    goalTitle,
    agents: agents.map((a: any) => ({ id: a.agentId, name: a.agentName, role: a.role })),
    timestamp: new Date().toISOString(),
  });

  console.log(`[Goal WS] Broadcasted goal_created: ${goalTitle} (${goalId})`);
}

/**
 * Broadcast goal status update
 */
export function broadcastGoalUpdated(companyId: number, goalId: number, goalTitle: string, status: string, updatedBy: string) {
  const ws = getWebSocketServer();
  if (!ws) return;

  ws.broadcastDashboardUpdate(companyId, {
    type: "goal_updated",
    goalId,
    goalTitle,
    status,
    updatedBy,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Goal WS] Broadcasted goal_updated: ${goalTitle} -> ${status}`);
}

/**
 * Broadcast agent progress update on a goal
 */
export function broadcastAgentProgress(
  companyId: number,
  goalId: number,
  goalTitle: string,
  agentId: string,
  agentName: string,
  progressPercentage: number,
  status: string,
  update?: string
) {
  const ws = getWebSocketServer();
  if (!ws) return;

  ws.broadcastDashboardUpdate(companyId, {
    type: "progress_updated",
    goalId,
    goalTitle,
    agentId,
    agentName,
    progressPercentage,
    status,
    update: update || null,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Goal WS] Broadcasted progress: ${agentName} on ${goalTitle} -> ${progressPercentage}%`);
}

/**
 * Broadcast collaboration message between agents
 */
export function broadcastCollaboration(
  companyId: number,
  goalId: number,
  goalTitle: string,
  fromAgentId: string,
  toAgentId: string,
  messageType: string,
  message: string
) {
  const ws = getWebSocketServer();
  if (!ws) return;

  ws.broadcastDashboardUpdate(companyId, {
    type: "collaboration_message",
    goalId,
    goalTitle,
    fromAgentId,
    toAgentId,
    messageType,
    message,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Goal WS] Broadcasted collaboration: ${fromAgentId} -> ${toAgentId} on ${goalTitle}`);
}

/**
 * Broadcast agent assignment to goal
 */
export function broadcastAgentAssigned(
  companyId: number,
  goalId: number,
  goalTitle: string,
  agentId: string,
  agentName: string,
  role: string
) {
  const ws = getWebSocketServer();
  if (!ws) return;

  ws.broadcastDashboardUpdate(companyId, {
    type: "agent_assigned",
    goalId,
    goalTitle,
    agentId,
    agentName,
    role,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Goal WS] Broadcasted agent_assigned: ${agentName} (${role}) to ${goalTitle}`);
}
