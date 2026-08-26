CREATE TABLE `Tag` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`color` varchar(191),
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Tag_id` PRIMARY KEY(`id`),
	CONSTRAINT `Tag_name_key` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `TaskDependency` (
	`id` varchar(191) NOT NULL,
	`taskId` varchar(191) NOT NULL,
	`dependsOnTaskId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `TaskDependency_id` PRIMARY KEY(`id`),
	CONSTRAINT `TaskDependency_taskId_dependsOnTaskId_key` UNIQUE(`taskId`,`dependsOnTaskId`)
);
--> statement-breakpoint
CREATE TABLE `TaskTag` (
	`id` varchar(191) NOT NULL,
	`taskId` varchar(191) NOT NULL,
	`tagId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `TaskTag_id` PRIMARY KEY(`id`),
	CONSTRAINT `TaskTag_taskId_tagId_key` UNIQUE(`taskId`,`tagId`)
);
--> statement-breakpoint
ALTER TABLE `User` ADD `avatarUrl` varchar(2048);--> statement-breakpoint
ALTER TABLE `Task` ADD `parentTaskId` varchar(191);--> statement-breakpoint
ALTER TABLE `TaskDependency` ADD CONSTRAINT `TaskDependency_taskId_Task_id_fk` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskDependency` ADD CONSTRAINT `TaskDependency_dependsOnTaskId_Task_id_fk` FOREIGN KEY (`dependsOnTaskId`) REFERENCES `Task`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskTag` ADD CONSTRAINT `TaskTag_taskId_Task_id_fk` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskTag` ADD CONSTRAINT `TaskTag_tagId_Tag_id_fk` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `TaskDependency_dependsOnTaskId_idx` ON `TaskDependency` (`dependsOnTaskId`);--> statement-breakpoint
CREATE INDEX `TaskTag_tagId_idx` ON `TaskTag` (`tagId`);--> statement-breakpoint
ALTER TABLE `Task` ADD CONSTRAINT `Task_parentTaskId_Task_id_fk` FOREIGN KEY (`parentTaskId`) REFERENCES `Task`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `Task_parentTaskId_idx` ON `Task` (`parentTaskId`);