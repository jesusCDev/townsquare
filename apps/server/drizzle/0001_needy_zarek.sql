CREATE TABLE `countdowns` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`target_date` text NOT NULL,
	`icon` text,
	`color` text DEFAULT '#67fe99',
	`position` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `countdowns_position_idx` ON `countdowns` (`position`);--> statement-breakpoint
CREATE INDEX `countdowns_active_idx` ON `countdowns` (`is_active`);