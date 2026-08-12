CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`action` text NOT NULL,
	`hypothesis` text,
	`started_at` text NOT NULL,
	`ended_at` text,
	`outcome` text DEFAULT 'pending' NOT NULL,
	`outcome_notes` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`memory_synced` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `brief_cache` (
	`incident_id` text PRIMARY KEY NOT NULL,
	`generated_at` text NOT NULL,
	`json` text NOT NULL,
	`source` text DEFAULT 'live' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `engineers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`role` text DEFAULT 'On-call engineer' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`title` text NOT NULL,
	`service_id` text NOT NULL,
	`severity` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`summary` text NOT NULL,
	`symptoms` text NOT NULL,
	`alerts` text NOT NULL,
	`deploy_context` text,
	`error_rate_start` real,
	`error_rate_peak` real,
	`error_rate_current` real,
	`p95_latency_ms` integer,
	`db_connections_used` integer,
	`db_connections_limit` integer,
	`assigned_engineer_id` text,
	`started_at` text NOT NULL,
	`resolved_at` text,
	`is_hero` integer DEFAULT false NOT NULL,
	`demo_order` integer DEFAULT 999 NOT NULL,
	`pattern_tag` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_engineer_id`) REFERENCES `engineers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `incidents_key_unique` ON `incidents` (`key`);--> statement-breakpoint
CREATE TABLE `metric_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`timestamp` text NOT NULL,
	`error_rate` real NOT NULL,
	`p95_latency_ms` integer NOT NULL,
	`db_connections` integer,
	`cpu_percent` real,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `resolutions` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`root_cause` text NOT NULL,
	`fix_summary` text NOT NULL,
	`lessons_learned` text,
	`time_to_resolution_min` integer,
	`memory_synced` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resolutions_incident_id_unique` ON `resolutions` (`incident_id`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`tier` text DEFAULT 'tier-1' NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `services_slug_unique` ON `services` (`slug`);--> statement-breakpoint
CREATE TABLE `timeline_events` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`timestamp` text NOT NULL,
	`type` text NOT NULL,
	`author` text NOT NULL,
	`content` text NOT NULL,
	`attempt_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action
);
