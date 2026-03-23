CREATE TABLE `briefing_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`companyName` varchar(128),
	`frequency` enum('daily','weekly','monthly','quarterly') NOT NULL,
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`deliveredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `briefing_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `okrs` ADD `source` enum('manual','strategy') DEFAULT 'manual' NOT NULL;