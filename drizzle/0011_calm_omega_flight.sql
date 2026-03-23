CREATE TABLE `page_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(64),
	`path` varchar(512) NOT NULL,
	`referrer` varchar(512),
	`userAgent` text,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`pageCount` int NOT NULL DEFAULT 1,
	`entryPath` varchar(512),
	`exitPath` varchar(512),
	`userAgent` text,
	`duration` int DEFAULT 0,
	CONSTRAINT `user_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
