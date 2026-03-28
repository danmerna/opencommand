ALTER TABLE `agents` ADD `builtWithSigma` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `sigmaSpec` json;