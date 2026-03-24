ALTER TABLE `users` ADD `waitlistStatus` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `waitlistPosition` int;--> statement-breakpoint
ALTER TABLE `users` ADD `referralCode` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `referralCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `referredBy` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `waitlistJoinedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `waitlistApprovedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_referralCode_unique` UNIQUE(`referralCode`);