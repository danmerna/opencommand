CREATE TABLE `blueprint_run_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`blueprintId` int NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`nodeType` varchar(32) NOT NULL,
	`nodeLabel` varchar(256),
	`eventType` enum('node_started','node_completed','node_failed','agent_thinking','agent_output','verification_started','verification_passed','verification_failed','hitl_requested','hitl_approved','hitl_dismissed','goal_updated','run_completed','run_failed') NOT NULL,
	`message` text,
	`output` json,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blueprint_run_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blueprintId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('queued','running','paused','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
	`triggeredBy` enum('manual','scheduled','api') NOT NULL DEFAULT 'manual',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`currentNodeId` varchar(64),
	`summary` text,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blueprint_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hitl_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`blueprintId` int NOT NULL,
	`userId` int NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`nodeLabel` varchar(256),
	`agentName` varchar(128),
	`blueprintTicker` varchar(32),
	`mode` enum('ask_permission','notify_complete') NOT NULL DEFAULT 'ask_permission',
	`urgency` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`title` varchar(256) NOT NULL,
	`body` text,
	`context` json,
	`status` enum('pending','approved','dismissed','expired') NOT NULL DEFAULT 'pending',
	`resolvedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hitl_notifications_id` PRIMARY KEY(`id`)
);
