CREATE TABLE `emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` varchar(255) NOT NULL,
	`threadId` varchar(255),
	`from` varchar(255) NOT NULL,
	`to` varchar(255) NOT NULL,
	`subject` varchar(512) NOT NULL,
	`body` text NOT NULL,
	`htmlBody` text,
	`attachmentsJson` text,
	`timestamp` timestamp NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'received',
	`metadataJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emails_id` PRIMARY KEY(`id`)
);
