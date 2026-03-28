CREATE TABLE `action_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`agentId` int,
	`actionText` text NOT NULL,
	`context` text,
	`riskLevel` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`options` json NOT NULL,
	`selectedOption` enum('recommended','conservative','aggressive'),
	`status` enum('pending','approved','dismissed','executed','failed') NOT NULL DEFAULT 'pending',
	`executedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `action_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_model_evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blueprintId` int NOT NULL,
	`userId` int NOT NULL,
	`modelName` varchar(128) NOT NULL,
	`qualityScore` decimal(3,2) NOT NULL,
	`speedMs` int NOT NULL,
	`costPerRun` decimal(10,6) NOT NULL,
	`recommendedModel` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blueprint_model_evaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `completed_work` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`agentId` int,
	`taskDescription` text NOT NULL,
	`timeSavedHours` decimal(8,2) NOT NULL,
	`laborValueUsd` decimal(12,2) NOT NULL,
	`costIncurredUsd` decimal(10,2) DEFAULT '0',
	`netValueUsd` decimal(12,2) NOT NULL,
	`outcome` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `completed_work_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `overnight_changes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`changeType` varchar(64) NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`dataSource` varchar(128),
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`actionRequired` boolean NOT NULL DEFAULT false,
	`actionItemId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `overnight_changes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strategy_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`title` varchar(256) NOT NULL,
	`recommendation` text NOT NULL,
	`riskLevel` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`context` text,
	`actionItemId` int,
	`status` enum('pending','approved','dismissed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `strategy_cards_id` PRIMARY KEY(`id`)
);
