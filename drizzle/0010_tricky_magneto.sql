CREATE TABLE `changelog_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`version` varchar(32) NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text NOT NULL,
	`type` enum('feature','improvement','fix','announcement') NOT NULL DEFAULT 'feature',
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `changelog_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_welcome_emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `onboarding_welcome_emails_id` PRIMARY KEY(`id`),
	CONSTRAINT `onboarding_welcome_emails_userId_unique` UNIQUE(`userId`)
);
