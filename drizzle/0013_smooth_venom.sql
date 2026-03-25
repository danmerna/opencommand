CREATE TABLE `agent_autonomy_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`autonomyLevel` enum('full_auto','supervised','approval_required','manual_only') NOT NULL DEFAULT 'supervised',
	`maxSpendPerTask` decimal(10,2) DEFAULT '50',
	`maxTasksPerDay` int DEFAULT 10,
	`allowedActions` json,
	`blockedActions` json,
	`requireApprovalAbove` decimal(10,2) DEFAULT '100',
	`crossModelVerification` boolean NOT NULL DEFAULT false,
	`ralfEnabled` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_autonomy_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ralf_execution_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`agentId` int NOT NULL,
	`companyId` int,
	`phase` enum('reason','act','learn','feedback') NOT NULL,
	`input` text,
	`output` text,
	`confidence` decimal(3,2),
	`crossModelVerified` boolean NOT NULL DEFAULT false,
	`verificationResult` text,
	`durationMs` int,
	`tokenCost` decimal(10,4) DEFAULT '0',
	`status` enum('pending','running','completed','failed','skipped') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ralf_execution_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sub_agent_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`executiveAgentId` int NOT NULL,
	`recommendedName` varchar(128) NOT NULL,
	`recommendedType` varchar(64) NOT NULL,
	`roleTitle` varchar(128),
	`justification` text,
	`requiredTools` json,
	`estimatedImpact` varchar(256),
	`status` enum('suggested','approved','deployed','dismissed') NOT NULL DEFAULT 'suggested',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sub_agent_recommendations_id` PRIMARY KEY(`id`)
);
