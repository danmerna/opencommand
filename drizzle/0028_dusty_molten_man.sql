CREATE TABLE `guest_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guestToken` varchar(64) NOT NULL,
	`name` varchar(128),
	`email` varchar(320),
	`companyId` int,
	`onboardingId` int,
	`recommendations` json,
	`surveyId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guest_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `guest_sessions_guestToken_unique` UNIQUE(`guestToken`)
);
