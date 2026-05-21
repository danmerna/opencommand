CREATE TABLE `onboarding_surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`companyId` int,
	`thumbs` enum('up','down') NOT NULL,
	`questions` json,
	`responses` json,
	`briefingFrequency` varchar(32),
	`email` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `onboarding_surveys_id` PRIMARY KEY(`id`)
);
