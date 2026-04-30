CREATE TABLE `quick_start_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shareId` varchar(32) NOT NULL,
	`userId` int,
	`email` varchar(320),
	`companyName` varchar(256) NOT NULL,
	`website` varchar(512) NOT NULL,
	`industry` varchar(128),
	`recommendation` text,
	`auditSummary` text,
	`seoScore` int,
	`techStack` json,
	`socialPresence` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quick_start_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `quick_start_results_shareId_unique` UNIQUE(`shareId`)
);
