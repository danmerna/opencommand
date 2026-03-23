CREATE TABLE `feature_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`feature` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feature_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('bug','feature','general','praise') NOT NULL DEFAULT 'general',
	`content` text NOT NULL,
	`page` varchar(128),
	`status` enum('new','reviewed','resolved') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_feedback_id` PRIMARY KEY(`id`)
);
