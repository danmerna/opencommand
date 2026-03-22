ALTER TABLE `agents` MODIFY COLUMN `capabilities` json;--> statement-breakpoint
ALTER TABLE `marketplace_listings` MODIFY COLUMN `features` json;--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `executionLog` json;