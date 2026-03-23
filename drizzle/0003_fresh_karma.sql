CREATE TABLE `abstraction_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`providerId` int NOT NULL,
	`abstractAction` varchar(128) NOT NULL,
	`apiMethod` enum('GET','POST','PUT','PATCH','DELETE') NOT NULL,
	`apiEndpoint` varchar(512) NOT NULL,
	`requestTemplate` json,
	`responseMapping` json,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `abstraction_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_capabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`category` varchar(64) NOT NULL,
	`capability` varchar(128) NOT NULL,
	`proficiency` enum('basic','intermediate','advanced','expert') NOT NULL DEFAULT 'intermediate',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_capabilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_required_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int,
	`blueprintId` int,
	`listingId` int,
	`categoryId` int NOT NULL,
	`isRequired` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_required_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `approval_gates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`gateType` enum('spend','hire','strategy','terminate','custom') NOT NULL,
	`threshold` decimal(12,2),
	`description` text,
	`requiresApproval` boolean NOT NULL DEFAULT true,
	`autoApproveBelow` decimal(12,2),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approval_gates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int,
	`userId` int,
	`agentId` int,
	`action` varchar(128) NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`details` text,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_deployments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blueprintId` int NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`status` enum('deploying','active','paused','failed') NOT NULL DEFAULT 'deploying',
	`totalValueCreated` decimal(14,2) DEFAULT '0',
	`totalCosts` decimal(14,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blueprint_deployments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blueprint_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blueprintId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`review` text,
	`verifiedValueCreated` decimal(12,2),
	`verifiedCostEfficiency` decimal(5,2),
	`isVerified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blueprint_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blueprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorUserId` int NOT NULL,
	`sourceCompanyId` int,
	`name` varchar(128) NOT NULL,
	`tagline` varchar(256),
	`description` text,
	`category` varchar(64),
	`version` varchar(16) NOT NULL DEFAULT '1.0.0',
	`changelog` text,
	`orgStructure` json,
	`agentConfigs` json,
	`heartbeatConfigs` json,
	`okrTemplates` json,
	`budgetAllocations` json,
	`governancePolicies` json,
	`toolRequirements` json,
	`estimatedMonthlyCost` decimal(10,2),
	`agentCount` int DEFAULT 0,
	`pricingModel` enum('one_time','monthly','revenue_share','franchise') NOT NULL DEFAULT 'monthly',
	`price` decimal(10,2),
	`revenueSharePct` decimal(5,2),
	`performanceScore` decimal(5,2),
	`totalValueGenerated` decimal(14,2) DEFAULT '0',
	`totalDeployments` int DEFAULT 0,
	`avgRating` decimal(3,2) DEFAULT '0',
	`isCertified` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`endorsedBy` varchar(128),
	`endorserHandle` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blueprints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`mission` text,
	`industry` varchar(64),
	`status` enum('active','paused','archived') NOT NULL DEFAULT 'active',
	`monthlyBudget` decimal(12,2) DEFAULT '0',
	`totalRevenue` decimal(14,2) DEFAULT '0',
	`totalCosts` decimal(14,2) DEFAULT '0',
	`agentCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `context_objects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`taskId` int,
	`requestText` text NOT NULL,
	`inferredDomain` varchar(64),
	`inferredCategories` json,
	`userProfile` json,
	`liveState` json,
	`recentHistory` json,
	`inferredInsights` json,
	`suggestedParameters` json,
	`contextualizedQuestions` json,
	`status` enum('interpreting','gathering','contextualizing','ready','expired') NOT NULL DEFAULT 'interpreting',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `context_objects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`budget` decimal(12,2) DEFAULT '0',
	`headAgentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `heartbeat_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`companyId` int,
	`status` enum('success','error','skipped','throttled') NOT NULL,
	`tasksChecked` int DEFAULT 0,
	`tasksActedOn` int DEFAULT 0,
	`tokenCost` decimal(10,4) DEFAULT '0',
	`duration` int DEFAULT 0,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `heartbeat_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_chats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL DEFAULT 'user',
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_chats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`mimeType` varchar(128),
	`size` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyId` int,
	`name` varchar(128) NOT NULL,
	`goal` text,
	`color` varchar(32) NOT NULL DEFAULT '#6366f1',
	`status` enum('active','paused','completed','archived') NOT NULL DEFAULT 'active',
	`plan` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creatorUserId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`category` varchar(64),
	`description` text,
	`skillContent` text,
	`price` decimal(8,2),
	`totalInstalls` int DEFAULT 0,
	`avgRating` decimal(3,2) DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`agentId` int,
	`userId` int,
	`role` enum('agent','human','system') NOT NULL,
	`content` text NOT NULL,
	`toolCalls` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tool_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`icon` varchar(64),
	`abstractActions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tool_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `tool_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `tool_providers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`icon` varchar(64),
	`authType` enum('oauth2','api_key','webhook','none') NOT NULL DEFAULT 'oauth2',
	`oauthScopes` json,
	`baseApiUrl` varchar(512),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tool_providers_id` PRIMARY KEY(`id`),
	CONSTRAINT `tool_providers_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `tool_registry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int,
	`name` varchar(64) NOT NULL,
	`category` varchar(64),
	`description` text,
	`apiEndpoint` varchar(512),
	`costPerUse` decimal(8,4) DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`config` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tool_registry_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`providerId` int NOT NULL,
	`categoryId` int NOT NULL,
	`status` enum('connected','disconnected','error','expired') NOT NULL DEFAULT 'connected',
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`accountName` varchar(128),
	`accountId` varchar(128),
	`lastSyncAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_connections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`url` varchar(512) NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`secret` varchar(256),
	`isActive` boolean NOT NULL DEFAULT true,
	`lastTriggered` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `type` enum('ceo','cto','cmo','cfo','vp','manager','specialist','marketing','research','sales','admin','custom') NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `status` enum('idle','active','paused','error','terminated') NOT NULL DEFAULT 'idle';--> statement-breakpoint
ALTER TABLE `inbox_items` MODIFY COLUMN `type` enum('decision_required','budget_approval','task_review','alert','poo_generated','hire_approval','strategy_review','kill_switch') NOT NULL;--> statement-breakpoint
ALTER TABLE `marketplace_listings` MODIFY COLUMN `agentId` int;--> statement-breakpoint
ALTER TABLE `marketplace_listings` MODIFY COLUMN `pricingModel` enum('monthly','annual','usage','value_capture','one_time','revenue_share','franchise') NOT NULL DEFAULT 'monthly';--> statement-breakpoint
ALTER TABLE `tasks` MODIFY COLUMN `status` enum('pending','in_progress','completed','failed','awaiting_human','delegated') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `agents` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `agents` ADD `departmentId` int;--> statement-breakpoint
ALTER TABLE `agents` ADD `parentAgentId` int;--> statement-breakpoint
ALTER TABLE `agents` ADD `roleTitle` varchar(128);--> statement-breakpoint
ALTER TABLE `agents` ADD `jobDescription` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `tools` json;--> statement-breakpoint
ALTER TABLE `agents` ADD `connectorType` enum('internal','openai','anthropic','gemini','custom_api','crewai') DEFAULT 'internal' NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `connectorConfig` json;--> statement-breakpoint
ALTER TABLE `agents` ADD `heartbeatCron` varchar(64);--> statement-breakpoint
ALTER TABLE `agents` ADD `heartbeatEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` ADD `lastHeartbeat` timestamp;--> statement-breakpoint
ALTER TABLE `agents` ADD `nextHeartbeat` timestamp;--> statement-breakpoint
ALTER TABLE `agents` ADD `monthlyBudget` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `agents` ADD `budgetUsed` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `agents` ADD `budgetAlertThreshold` decimal(5,2) DEFAULT '75';--> statement-breakpoint
ALTER TABLE `agents` ADD `failoverAgentId` int;--> statement-breakpoint
ALTER TABLE `agents` ADD `totalCostIncurred` decimal(12,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `agents` ADD `orgChartX` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `agents` ADD `orgChartY` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `creator_partnerships` ADD `endorsedBlueprintId` int;--> statement-breakpoint
ALTER TABLE `decision_log` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `decision_log` ADD `optionsConsidered` json;--> statement-breakpoint
ALTER TABLE `inbox_items` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD `blueprintId` int;--> statement-breakpoint
ALTER TABLE `marketplace_listings` ADD `listingType` enum('agent','blueprint','skill') DEFAULT 'agent' NOT NULL;--> statement-breakpoint
ALTER TABLE `okrs` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `okrs` ADD `agentId` int;--> statement-breakpoint
ALTER TABLE `okrs` ADD `parentOkrId` int;--> statement-breakpoint
ALTER TABLE `okrs` ADD `level` enum('company','department','agent','task') DEFAULT 'company' NOT NULL;--> statement-breakpoint
ALTER TABLE `poo_receipts` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `poo_receipts` ADD `costIncurred` decimal(10,4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `tasks` ADD `companyId` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `parentTaskId` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `okrId` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `tokenCost` decimal(10,4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `tasks` ADD `apiCallCost` decimal(10,4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `tasks` ADD `totalCost` decimal(10,4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `tasks` ADD `delegatedFromAgentId` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `delegatedToAgentId` int;