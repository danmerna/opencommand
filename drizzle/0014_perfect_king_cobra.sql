CREATE TABLE `integration_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`providerName` varchar(128) NOT NULL,
	`email` varchar(320),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integration_requests_id` PRIMARY KEY(`id`)
);
