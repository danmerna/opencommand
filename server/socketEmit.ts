/**
 * socketEmit.ts
 * Thin wrapper around the global Socket.IO `io` instance.
 * Emits a `notification` event to a specific user room or broadcast to all.
 *
 * Usage:
 *   emitToUser(userId, "task_completed", "Task Done", "Receipt POO-123 generated")
 *   emitBroadcast("heartbeat", "Heartbeat", "Agent Arch ticked")
 */

import { io } from "./_core/index";

export type NotificationEventType =
  | "task_completed"
  | "inbox_item"
  | "agent_status"
  | "heartbeat"
  | "poo_receipt"
  | "payment_success"
  | "okr_updated"
  | "kill_switch";

export interface NotificationPayload {
  type: NotificationEventType;
  title: string;
  message: string;
  timestamp: number;
  meta?: Record<string, unknown>;
}

/**
 * Emit a notification to a specific user's socket room.
 * Falls back silently if `io` is not yet initialised (e.g., during tests).
 */
export function emitToUser(
  userId: number,
  type: NotificationEventType,
  title: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  try {
    if (!io) return;
    const payload: NotificationPayload = { type, title, message, timestamp: Date.now(), meta };
    io.to(`user:${userId}`).emit("notification", payload);
  } catch (_) {
    // Never throw — socket errors must not break the tRPC response
  }
}

/**
 * Emit a notification to ALL connected clients (e.g., system-wide events).
 */
export function emitBroadcast(
  type: NotificationEventType,
  title: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  try {
    if (!io) return;
    const payload: NotificationPayload = { type, title, message, timestamp: Date.now(), meta };
    io.emit("notification", payload);
  } catch (_) {
    // Never throw
  }
}
