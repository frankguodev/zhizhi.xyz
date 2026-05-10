CREATE TABLE `admin_operation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_user_id` text,
	`admin_email` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`target_locale` text,
	`target_slug` text,
	`target_title` text,
	`details` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `admin_operation_logs_target_idx` ON `admin_operation_logs` (`target_type`,`target_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `admin_operation_logs_action_idx` ON `admin_operation_logs` (`action`,`created_at`);
