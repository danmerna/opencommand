CREATE TABLE `blueprint_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blueprintId` int NOT NULL,
	`nodeId` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`role` varchar(256) NOT NULL,
	`mission` text,
	`autonomyLevel` enum('L0','L1','L2','L3') NOT NULL DEFAULT 'L1',
	`tools` json,
	`guardrails` json,
	`allowedActions` json,
	`forbiddenActions` json,
	`confirmationTriggers` json,
	`invariants` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blueprint_agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_chat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`blueprintId` int,
	`messages` json,
	`populatedFields` json,
	`inferredValues` json,
	`confidenceScores` json,
	`completionPercent` int NOT NULL DEFAULT 0,
	`status` enum('interviewing','generating','complete','abandoned') NOT NULL DEFAULT 'interviewing',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blueprint_chat_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blueprintId` int NOT NULL,
	`agentNodeId` varchar(64) NOT NULL,
	`agentRole` varchar(256) NOT NULL,
	`objective` text NOT NULL,
	`desiredFinalState` text,
	`context` json,
	`scope` json,
	`verification` json,
	`iterationPolicy` text,
	`escalation` json,
	`outputRequirements` json,
	`stopCondition` json,
	`verificationStatus` enum('unverified','pending_review','verified','rejected') NOT NULL DEFAULT 'unverified',
	`verifier1Result` json,
	`verifier2Result` json,
	`status` enum('draft','active','in_progress','completed','failed') NOT NULL DEFAULT 'draft',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blueprint_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_instances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`title` varchar(256),
	`nodes` json,
	`edges` json,
	`status` enum('configuring','ready','running','paused','completed','failed') NOT NULL DEFAULT 'configuring',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blueprint_instances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blueprintId` int NOT NULL,
	`buyerUserId` int NOT NULL,
	`sellerUserId` int NOT NULL,
	`price` int NOT NULL,
	`stripePaymentIntentId` varchar(128),
	`status` enum('pending','completed','refunded') NOT NULL DEFAULT 'pending',
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blueprint_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`ticker` varchar(32) NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`category` enum('growth','brand','retention','launch','performance','operations','engineering','sales','support','custom') NOT NULL DEFAULT 'custom',
	`version` varchar(32) NOT NULL DEFAULT '1.0.0',
	`objective` text NOT NULL,
	`desiredFinalState` text,
	`constraints` json,
	`nonGoals` json,
	`successMetrics` json,
	`estimatedRuntime` varchar(64),
	`nodes` json,
	`edges` json,
	`visibility` enum('private','shared','marketplace') NOT NULL DEFAULT 'private',
	`price` int NOT NULL DEFAULT 0,
	`stripeProductId` varchar(128),
	`stripePriceId` varchar(128),
	`isApproved` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp,
	`usageCount` int NOT NULL DEFAULT 0,
	`rating` decimal(3,2) DEFAULT '0',
	`ratingCount` int NOT NULL DEFAULT 0,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blueprint_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `blueprint_templates_ticker_unique` UNIQUE(`ticker`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_workflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blueprintId` int NOT NULL,
	`edgeId` varchar(64) NOT NULL,
	`name` varchar(256) NOT NULL,
	`description` text,
	`triggerCondition` text,
	`inputSchema` json,
	`outputSchema` json,
	`sequenceOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blueprint_workflows_id` PRIMARY KEY(`id`)
);
