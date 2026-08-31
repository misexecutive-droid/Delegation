ALTER TABLE `ChecklistInstanceItem` ADD `remarks` text;--> statement-breakpoint
ALTER TABLE `ChecklistInstance` ADD `rejectionCount` int DEFAULT 0 NOT NULL;