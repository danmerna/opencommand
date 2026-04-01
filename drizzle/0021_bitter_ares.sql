CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`category` enum('john_deere','kubota','financing','parts','service','custom') NOT NULL DEFAULT 'custom',
	`subject` varchar(256) NOT NULL,
	`body` text NOT NULL,
	`variablesJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`)
);
