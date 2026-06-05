CREATE TABLE `blueprint_checkpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blueprintId` int NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`triggerMode` enum('before_agent','after_agent') NOT NULL DEFAULT 'before_agent',
	`linkedAgentNodeId` varchar(64),
	`interfaceType` enum('notification_swipe','voice_call','file_watch','email_approval','dashboard_review','webhook_signal') NOT NULL DEFAULT 'notification_swipe',
	`config` json,
	`defaultRule` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blueprint_checkpoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `llm_council_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blueprintId` int NOT NULL,
	`goalNodeId` varchar(64),
	`agentNodeId` varchar(64),
	`councilSize` int NOT NULL DEFAULT 3,
	`quorumRequired` int NOT NULL DEFAULT 2,
	`councilModels` json NOT NULL,
	`evaluationPrompt` text,
	`scoringRubric` json,
	`councilTier` enum('free','pro','business') NOT NULL DEFAULT 'pro',
	`isEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `llm_council_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `model_popularity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modelId` varchar(64) NOT NULL,
	`workflowRole_mp` enum('coordinator','implementer','verifier','fixer','web_research','vision','computer_use','bulk_worker') NOT NULL,
	`selectionCount` int NOT NULL DEFAULT 1,
	`lastSelectedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `model_popularity_id` PRIMARY KEY(`id`)
);
