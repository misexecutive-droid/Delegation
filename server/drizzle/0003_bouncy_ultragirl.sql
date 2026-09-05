CREATE TABLE `TaskStatusUpdate` (
	`id` varchar(191) NOT NULL,
	`taskId` varchar(191) NOT NULL,
	`changedBy` varchar(191) NOT NULL,
	`fromStatus` enum('todo','in_progress','pending_verification','done') NOT NULL,
	`toStatus` enum('todo','in_progress','pending_verification','done') NOT NULL,
	`remark` text NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TaskStatusUpdate_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `TaskStatusUpdate` ADD CONSTRAINT `TaskStatusUpdate_taskId_Task_id_fk` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskStatusUpdate` ADD CONSTRAINT `TaskStatusUpdate_changedBy_User_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `TaskStatusUpdate_taskId_createdAt_idx` ON `TaskStatusUpdate` (`taskId`,`createdAt`);