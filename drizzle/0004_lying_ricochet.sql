CREATE TABLE `agent_onboardings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`status` enum('in_progress','completed') NOT NULL DEFAULT 'in_progress',
	`agentType` varchar(32) NOT NULL,
	`context` json,
	`conversationHistory` json,
	`summary` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_onboardings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategy_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`proposedByAgentId` int,
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`executiveSummary` text,
	`status` enum('draft','proposed','accepted','revised') NOT NULL DEFAULT 'proposed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strategy_proposals_id` PRIMARY KEY(`id`)
);
