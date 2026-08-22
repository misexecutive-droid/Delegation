CREATE TABLE `AuditLog` (
	`id` varchar(191) NOT NULL,
	`entityType` varchar(191) NOT NULL,
	`entityId` varchar(191) NOT NULL,
	`action` varchar(191) NOT NULL,
	`actorId` varchar(191) NOT NULL,
	`before` json,
	`after` json,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `AuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Category` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`departmentId` varchar(191) NOT NULL,
	`tatHours` float,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Category_id` PRIMARY KEY(`id`),
	CONSTRAINT `Category_name_key` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `CategoryAssignee` (
	`id` varchar(191) NOT NULL,
	`categoryId` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `CategoryAssignee_id` PRIMARY KEY(`id`),
	CONSTRAINT `CategoryAssignee_categoryId_userId_key` UNIQUE(`categoryId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `Department` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`storeId` varchar(191),
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Department_id` PRIMARY KEY(`id`),
	CONSTRAINT `Department_name_key` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `Event` (
	`id` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`description` text,
	`type` enum('DEADLINE','ANNOUNCEMENT','BROADCAST') NOT NULL DEFAULT 'ANNOUNCEMENT',
	`eventDate` datetime NOT NULL,
	`createdBy` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Event_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Notification` (
	`id` varchar(191) NOT NULL,
	`recipientId` varchar(191) NOT NULL,
	`type` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`message` text NOT NULL,
	`ticketId` varchar(191),
	`taskId` varchar(191),
	`checklistInstanceId` varchar(191),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Notification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `PasswordResetToken` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`tokenHash` varchar(191) NOT NULL,
	`expiresAt` datetime NOT NULL,
	`usedAt` datetime,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `PasswordResetToken_id` PRIMARY KEY(`id`),
	CONSTRAINT `PasswordResetToken_tokenHash_key` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `ProjectMember` (
	`id` varchar(191) NOT NULL,
	`projectId` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `ProjectMember_id` PRIMARY KEY(`id`),
	CONSTRAINT `ProjectMember_projectId_userId_key` UNIQUE(`projectId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `Project` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`description` text NOT NULL DEFAULT (''),
	`ownerId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Project_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `RefreshToken` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`tokenHash` varchar(191) NOT NULL,
	`expiresAt` datetime NOT NULL,
	`revokedAt` datetime,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `RefreshToken_id` PRIMARY KEY(`id`),
	CONSTRAINT `RefreshToken_tokenHash_key` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `Settings` (
	`id` varchar(191) NOT NULL,
	`defaultTatHours` float NOT NULL DEFAULT 24,
	`maxUploadSizeMb` float NOT NULL DEFAULT 5,
	`maxUploadFiles` int NOT NULL DEFAULT 10,
	`allowedImageTypes` json NOT NULL DEFAULT ('["image/jpeg","image/png","image/webp"]'),
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Store` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`code` varchar(191),
	`address` varchar(500),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Store_id` PRIMARY KEY(`id`),
	CONSTRAINT `Store_name_key` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`passwordHash` varchar(191) NOT NULL,
	`firstName` varchar(191) NOT NULL,
	`lastName` varchar(191),
	`role` enum('ADMIN','SENIOR','MANAGER','AGENT','USER','PC') NOT NULL DEFAULT 'USER',
	`departmentId` varchar(191),
	`storeId` varchar(191),
	`isActive` boolean NOT NULL DEFAULT true,
	`rank` int,
	`phone` varchar(191),
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `User_id` PRIMARY KEY(`id`),
	CONSTRAINT `User_email_key` UNIQUE(`email`),
	CONSTRAINT `User_phone_key` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `PendingTaskConversation` (
	`id` varchar(191) NOT NULL,
	`phone` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`channel` enum('whatsapp') NOT NULL DEFAULT 'whatsapp',
	`pendingSlot` enum('assignee','department','dueDate','priority') NOT NULL,
	`slotQueue` json NOT NULL DEFAULT ('[]'),
	`draftTitle` varchar(191) NOT NULL,
	`draftContext` text NOT NULL DEFAULT (''),
	`draftCategory` enum('issue','delegated_task') NOT NULL,
	`draftPriority` enum('low','medium','high') NOT NULL,
	`draftDueDate` datetime,
	`draftAssigneeId` varchar(191),
	`draftAssigneeName` varchar(191) NOT NULL DEFAULT '',
	`draftDepartmentId` varchar(191),
	`draftDepartmentName` varchar(191) NOT NULL DEFAULT '',
	`draftRawInput` text NOT NULL,
	`draftInputMode` enum('voice','text') NOT NULL,
	`draftConfidence` float,
	`draftWonBy` varchar(191),
	`expiresAt` datetime NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `PendingTaskConversation_id` PRIMARY KEY(`id`),
	CONSTRAINT `PendingTaskConversation_phone_key` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `SmartTaskConversationMessage` (
	`id` varchar(191) NOT NULL,
	`conversationId` varchar(191) NOT NULL,
	`from` enum('bot','user') NOT NULL,
	`text` text NOT NULL,
	`timestamp` datetime NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `SmartTaskConversationMessage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `SmartTaskConversation` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`status` enum('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
	`resultingTaskId` varchar(191),
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `SmartTaskConversation_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TaskAdditionalAssignee` (
	`id` varchar(191) NOT NULL,
	`taskId` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `TaskAdditionalAssignee_id` PRIMARY KEY(`id`),
	CONSTRAINT `TaskAdditionalAssignee_taskId_userId_key` UNIQUE(`taskId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `TaskAttachment` (
	`id` varchar(191) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`originalFilename` varchar(191),
	`sizeBytes` int NOT NULL,
	`mimeType` varchar(191) NOT NULL,
	`taskId` varchar(191) NOT NULL,
	`uploadedBy` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TaskAttachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TaskChecklistItem` (
	`id` varchar(191) NOT NULL,
	`label` varchar(191) NOT NULL,
	`isDone` boolean NOT NULL DEFAULT false,
	`assigneeId` varchar(191),
	`dueAt` datetime,
	`completedAt` datetime,
	`taskChecklistId` varchar(191) NOT NULL,
	`requiredImageCount` int NOT NULL DEFAULT 0,
	`maxImageCount` int,
	`requiresLivePhoto` boolean NOT NULL DEFAULT false,
	`remarks` text,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TaskChecklistItem_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TaskChecklist` (
	`id` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`taskId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TaskChecklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TaskCommentAttachment` (
	`id` varchar(191) NOT NULL,
	`commentId` varchar(191) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`originalFilename` varchar(191),
	`mimeType` varchar(191) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TaskCommentAttachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TaskComment` (
	`id` varchar(191) NOT NULL,
	`taskId` varchar(191) NOT NULL,
	`authorId` varchar(191) NOT NULL,
	`body` text NOT NULL DEFAULT (''),
	`locationLat` float,
	`locationLng` float,
	`locationLabel` varchar(191),
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TaskComment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TaskImage` (
	`id` varchar(191) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`originalFilename` varchar(191),
	`sizeBytes` int NOT NULL,
	`mimeType` varchar(191) NOT NULL,
	`captureMethod` enum('LIVE','GALLERY') NOT NULL,
	`taskChecklistItemId` varchar(191) NOT NULL,
	`uploadedBy` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TaskImage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TaskReview` (
	`id` varchar(191) NOT NULL,
	`taskId` varchar(191) NOT NULL,
	`reviewerId` varchar(191) NOT NULL,
	`decision` enum('approved','rejected') NOT NULL,
	`qualityRating` int,
	`remarks` text,
	`wasOnTime` boolean,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TaskReview_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Task` (
	`id` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`description` text,
	`status` enum('todo','in_progress','pending_verification','done') NOT NULL DEFAULT 'todo',
	`category` enum('issue','delegation') NOT NULL DEFAULT 'delegation',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`startDate` datetime,
	`dueDate` datetime,
	`reminderMinutesBefore` int,
	`reminderChannel` enum('notification','alarm','email','sms') NOT NULL DEFAULT 'notification',
	`reminderSentAt` datetime,
	`projectId` varchar(191),
	`userId` varchar(191) NOT NULL,
	`assigneeId` varchar(191),
	`departmentId` varchar(191),
	`verifiedBy` varchar(191),
	`verifiedAt` datetime,
	`verificationNote` text,
	`submittedAt` datetime,
	`submissionNote` text,
	`aiMeta` json,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Task_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Todo` (
	`id` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`text` varchar(500) NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`dueDate` datetime,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Todo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistImage` (
	`id` varchar(191) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`originalFilename` varchar(191),
	`sizeBytes` int NOT NULL,
	`mimeType` varchar(191) NOT NULL,
	`captureMethod` enum('LIVE','GALLERY') NOT NULL,
	`checklistItemId` varchar(191) NOT NULL,
	`uploadedBy` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ChecklistImage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistItem` (
	`id` varchar(191) NOT NULL,
	`label` varchar(191) NOT NULL,
	`isDone` boolean NOT NULL DEFAULT false,
	`assigneeId` varchar(191),
	`dueAt` datetime,
	`completedAt` datetime,
	`checklistId` varchar(191) NOT NULL,
	`requiredImageCount` int NOT NULL DEFAULT 0,
	`maxImageCount` int,
	`requiresLivePhoto` boolean NOT NULL DEFAULT false,
	`remarks` text,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ChecklistItem_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistTemplateItem` (
	`id` varchar(191) NOT NULL,
	`label` varchar(191) NOT NULL,
	`order` int NOT NULL DEFAULT 0,
	`requiredImageCount` int NOT NULL DEFAULT 0,
	`maxImageCount` int,
	`requiresLivePhoto` boolean NOT NULL DEFAULT false,
	`defaultAssigneeId` varchar(191),
	`templateId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ChecklistTemplateItem_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistTemplate` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`appliesTo` enum('TASK','TICKET') NOT NULL,
	`departmentId` varchar(191),
	`createdBy` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ChecklistTemplate_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Checklist` (
	`id` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`ticketId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Checklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TicketAttachment` (
	`id` varchar(191) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`originalFilename` varchar(191),
	`sizeBytes` int NOT NULL,
	`mimeType` varchar(191) NOT NULL,
	`captureMethod` enum('LIVE','GALLERY') NOT NULL DEFAULT 'GALLERY',
	`statusUpdateId` varchar(191),
	`ticketId` varchar(191) NOT NULL,
	`uploadedBy` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TicketAttachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TicketComment` (
	`id` varchar(191) NOT NULL,
	`body` text NOT NULL,
	`ticketId` varchar(191) NOT NULL,
	`authorId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TicketComment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TicketStatusUpdate` (
	`id` varchar(191) NOT NULL,
	`ticketId` varchar(191) NOT NULL,
	`changedBy` varchar(191) NOT NULL,
	`fromStatus` varchar(191) NOT NULL,
	`toStatus` enum('IN_PROGRESS','ON_HOLD','IN_REVIEW') NOT NULL,
	`remark` text NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `TicketStatusUpdate_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Ticket` (
	`id` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`description` text NOT NULL,
	`status` enum('OPEN','IN_PROGRESS','IN_REVIEW','CLOSED','ON_HOLD') NOT NULL DEFAULT 'OPEN',
	`priority` enum('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
	`assignmentMode` enum('AUTO','MANUAL') NOT NULL DEFAULT 'MANUAL',
	`tatHours` float,
	`tatDueAt` datetime,
	`isOverdue` boolean NOT NULL DEFAULT false,
	`closedAt` datetime,
	`userId` varchar(191) NOT NULL,
	`assigneeId` varchar(191),
	`storeId` varchar(191),
	`categoryId` varchar(191),
	`departmentId` varchar(191),
	`verifiedBy` varchar(191),
	`verifiedAt` datetime,
	`verificationNote` text,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Ticket_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistDefinitionAssignee` (
	`id` varchar(191) NOT NULL,
	`definitionId` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `ChecklistDefinitionAssignee_id` PRIMARY KEY(`id`),
	CONSTRAINT `ChecklistDefinitionAssignee_definitionId_userId_key` UNIQUE(`definitionId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistDefinitionItemAuditUser` (
	`id` varchar(191) NOT NULL,
	`itemId` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `ChecklistDefinitionItemAuditUser_id` PRIMARY KEY(`id`),
	CONSTRAINT `ChecklistDefinitionItemAuditUser_itemId_userId_key` UNIQUE(`itemId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistDefinitionItem` (
	`id` varchar(191) NOT NULL,
	`label` varchar(191) NOT NULL,
	`order` int NOT NULL DEFAULT 0,
	`requiredImageCount` int NOT NULL DEFAULT 0,
	`maxImageCount` int,
	`requiresLivePhoto` boolean NOT NULL DEFAULT false,
	`itemType` enum('STANDARD','AUDIT','NUMBER_ENTRY','RATING','YES_NO','PASS_FAIL','MULTIPLE_CHOICE','DROPDOWN','TEXT_BOX','DATE_TIME','GPS','SIGNATURE','DUAL_SIGNATURE','QR_SCAN','CASH_TALLY','VIDEO_UPLOAD') NOT NULL DEFAULT 'STANDARD',
	`accessories` json,
	`numberEntryUnit` varchar(191),
	`numberEntryMin` float,
	`numberEntryMax` float,
	`ratingScale` int,
	`options` json,
	`gpsTargetLat` float,
	`gpsTargetLng` float,
	`gpsRadiusMeters` float,
	`signatureLabels` json,
	`qrExpectedValue` varchar(191),
	`cashExpectedAmount` float,
	`conditionalTrigger` enum('YES','NO'),
	`conditionalActions` json,
	`definitionId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ChecklistDefinitionItem_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistDefinitionStore` (
	`id` varchar(191) NOT NULL,
	`definitionId` varchar(191) NOT NULL,
	`storeId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `ChecklistDefinitionStore_id` PRIMARY KEY(`id`),
	CONSTRAINT `ChecklistDefinitionStore_definitionId_storeId_key` UNIQUE(`definitionId`,`storeId`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistDefinition` (
	`id` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`description` text,
	`recurrence` enum('DAILY','WEEKLY','MONTHLY','QUARTERLY','YEARLY','ONE_TIME') NOT NULL,
	`startDate` datetime NOT NULL,
	`opensTime` varchar(5),
	`cutoffTime` varchar(5),
	`isActive` boolean NOT NULL DEFAULT true,
	`assigneeRoles` json,
	`proofRequired` json,
	`icon` enum('store','clock','star','check','shield','alert-triangle','hash','shield-check','calendar') NOT NULL DEFAULT 'store',
	`version` int NOT NULL DEFAULT 1,
	`createdBy` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ChecklistDefinition_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistInstanceAssignee` (
	`id` varchar(191) NOT NULL,
	`instanceId` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	CONSTRAINT `ChecklistInstanceAssignee_id` PRIMARY KEY(`id`),
	CONSTRAINT `ChecklistInstanceAssignee_instanceId_userId_key` UNIQUE(`instanceId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistInstanceImage` (
	`id` varchar(191) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`originalFilename` varchar(191),
	`sizeBytes` int NOT NULL,
	`mimeType` varchar(191) NOT NULL,
	`captureMethod` enum('LIVE','GALLERY') NOT NULL,
	`checklistInstanceItemId` varchar(191) NOT NULL,
	`uploadedBy` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ChecklistInstanceImage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistInstanceItemSubmissionAccessory` (
	`id` varchar(191) NOT NULL,
	`submissionId` varchar(191) NOT NULL,
	`name` varchar(191) NOT NULL,
	`checked` boolean NOT NULL DEFAULT false,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ChecklistInstanceItemSubmissionAccessory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistInstanceItemSubmissionImage` (
	`id` varchar(191) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`originalFilename` varchar(191),
	`sizeBytes` int NOT NULL,
	`mimeType` varchar(191) NOT NULL,
	`captureMethod` enum('LIVE','GALLERY') NOT NULL,
	`submissionId` varchar(191) NOT NULL,
	`uploadedBy` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ChecklistInstanceItemSubmissionImage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistInstanceItemSubmission` (
	`id` varchar(191) NOT NULL,
	`itemId` varchar(191) NOT NULL,
	`userId` varchar(191) NOT NULL,
	`remarks` text,
	`isDone` boolean NOT NULL DEFAULT false,
	`completedAt` datetime,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ChecklistInstanceItemSubmission_id` PRIMARY KEY(`id`),
	CONSTRAINT `ChecklistInstanceItemSubmission_itemId_userId_key` UNIQUE(`itemId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistInstanceItem` (
	`id` varchar(191) NOT NULL,
	`label` varchar(191) NOT NULL,
	`order` int NOT NULL DEFAULT 0,
	`isDone` boolean NOT NULL DEFAULT false,
	`completedAt` datetime,
	`completedBy` varchar(191),
	`requiredImageCount` int NOT NULL DEFAULT 0,
	`maxImageCount` int,
	`requiresLivePhoto` boolean NOT NULL DEFAULT false,
	`itemType` enum('STANDARD','AUDIT','NUMBER_ENTRY','RATING','YES_NO','PASS_FAIL','MULTIPLE_CHOICE','DROPDOWN','TEXT_BOX','DATE_TIME','GPS','SIGNATURE','DUAL_SIGNATURE','QR_SCAN','CASH_TALLY','VIDEO_UPLOAD') NOT NULL DEFAULT 'STANDARD',
	`accessories` json,
	`numberEntryUnit` varchar(191),
	`numberEntryMin` float,
	`numberEntryMax` float,
	`ratingScale` int,
	`numericValue` float,
	`options` json,
	`booleanAnswer` enum('YES','NO'),
	`textValue` text,
	`dateValue` datetime,
	`gpsTargetLat` float,
	`gpsTargetLng` float,
	`gpsRadiusMeters` float,
	`gpsLat` float,
	`gpsLng` float,
	`gpsAccuracy` float,
	`gpsCapturedAt` datetime,
	`signatureLabels` json,
	`signatureValue` text,
	`secondSignatureValue` text,
	`qrExpectedValue` varchar(191),
	`cashExpectedAmount` float,
	`conditionalTrigger` enum('YES','NO'),
	`conditionalActions` json,
	`conditionalReasonValue` text,
	`issueId` varchar(191),
	`instanceId` varchar(191) NOT NULL,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ChecklistInstanceItem_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ChecklistInstance` (
	`id` varchar(191) NOT NULL,
	`definitionId` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`recurrence` enum('DAILY','WEEKLY','MONTHLY','QUARTERLY','YEARLY','ONE_TIME') NOT NULL,
	`storeId` varchar(191) NOT NULL,
	`opensTime` varchar(5),
	`cutoffTime` varchar(5),
	`periodKey` varchar(191) NOT NULL,
	`periodStart` datetime NOT NULL,
	`periodEnd` datetime NOT NULL,
	`generatedAt` datetime NOT NULL,
	`verificationStatus` enum('NOT_SUBMITTED','PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'NOT_SUBMITTED',
	`verifiedBy` varchar(191),
	`verifiedAt` datetime,
	`verificationNote` text,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `ChecklistInstance_id` PRIMARY KEY(`id`),
	CONSTRAINT `ChecklistInstance_definitionId_storeId_periodKey_key` UNIQUE(`definitionId`,`storeId`,`periodKey`)
);
--> statement-breakpoint
ALTER TABLE `Category` ADD CONSTRAINT `Category_departmentId_Department_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `CategoryAssignee` ADD CONSTRAINT `CategoryAssignee_categoryId_Category_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `CategoryAssignee` ADD CONSTRAINT `CategoryAssignee_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Department` ADD CONSTRAINT `Department_storeId_Store_id_fk` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Event` ADD CONSTRAINT `Event_createdBy_User_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_recipientId_User_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ProjectMember` ADD CONSTRAINT `ProjectMember_projectId_Project_id_fk` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ProjectMember` ADD CONSTRAINT `ProjectMember_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Project` ADD CONSTRAINT `Project_ownerId_User_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `User` ADD CONSTRAINT `User_departmentId_Department_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `User` ADD CONSTRAINT `User_storeId_Store_id_fk` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `PendingTaskConversation` ADD CONSTRAINT `PendingTaskConversation_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `PendingTaskConversation` ADD CONSTRAINT `PendingTaskConversation_draftAssigneeId_User_id_fk` FOREIGN KEY (`draftAssigneeId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `PendingTaskConversation` ADD CONSTRAINT `PendingTaskConversation_draftDepartmentId_Department_id_fk` FOREIGN KEY (`draftDepartmentId`) REFERENCES `Department`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `SmartTaskConversationMessage` ADD CONSTRAINT `SmartTaskConvMsg_conversationId_fk` FOREIGN KEY (`conversationId`) REFERENCES `SmartTaskConversation`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `SmartTaskConversation` ADD CONSTRAINT `SmartTaskConversation_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `SmartTaskConversation` ADD CONSTRAINT `SmartTaskConversation_resultingTaskId_Task_id_fk` FOREIGN KEY (`resultingTaskId`) REFERENCES `Task`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskAdditionalAssignee` ADD CONSTRAINT `TaskAdditionalAssignee_taskId_Task_id_fk` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskAdditionalAssignee` ADD CONSTRAINT `TaskAdditionalAssignee_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskAttachment` ADD CONSTRAINT `TaskAttachment_taskId_Task_id_fk` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskAttachment` ADD CONSTRAINT `TaskAttachment_uploadedBy_User_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskChecklistItem` ADD CONSTRAINT `TaskChecklistItem_assigneeId_User_id_fk` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskChecklistItem` ADD CONSTRAINT `TaskChecklistItem_taskChecklistId_TaskChecklist_id_fk` FOREIGN KEY (`taskChecklistId`) REFERENCES `TaskChecklist`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskChecklist` ADD CONSTRAINT `TaskChecklist_taskId_Task_id_fk` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskCommentAttachment` ADD CONSTRAINT `TaskCommentAttachment_commentId_TaskComment_id_fk` FOREIGN KEY (`commentId`) REFERENCES `TaskComment`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskComment` ADD CONSTRAINT `TaskComment_taskId_Task_id_fk` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskComment` ADD CONSTRAINT `TaskComment_authorId_User_id_fk` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskImage` ADD CONSTRAINT `TaskImage_taskChecklistItemId_TaskChecklistItem_id_fk` FOREIGN KEY (`taskChecklistItemId`) REFERENCES `TaskChecklistItem`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskImage` ADD CONSTRAINT `TaskImage_uploadedBy_User_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskReview` ADD CONSTRAINT `TaskReview_taskId_Task_id_fk` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TaskReview` ADD CONSTRAINT `TaskReview_reviewerId_User_id_fk` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Task` ADD CONSTRAINT `Task_projectId_Project_id_fk` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Task` ADD CONSTRAINT `Task_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Task` ADD CONSTRAINT `Task_assigneeId_User_id_fk` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Task` ADD CONSTRAINT `Task_departmentId_Department_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Task` ADD CONSTRAINT `Task_verifiedBy_User_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Todo` ADD CONSTRAINT `Todo_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistImage` ADD CONSTRAINT `ChecklistImage_checklistItemId_ChecklistItem_id_fk` FOREIGN KEY (`checklistItemId`) REFERENCES `ChecklistItem`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistImage` ADD CONSTRAINT `ChecklistImage_uploadedBy_User_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistItem` ADD CONSTRAINT `ChecklistItem_assigneeId_User_id_fk` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistItem` ADD CONSTRAINT `ChecklistItem_checklistId_Checklist_id_fk` FOREIGN KEY (`checklistId`) REFERENCES `Checklist`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistTemplateItem` ADD CONSTRAINT `ChecklistTemplateItem_defaultAssigneeId_User_id_fk` FOREIGN KEY (`defaultAssigneeId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistTemplateItem` ADD CONSTRAINT `ChecklistTemplateItem_templateId_ChecklistTemplate_id_fk` FOREIGN KEY (`templateId`) REFERENCES `ChecklistTemplate`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistTemplate` ADD CONSTRAINT `ChecklistTemplate_departmentId_Department_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistTemplate` ADD CONSTRAINT `ChecklistTemplate_createdBy_User_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Checklist` ADD CONSTRAINT `Checklist_ticketId_Ticket_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TicketAttachment` ADD CONSTRAINT `TicketAttachment_statusUpdateId_TicketStatusUpdate_id_fk` FOREIGN KEY (`statusUpdateId`) REFERENCES `TicketStatusUpdate`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TicketAttachment` ADD CONSTRAINT `TicketAttachment_ticketId_Ticket_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TicketAttachment` ADD CONSTRAINT `TicketAttachment_uploadedBy_User_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TicketComment` ADD CONSTRAINT `TicketComment_ticketId_Ticket_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TicketComment` ADD CONSTRAINT `TicketComment_authorId_User_id_fk` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TicketStatusUpdate` ADD CONSTRAINT `TicketStatusUpdate_ticketId_Ticket_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `TicketStatusUpdate` ADD CONSTRAINT `TicketStatusUpdate_changedBy_User_id_fk` FOREIGN KEY (`changedBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_assigneeId_User_id_fk` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_storeId_Store_id_fk` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_categoryId_Category_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_departmentId_Department_id_fk` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_verifiedBy_User_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistDefinitionAssignee` ADD CONSTRAINT `ChecklistDefinitionAssignee_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistDefinitionAssignee` ADD CONSTRAINT `ChklistDefAssignee_definitionId_fk` FOREIGN KEY (`definitionId`) REFERENCES `ChecklistDefinition`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistDefinitionItemAuditUser` ADD CONSTRAINT `ChecklistDefinitionItemAuditUser_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistDefinitionItemAuditUser` ADD CONSTRAINT `ChklistDefItemAuditUser_itemId_fk` FOREIGN KEY (`itemId`) REFERENCES `ChecklistDefinitionItem`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistDefinitionItem` ADD CONSTRAINT `ChecklistDefinitionItem_definitionId_ChecklistDefinition_id_fk` FOREIGN KEY (`definitionId`) REFERENCES `ChecklistDefinition`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistDefinitionStore` ADD CONSTRAINT `ChecklistDefinitionStore_definitionId_ChecklistDefinition_id_fk` FOREIGN KEY (`definitionId`) REFERENCES `ChecklistDefinition`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistDefinitionStore` ADD CONSTRAINT `ChecklistDefinitionStore_storeId_Store_id_fk` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistDefinition` ADD CONSTRAINT `ChecklistDefinition_createdBy_User_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstanceAssignee` ADD CONSTRAINT `ChecklistInstanceAssignee_instanceId_ChecklistInstance_id_fk` FOREIGN KEY (`instanceId`) REFERENCES `ChecklistInstance`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstanceAssignee` ADD CONSTRAINT `ChecklistInstanceAssignee_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstanceImage` ADD CONSTRAINT `ChecklistInstanceImage_uploadedBy_User_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstanceImage` ADD CONSTRAINT `ChklistInstImage_instItemId_fk` FOREIGN KEY (`checklistInstanceItemId`) REFERENCES `ChecklistInstanceItem`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstanceItemSubmissionAccessory` ADD CONSTRAINT `ChklistInstItemSubAccessory_subId_fk` FOREIGN KEY (`submissionId`) REFERENCES `ChecklistInstanceItemSubmission`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstanceItemSubmissionImage` ADD CONSTRAINT `ChecklistInstanceItemSubmissionImage_uploadedBy_User_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstanceItemSubmissionImage` ADD CONSTRAINT `ChklistInstItemSubImage_subId_fk` FOREIGN KEY (`submissionId`) REFERENCES `ChecklistInstanceItemSubmission`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstanceItemSubmission` ADD CONSTRAINT `ChecklistInstanceItemSubmission_userId_User_id_fk` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstanceItemSubmission` ADD CONSTRAINT `ChklistInstItemSubmission_itemId_fk` FOREIGN KEY (`itemId`) REFERENCES `ChecklistInstanceItem`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstanceItem` ADD CONSTRAINT `ChecklistInstanceItem_completedBy_User_id_fk` FOREIGN KEY (`completedBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstanceItem` ADD CONSTRAINT `ChecklistInstanceItem_issueId_Ticket_id_fk` FOREIGN KEY (`issueId`) REFERENCES `Ticket`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstanceItem` ADD CONSTRAINT `ChecklistInstanceItem_instanceId_ChecklistInstance_id_fk` FOREIGN KEY (`instanceId`) REFERENCES `ChecklistInstance`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstance` ADD CONSTRAINT `ChecklistInstance_definitionId_ChecklistDefinition_id_fk` FOREIGN KEY (`definitionId`) REFERENCES `ChecklistDefinition`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstance` ADD CONSTRAINT `ChecklistInstance_storeId_Store_id_fk` FOREIGN KEY (`storeId`) REFERENCES `Store`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ChecklistInstance` ADD CONSTRAINT `ChecklistInstance_verifiedBy_User_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `User`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `AuditLog_entityType_entityId_idx` ON `AuditLog` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `Notification_recipientId_idx` ON `Notification` (`recipientId`);--> statement-breakpoint
CREATE INDEX `PasswordResetToken_userId_idx` ON `PasswordResetToken` (`userId`);--> statement-breakpoint
CREATE INDEX `RefreshToken_userId_idx` ON `RefreshToken` (`userId`);--> statement-breakpoint
CREATE INDEX `PendingTaskConversation_expiresAt_idx` ON `PendingTaskConversation` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `SmartTaskConversationMessage_conversationId_timestamp_idx` ON `SmartTaskConversationMessage` (`conversationId`,`timestamp`);--> statement-breakpoint
CREATE INDEX `SmartTaskConversation_userId_createdAt_idx` ON `SmartTaskConversation` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `TaskAdditionalAssignee_userId_idx` ON `TaskAdditionalAssignee` (`userId`);--> statement-breakpoint
CREATE INDEX `TaskAttachment_taskId_idx` ON `TaskAttachment` (`taskId`);--> statement-breakpoint
CREATE INDEX `TaskChecklistItem_taskChecklistId_idx` ON `TaskChecklistItem` (`taskChecklistId`);--> statement-breakpoint
CREATE INDEX `TaskCommentAttachment_commentId_idx` ON `TaskCommentAttachment` (`commentId`);--> statement-breakpoint
CREATE INDEX `TaskComment_taskId_createdAt_idx` ON `TaskComment` (`taskId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `TaskImage_taskChecklistItemId_idx` ON `TaskImage` (`taskChecklistItemId`);--> statement-breakpoint
CREATE INDEX `TaskReview_taskId_createdAt_idx` ON `TaskReview` (`taskId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `TaskReview_reviewerId_createdAt_idx` ON `TaskReview` (`reviewerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Task_userId_createdAt_idx` ON `Task` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Task_assigneeId_createdAt_idx` ON `Task` (`assigneeId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Task_departmentId_createdAt_idx` ON `Task` (`departmentId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Task_status_createdAt_idx` ON `Task` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Task_category_status_createdAt_idx` ON `Task` (`category`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ChecklistImage_checklistItemId_idx` ON `ChecklistImage` (`checklistItemId`);--> statement-breakpoint
CREATE INDEX `ChecklistItem_checklistId_idx` ON `ChecklistItem` (`checklistId`);--> statement-breakpoint
CREATE INDEX `ChecklistTemplateItem_templateId_idx` ON `ChecklistTemplateItem` (`templateId`);--> statement-breakpoint
CREATE INDEX `TicketAttachment_statusUpdateId_idx` ON `TicketAttachment` (`statusUpdateId`);--> statement-breakpoint
CREATE INDEX `TicketAttachment_ticketId_idx` ON `TicketAttachment` (`ticketId`);--> statement-breakpoint
CREATE INDEX `TicketComment_ticketId_idx` ON `TicketComment` (`ticketId`);--> statement-breakpoint
CREATE INDEX `TicketStatusUpdate_ticketId_idx` ON `TicketStatusUpdate` (`ticketId`);--> statement-breakpoint
CREATE INDEX `Ticket_userId_createdAt_idx` ON `Ticket` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Ticket_assigneeId_createdAt_idx` ON `Ticket` (`assigneeId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Ticket_departmentId_createdAt_idx` ON `Ticket` (`departmentId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Ticket_status_createdAt_idx` ON `Ticket` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ChecklistDefinitionItem_definitionId_idx` ON `ChecklistDefinitionItem` (`definitionId`);--> statement-breakpoint
CREATE INDEX `ChecklistInstanceAssignee_userId_idx` ON `ChecklistInstanceAssignee` (`userId`);--> statement-breakpoint
CREATE INDEX `ChecklistInstanceImage_checklistInstanceItemId_idx` ON `ChecklistInstanceImage` (`checklistInstanceItemId`);--> statement-breakpoint
CREATE INDEX `ChecklistInstanceItemSubmissionAccessory_submissionId_idx` ON `ChecklistInstanceItemSubmissionAccessory` (`submissionId`);--> statement-breakpoint
CREATE INDEX `ChecklistInstanceItemSubmissionImage_submissionId_idx` ON `ChecklistInstanceItemSubmissionImage` (`submissionId`);--> statement-breakpoint
CREATE INDEX `ChecklistInstanceItem_instanceId_idx` ON `ChecklistInstanceItem` (`instanceId`);--> statement-breakpoint
CREATE INDEX `ChecklistInstance_periodStart_idx` ON `ChecklistInstance` (`periodStart`);