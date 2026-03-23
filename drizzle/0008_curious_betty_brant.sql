ALTER TABLE `users` ADD `emailUnsubscribeToken` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `emailUnsubscribed` boolean DEFAULT false NOT NULL;