import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export type NotificationEvent = {
  type: "task_completed" | "inbox_item" | "agent_status" | "heartbeat" | "poo_receipt" | "payment_success";
  title: string;
  message: string;
  timestamp: number;
};

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const utils = trpc.useUtils();

  const clearNotification = useCallback((index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  useEffect(() => {
    if (!user) return;

    const socket = io(window.location.origin, {
      path: "/api/ws",
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join", String(user.id));
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("notification", (event: NotificationEvent) => {
      setNotifications((prev) => [event, ...prev].slice(0, 50));

      // Auto-invalidate relevant queries based on event type
      switch (event.type) {
        case "task_completed":
          utils.tasks.list.invalidate();
          utils.poo.list.invalidate();
          utils.poo.summary.invalidate();
          break;
        case "inbox_item":
          utils.inbox.list.invalidate();
          break;
        case "agent_status":
          utils.agents.list.invalidate();
          break;
        case "heartbeat":
          utils.agents.list.invalidate();
          break;
        case "poo_receipt":
          utils.poo.list.invalidate();
          utils.poo.summary.invalidate();
          break;
        case "payment_success":
          break;
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, utils]);

  return { connected, notifications, clearNotification };
}
