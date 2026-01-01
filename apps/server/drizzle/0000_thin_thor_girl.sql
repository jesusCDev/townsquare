CREATE TABLE `backups` (
	`id` text PRIMARY KEY NOT NULL,
	`app_name` text NOT NULL,
	`filename` text NOT NULL,
	`original_name` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`mime_type` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `habit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`habit_id` text NOT NULL,
	`date` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`completed_at` text NOT NULL,
	`source` text DEFAULT 'manual',
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`color` text DEFAULT '#3b82f6',
	`target_count` integer DEFAULT 1 NOT NULL,
	`timed_windows` text,
	`position` integer DEFAULT 0 NOT NULL,
	`is_archived` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `reminder_history` (
	`id` text PRIMARY KEY NOT NULL,
	`reminder_id` text NOT NULL,
	`triggered_at` text NOT NULL,
	`dismissed_at` text,
	`action` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`reminder_id`) REFERENCES `reminders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`time` text NOT NULL,
	`days_mask` integer DEFAULT 127 NOT NULL,
	`warn_minutes` integer DEFAULT 3 NOT NULL,
	`mode` text DEFAULT 'overlay' NOT NULL,
	`sound` text,
	`is_active` integer DEFAULT true,
	`source` text DEFAULT 'manual',
	`external_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `schedule_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#3b82f6' NOT NULL,
	`icon` text,
	`start_time` text NOT NULL,
	`end_time` text,
	`days_mask` integer DEFAULT 127 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`type` text DEFAULT 'string' NOT NULL,
	`description` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `whoop_auth` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`expires_at` text,
	`user_id` text,
	`scopes` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `whoop_data` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`recovery_score` real,
	`recovery_state` text,
	`strain_score` real,
	`sleep_hours` real,
	`sleep_efficiency` real,
	`sleep_stages` text,
	`hrv` integer,
	`rhr` integer,
	`respiratory_rate` real,
	`skin_temp` real,
	`spo2` real,
	`data_date` text,
	`raw_data` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `backups_app_name_idx` ON `backups` (`app_name`);--> statement-breakpoint
CREATE INDEX `backups_created_idx` ON `backups` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `habit_entries_habit_date_idx` ON `habit_entries` (`habit_id`,`date`);--> statement-breakpoint
CREATE INDEX `habit_entries_date_idx` ON `habit_entries` (`date`);--> statement-breakpoint
CREATE INDEX `habits_position_idx` ON `habits` (`position`);--> statement-breakpoint
CREATE INDEX `habits_archived_idx` ON `habits` (`is_archived`);--> statement-breakpoint
CREATE INDEX `reminder_history_reminder_idx` ON `reminder_history` (`reminder_id`);--> statement-breakpoint
CREATE INDEX `reminder_history_triggered_idx` ON `reminder_history` (`triggered_at`);--> statement-breakpoint
CREATE INDEX `reminders_active_idx` ON `reminders` (`is_active`);--> statement-breakpoint
CREATE INDEX `reminders_source_idx` ON `reminders` (`source`);--> statement-breakpoint
CREATE INDEX `reminders_external_idx` ON `reminders` (`external_id`);--> statement-breakpoint
CREATE INDEX `schedule_position_idx` ON `schedule_blocks` (`position`);--> statement-breakpoint
CREATE INDEX `schedule_active_idx` ON `schedule_blocks` (`is_active`);