CREATE TABLE `executive_context_manifests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`dataSources` json NOT NULL,
	`contextSummary` text,
	`liveStateSnapshot` json,
	`assembledAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `executive_context_manifests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `connectorType` enum('internal','openai','anthropic','gemini','custom_api','crewai','claude_code') NOT NULL DEFAULT 'internal';