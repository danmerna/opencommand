CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`type` enum('ceo','marketing','research','sales','admin','custom') NOT NULL,
	`status` enum('idle','active','paused','error') NOT NULL DEFAULT 'idle',
	`description` text,
	`capabilities` json DEFAULT ('[]'),
	`resourceUsage` decimal(5,2) DEFAULT '0',
	`tasksCompleted` int NOT NULL DEFAULT 0,
	`totalValueCreated` decimal(12,2) DEFAULT '0',
	`isMarketplaceListing` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `creator_partnerships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`creatorName` varchar(128) NOT NULL,
	`creatorHandle` varchar(64) NOT NULL,
	`niche` varchar(64) NOT NULL,
	`audienceSize` int,
	`platform` varchar(32),
	`status` enum('applied','active','paused','terminated') NOT NULL DEFAULT 'applied',
	`floorGuarantee` decimal(10,2) DEFAULT '0',
	`flowPercentage` decimal(5,2) DEFAULT '0',
	`totalEarned` decimal(12,2) DEFAULT '0',
	`endorsedListingId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creator_partnerships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decision_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int,
	`taskId` int,
	`decisionType` varchar(64) NOT NULL,
	`context` text,
	`decision` text NOT NULL,
	`rationale` text,
	`outcome` text,
	`wasSuccessful` boolean,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `decision_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inbox_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` int,
	`agentId` int,
	`type` enum('decision_required','budget_approval','task_review','alert','poo_generated') NOT NULL,
	`title` varchar(256) NOT NULL,
	`body` text NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('unread','read','resolved','dismissed') NOT NULL DEFAULT 'unread',
	`resolution` text,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inbox_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`tier` enum('solo_founder','enterprise','custom') NOT NULL,
	`name` varchar(128) NOT NULL,
	`tagline` varchar(256),
	`description` text,
	`price` decimal(10,2),
	`pricingModel` enum('monthly','annual','usage','value_capture') NOT NULL DEFAULT 'monthly',
	`features` json DEFAULT ('[]'),
	`endorsedBy` varchar(128),
	`endorserHandle` varchar(64),
	`endorserNiche` varchar(64),
	`isActive` boolean NOT NULL DEFAULT true,
	`totalPurchases` int NOT NULL DEFAULT 0,
	`avgRating` decimal(3,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `okrs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`objective` text NOT NULL,
	`keyResult` text NOT NULL,
	`targetValue` decimal(12,2) NOT NULL,
	`currentValue` decimal(12,2) NOT NULL DEFAULT '0',
	`unit` varchar(32) NOT NULL DEFAULT '',
	`dueDate` timestamp,
	`status` enum('on_track','at_risk','achieved','missed') NOT NULL DEFAULT 'on_track',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `okrs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `poo_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`userId` int NOT NULL,
	`agentId` int,
	`receiptNumber` varchar(32) NOT NULL,
	`taskTitle` varchar(256) NOT NULL,
	`outcome` text NOT NULL,
	`laborHoursSaved` decimal(8,2) NOT NULL,
	`dollarValueCreated` decimal(12,2) NOT NULL,
	`hourlyRateBenchmark` decimal(8,2) DEFAULT '150',
	`verificationStatus` enum('pending','verified','disputed') NOT NULL DEFAULT 'pending',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `poo_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `poo_receipts_receiptNumber_unique` UNIQUE(`receiptNumber`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`agentId` int,
	`title` varchar(256) NOT NULL,
	`description` text,
	`intentObject` json,
	`status` enum('pending','in_progress','completed','failed','awaiting_human') NOT NULL DEFAULT 'pending',
	`routingMode` enum('ai','human','hybrid') NOT NULL DEFAULT 'ai',
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`estimatedHours` decimal(6,2),
	`actualHours` decimal(6,2),
	`generatedPrompt` text,
	`executionLog` json DEFAULT ('[]'),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
