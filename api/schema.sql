-- ==========================================================
-- TaskMatrix - Complete MySQL Database Schema for cPanel / BigRock
-- Generated for tasks.vjsconnect.com
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------
-- Table: Store
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `Store`;
CREATE TABLE `Store` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) DEFAULT NULL,
    `address` VARCHAR(500) DEFAULT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `Store_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: Department
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `Department`;
CREATE TABLE `Department` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `storeId` VARCHAR(191) DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `Department_name_key` (`name`),
    KEY `Department_storeId_fk` (`storeId`),
    CONSTRAINT `Department_storeId_fk` FOREIGN KEY (`storeId`) REFERENCES `Store` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: User
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `User`;
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) DEFAULT NULL,
    `role` ENUM('ADMIN', 'SENIOR', 'MANAGER', 'AGENT', 'USER', 'PC') NOT NULL DEFAULT 'USER',
    `departmentId` VARCHAR(191) DEFAULT NULL,
    `storeId` VARCHAR(191) DEFAULT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `rank` INT DEFAULT 6,
    `phone` VARCHAR(191) DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `User_email_key` (`email`),
    UNIQUE KEY `User_phone_key` (`phone`),
    KEY `User_departmentId_fk` (`departmentId`),
    KEY `User_storeId_fk` (`storeId`),
    CONSTRAINT `User_departmentId_fk` FOREIGN KEY (`departmentId`) REFERENCES `Department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `User_storeId_fk` FOREIGN KEY (`storeId`) REFERENCES `Store` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: RefreshToken
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `RefreshToken`;
CREATE TABLE `RefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME NOT NULL,
    `revokedAt` DATETIME DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `RefreshToken_tokenHash_key` (`tokenHash`),
    KEY `RefreshToken_userId_idx` (`userId`),
    CONSTRAINT `RefreshToken_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: PasswordResetToken
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `PasswordResetToken`;
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME NOT NULL,
    `usedAt` DATETIME DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `PasswordResetToken_tokenHash_key` (`tokenHash`),
    KEY `PasswordResetToken_userId_idx` (`userId`),
    CONSTRAINT `PasswordResetToken_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: Category
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `Category`;
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `departmentId` VARCHAR(191) NOT NULL,
    `tatHours` FLOAT DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `Category_name_key` (`name`),
    KEY `Category_departmentId_fk` (`departmentId`),
    CONSTRAINT `Category_departmentId_fk` FOREIGN KEY (`departmentId`) REFERENCES `Department` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: CategoryAssignee
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `CategoryAssignee`;
CREATE TABLE `CategoryAssignee` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `CategoryAssignee_cat_user_key` (`categoryId`, `userId`),
    KEY `CategoryAssignee_userId_fk` (`userId`),
    CONSTRAINT `CategoryAssignee_categoryId_fk` FOREIGN KEY (`categoryId`) REFERENCES `Category` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `CategoryAssignee_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: Project
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `Project`;
CREATE TABLE `Project` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT,
    `ownerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `Project_ownerId_fk` (`ownerId`),
    CONSTRAINT `Project_ownerId_fk` FOREIGN KEY (`ownerId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ProjectMember
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ProjectMember`;
CREATE TABLE `ProjectMember` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ProjectMember_proj_user_key` (`projectId`, `userId`),
    KEY `ProjectMember_userId_fk` (`userId`),
    CONSTRAINT `ProjectMember_projectId_fk` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ProjectMember_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: Task
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `Task`;
CREATE TABLE `Task` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `status` ENUM('todo', 'in_progress', 'pending_verification', 'done') NOT NULL DEFAULT 'todo',
    `category` ENUM('issue', 'delegation') NOT NULL DEFAULT 'delegation',
    `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    `startDate` DATETIME DEFAULT NULL,
    `dueDate` DATETIME DEFAULT NULL,
    `reminderMinutesBefore` INT DEFAULT NULL,
    `reminderChannel` ENUM('notification', 'alarm', 'email', 'sms') NOT NULL DEFAULT 'notification',
    `reminderSentAt` DATETIME DEFAULT NULL,
    `projectId` VARCHAR(191) DEFAULT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `assigneeId` VARCHAR(191) DEFAULT NULL,
    `departmentId` VARCHAR(191) DEFAULT NULL,
    `verifiedBy` VARCHAR(191) DEFAULT NULL,
    `verifiedAt` DATETIME DEFAULT NULL,
    `verificationNote` TEXT DEFAULT NULL,
    `submittedAt` DATETIME DEFAULT NULL,
    `submissionNote` TEXT DEFAULT NULL,
    `aiMeta` JSON DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `Task_userId_createdAt_idx` (`userId`, `createdAt`),
    KEY `Task_assigneeId_createdAt_idx` (`assigneeId`, `createdAt`),
    KEY `Task_departmentId_createdAt_idx` (`departmentId`, `createdAt`),
    KEY `Task_status_createdAt_idx` (`status`, `createdAt`),
    KEY `Task_category_status_createdAt_idx` (`category`, `status`, `createdAt`),
    KEY `Task_projectId_fk` (`projectId`),
    KEY `Task_verifiedBy_fk` (`verifiedBy`),
    CONSTRAINT `Task_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `Task_assigneeId_fk` FOREIGN KEY (`assigneeId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `Task_departmentId_fk` FOREIGN KEY (`departmentId`) REFERENCES `Department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `Task_projectId_fk` FOREIGN KEY (`projectId`) REFERENCES `Project` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `Task_verifiedBy_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: TaskAdditionalAssignee
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `TaskAdditionalAssignee`;
CREATE TABLE `TaskAdditionalAssignee` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `TaskAdditionalAssignee_task_user_key` (`taskId`, `userId`),
    KEY `TaskAdditionalAssignee_userId_idx` (`userId`),
    CONSTRAINT `TaskAdditionalAssignee_taskId_fk` FOREIGN KEY (`taskId`) REFERENCES `Task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TaskAdditionalAssignee_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: TaskAttachment
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `TaskAttachment`;
CREATE TABLE `TaskAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `originalFilename` VARCHAR(191) DEFAULT NULL,
    `sizeBytes` INT NOT NULL DEFAULT 0,
    `mimeType` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `TaskAttachment_taskId_idx` (`taskId`),
    KEY `TaskAttachment_uploadedBy_fk` (`uploadedBy`),
    CONSTRAINT `TaskAttachment_taskId_fk` FOREIGN KEY (`taskId`) REFERENCES `Task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TaskAttachment_uploadedBy_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: TaskChecklist
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `TaskChecklist`;
CREATE TABLE `TaskChecklist` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `TaskChecklist_taskId_fk` (`taskId`),
    CONSTRAINT `TaskChecklist_taskId_fk` FOREIGN KEY (`taskId`) REFERENCES `Task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: TaskChecklistItem
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `TaskChecklistItem`;
CREATE TABLE `TaskChecklistItem` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `isDone` TINYINT(1) NOT NULL DEFAULT 0,
    `assigneeId` VARCHAR(191) DEFAULT NULL,
    `dueAt` DATETIME DEFAULT NULL,
    `completedAt` DATETIME DEFAULT NULL,
    `taskChecklistId` VARCHAR(191) NOT NULL,
    `requiredImageCount` INT NOT NULL DEFAULT 0,
    `maxImageCount` INT DEFAULT NULL,
    `requiresLivePhoto` TINYINT(1) NOT NULL DEFAULT 0,
    `remarks` TEXT DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `TaskChecklistItem_taskChecklistId_idx` (`taskChecklistId`),
    KEY `TaskChecklistItem_assigneeId_fk` (`assigneeId`),
    CONSTRAINT `TaskChecklistItem_taskChecklistId_fk` FOREIGN KEY (`taskChecklistId`) REFERENCES `TaskChecklist` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TaskChecklistItem_assigneeId_fk` FOREIGN KEY (`assigneeId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: TaskImage
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `TaskImage`;
CREATE TABLE `TaskImage` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `originalFilename` VARCHAR(191) DEFAULT NULL,
    `sizeBytes` INT NOT NULL DEFAULT 0,
    `mimeType` VARCHAR(191) NOT NULL,
    `captureMethod` ENUM('LIVE', 'GALLERY') NOT NULL DEFAULT 'GALLERY',
    `taskChecklistItemId` VARCHAR(191) NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `TaskImage_taskChecklistItemId_idx` (`taskChecklistItemId`),
    KEY `TaskImage_uploadedBy_fk` (`uploadedBy`),
    CONSTRAINT `TaskImage_taskChecklistItemId_fk` FOREIGN KEY (`taskChecklistItemId`) REFERENCES `TaskChecklistItem` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TaskImage_uploadedBy_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: TaskComment
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `TaskComment`;
CREATE TABLE `TaskComment` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `locationLat` FLOAT DEFAULT NULL,
    `locationLng` FLOAT DEFAULT NULL,
    `locationLabel` VARCHAR(191) DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `TaskComment_taskId_createdAt_idx` (`taskId`, `createdAt`),
    KEY `TaskComment_authorId_fk` (`authorId`),
    CONSTRAINT `TaskComment_taskId_fk` FOREIGN KEY (`taskId`) REFERENCES `Task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TaskComment_authorId_fk` FOREIGN KEY (`authorId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: TaskCommentAttachment
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `TaskCommentAttachment`;
CREATE TABLE `TaskCommentAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `commentId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `originalFilename` VARCHAR(191) DEFAULT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INT NOT NULL DEFAULT 0,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `TaskCommentAttachment_commentId_idx` (`commentId`),
    CONSTRAINT `TaskCommentAttachment_commentId_fk` FOREIGN KEY (`commentId`) REFERENCES `TaskComment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: TaskReview
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `TaskReview`;
CREATE TABLE `TaskReview` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `reviewerId` VARCHAR(191) NOT NULL,
    `decision` ENUM('approved', 'rejected') NOT NULL,
    `qualityRating` INT DEFAULT NULL,
    `remarks` TEXT DEFAULT NULL,
    `wasOnTime` TINYINT(1) DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `TaskReview_taskId_createdAt_idx` (`taskId`, `createdAt`),
    KEY `TaskReview_reviewerId_createdAt_idx` (`reviewerId`, `createdAt`),
    CONSTRAINT `TaskReview_taskId_fk` FOREIGN KEY (`taskId`) REFERENCES `Task` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TaskReview_reviewerId_fk` FOREIGN KEY (`reviewerId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: Ticket
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `Ticket`;
CREATE TABLE `Ticket` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'CLOSED', 'ON_HOLD') NOT NULL DEFAULT 'OPEN',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `assignmentMode` ENUM('AUTO', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
    `tatHours` FLOAT DEFAULT NULL,
    `tatDueAt` DATETIME DEFAULT NULL,
    `isOverdue` TINYINT(1) NOT NULL DEFAULT 0,
    `closedAt` DATETIME DEFAULT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `assigneeId` VARCHAR(191) DEFAULT NULL,
    `storeId` VARCHAR(191) DEFAULT NULL,
    `categoryId` VARCHAR(191) DEFAULT NULL,
    `departmentId` VARCHAR(191) DEFAULT NULL,
    `verifiedBy` VARCHAR(191) DEFAULT NULL,
    `verifiedAt` DATETIME DEFAULT NULL,
    `verificationNote` TEXT DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `Ticket_userId_createdAt_idx` (`userId`, `createdAt`),
    KEY `Ticket_assigneeId_createdAt_idx` (`assigneeId`, `createdAt`),
    KEY `Ticket_departmentId_createdAt_idx` (`departmentId`, `createdAt`),
    KEY `Ticket_status_createdAt_idx` (`status`, `createdAt`),
    KEY `Ticket_storeId_fk` (`storeId`),
    KEY `Ticket_categoryId_fk` (`categoryId`),
    KEY `Ticket_verifiedBy_fk` (`verifiedBy`),
    CONSTRAINT `Ticket_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `Ticket_assigneeId_fk` FOREIGN KEY (`assigneeId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `Ticket_storeId_fk` FOREIGN KEY (`storeId`) REFERENCES `Store` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `Ticket_categoryId_fk` FOREIGN KEY (`categoryId`) REFERENCES `Category` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `Ticket_departmentId_fk` FOREIGN KEY (`departmentId`) REFERENCES `Department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `Ticket_verifiedBy_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: TicketStatusUpdate
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `TicketStatusUpdate`;
CREATE TABLE `TicketStatusUpdate` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `changedBy` VARCHAR(191) NOT NULL,
    `fromStatus` VARCHAR(191) NOT NULL,
    `toStatus` ENUM('IN_PROGRESS', 'ON_HOLD', 'IN_REVIEW') NOT NULL,
    `remark` TEXT NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `TicketStatusUpdate_ticketId_idx` (`ticketId`),
    KEY `TicketStatusUpdate_changedBy_fk` (`changedBy`),
    CONSTRAINT `TicketStatusUpdate_ticketId_fk` FOREIGN KEY (`ticketId`) REFERENCES `Ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TicketStatusUpdate_changedBy_fk` FOREIGN KEY (`changedBy`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: TicketAttachment
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `TicketAttachment`;
CREATE TABLE `TicketAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `originalFilename` VARCHAR(191) DEFAULT NULL,
    `sizeBytes` INT NOT NULL DEFAULT 0,
    `mimeType` VARCHAR(191) NOT NULL,
    `captureMethod` ENUM('LIVE', 'GALLERY') NOT NULL DEFAULT 'GALLERY',
    `statusUpdateId` VARCHAR(191) DEFAULT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `TicketAttachment_statusUpdateId_idx` (`statusUpdateId`),
    KEY `TicketAttachment_ticketId_idx` (`ticketId`),
    KEY `TicketAttachment_uploadedBy_fk` (`uploadedBy`),
    CONSTRAINT `TicketAttachment_ticketId_fk` FOREIGN KEY (`ticketId`) REFERENCES `Ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TicketAttachment_statusUpdateId_fk` FOREIGN KEY (`statusUpdateId`) REFERENCES `TicketStatusUpdate` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TicketAttachment_uploadedBy_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: TicketComment
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `TicketComment`;
CREATE TABLE `TicketComment` (
    `id` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `TicketComment_ticketId_idx` (`ticketId`),
    KEY `TicketComment_authorId_fk` (`authorId`),
    CONSTRAINT `TicketComment_ticketId_fk` FOREIGN KEY (`ticketId`) REFERENCES `Ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `TicketComment_authorId_fk` FOREIGN KEY (`authorId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: Checklist
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `Checklist`;
CREATE TABLE `Checklist` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `Checklist_ticketId_fk` (`ticketId`),
    CONSTRAINT `Checklist_ticketId_fk` FOREIGN KEY (`ticketId`) REFERENCES `Ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistItem
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistItem`;
CREATE TABLE `ChecklistItem` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `isDone` TINYINT(1) NOT NULL DEFAULT 0,
    `assigneeId` VARCHAR(191) DEFAULT NULL,
    `dueAt` DATETIME DEFAULT NULL,
    `completedAt` DATETIME DEFAULT NULL,
    `checklistId` VARCHAR(191) NOT NULL,
    `requiredImageCount` INT NOT NULL DEFAULT 0,
    `maxImageCount` INT DEFAULT NULL,
    `requiresLivePhoto` TINYINT(1) NOT NULL DEFAULT 0,
    `remarks` TEXT DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ChecklistItem_checklistId_idx` (`checklistId`),
    KEY `ChecklistItem_assigneeId_fk` (`assigneeId`),
    CONSTRAINT `ChecklistItem_checklistId_fk` FOREIGN KEY (`checklistId`) REFERENCES `Checklist` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChecklistItem_assigneeId_fk` FOREIGN KEY (`assigneeId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistImage
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistImage`;
CREATE TABLE `ChecklistImage` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `originalFilename` VARCHAR(191) DEFAULT NULL,
    `sizeBytes` INT NOT NULL DEFAULT 0,
    `mimeType` VARCHAR(191) NOT NULL,
    `captureMethod` ENUM('LIVE', 'GALLERY') NOT NULL DEFAULT 'GALLERY',
    `checklistItemId` VARCHAR(191) NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ChecklistImage_checklistItemId_idx` (`checklistItemId`),
    KEY `ChecklistImage_uploadedBy_fk` (`uploadedBy`),
    CONSTRAINT `ChecklistImage_checklistItemId_fk` FOREIGN KEY (`checklistItemId`) REFERENCES `ChecklistItem` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChecklistImage_uploadedBy_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistTemplate
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistTemplate`;
CREATE TABLE `ChecklistTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `appliesTo` ENUM('TASK', 'TICKET') NOT NULL,
    `departmentId` VARCHAR(191) DEFAULT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ChecklistTemplate_departmentId_fk` (`departmentId`),
    KEY `ChecklistTemplate_createdBy_fk` (`createdBy`),
    CONSTRAINT `ChecklistTemplate_departmentId_fk` FOREIGN KEY (`departmentId`) REFERENCES `Department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `ChecklistTemplate_createdBy_fk` FOREIGN KEY (`createdBy`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistTemplateItem
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistTemplateItem`;
CREATE TABLE `ChecklistTemplateItem` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `order` INT NOT NULL DEFAULT 0,
    `requiredImageCount` INT NOT NULL DEFAULT 0,
    `maxImageCount` INT DEFAULT NULL,
    `requiresLivePhoto` TINYINT(1) NOT NULL DEFAULT 0,
    `defaultAssigneeId` VARCHAR(191) DEFAULT NULL,
    `templateId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ChecklistTemplateItem_templateId_idx` (`templateId`),
    KEY `ChecklistTemplateItem_defaultAssigneeId_fk` (`defaultAssigneeId`),
    CONSTRAINT `ChecklistTemplateItem_templateId_fk` FOREIGN KEY (`templateId`) REFERENCES `ChecklistTemplate` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChecklistTemplateItem_defaultAssigneeId_fk` FOREIGN KEY (`defaultAssigneeId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistDefinition
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistDefinition`;
CREATE TABLE `ChecklistDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `recurrence` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME') NOT NULL,
    `startDate` DATETIME NOT NULL,
    `opensTime` VARCHAR(5) DEFAULT NULL,
    `cutoffTime` VARCHAR(5) DEFAULT NULL,
    `isActive` TINYINT(1) NOT NULL DEFAULT 1,
    `assigneeRoles` JSON DEFAULT NULL,
    `proofRequired` JSON DEFAULT NULL,
    `icon` ENUM('store', 'clock', 'star', 'check', 'shield', 'alert-triangle', 'hash', 'shield-check', 'calendar') NOT NULL DEFAULT 'store',
    `version` INT NOT NULL DEFAULT 1,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ChecklistDefinition_createdBy_fk` (`createdBy`),
    CONSTRAINT `ChecklistDefinition_createdBy_fk` FOREIGN KEY (`createdBy`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistDefinitionStore
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistDefinitionStore`;
CREATE TABLE `ChecklistDefinitionStore` (
    `id` VARCHAR(191) NOT NULL,
    `definitionId` VARCHAR(191) NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ChecklistDefinitionStore_def_store_key` (`definitionId`, `storeId`),
    KEY `ChecklistDefinitionStore_storeId_fk` (`storeId`),
    CONSTRAINT `ChecklistDefinitionStore_definitionId_fk` FOREIGN KEY (`definitionId`) REFERENCES `ChecklistDefinition` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChecklistDefinitionStore_storeId_fk` FOREIGN KEY (`storeId`) REFERENCES `Store` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistDefinitionAssignee
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistDefinitionAssignee`;
CREATE TABLE `ChecklistDefinitionAssignee` (
    `id` VARCHAR(191) NOT NULL,
    `definitionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ChecklistDefinitionAssignee_def_user_key` (`definitionId`, `userId`),
    KEY `ChecklistDefinitionAssignee_userId_fk` (`userId`),
    CONSTRAINT `ChecklistDefinitionAssignee_definitionId_fk` FOREIGN KEY (`definitionId`) REFERENCES `ChecklistDefinition` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChecklistDefinitionAssignee_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistDefinitionItem
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistDefinitionItem`;
CREATE TABLE `ChecklistDefinitionItem` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `order` INT NOT NULL DEFAULT 0,
    `requiredImageCount` INT NOT NULL DEFAULT 0,
    `maxImageCount` INT DEFAULT NULL,
    `requiresLivePhoto` TINYINT(1) NOT NULL DEFAULT 0,
    `itemType` ENUM('STANDARD', 'AUDIT', 'NUMBER_ENTRY', 'RATING', 'YES_NO', 'PASS_FAIL', 'MULTIPLE_CHOICE', 'DROPDOWN', 'TEXT_BOX', 'DATE_TIME', 'GPS', 'SIGNATURE', 'DUAL_SIGNATURE', 'QR_SCAN', 'CASH_TALLY', 'VIDEO_UPLOAD') NOT NULL DEFAULT 'STANDARD',
    `accessories` JSON DEFAULT NULL,
    `numberEntryUnit` VARCHAR(191) DEFAULT NULL,
    `numberEntryMin` FLOAT DEFAULT NULL,
    `numberEntryMax` FLOAT DEFAULT NULL,
    `ratingScale` INT DEFAULT NULL,
    `options` JSON DEFAULT NULL,
    `gpsTargetLat` FLOAT DEFAULT NULL,
    `gpsTargetLng` FLOAT DEFAULT NULL,
    `gpsRadiusMeters` FLOAT DEFAULT NULL,
    `signatureLabels` JSON DEFAULT NULL,
    `qrExpectedValue` VARCHAR(191) DEFAULT NULL,
    `cashExpectedAmount` FLOAT DEFAULT NULL,
    `conditionalTrigger` ENUM('YES', 'NO') DEFAULT NULL,
    `conditionalActions` JSON DEFAULT NULL,
    `definitionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ChecklistDefinitionItem_definitionId_idx` (`definitionId`),
    CONSTRAINT `ChecklistDefinitionItem_definitionId_fk` FOREIGN KEY (`definitionId`) REFERENCES `ChecklistDefinition` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistDefinitionItemAuditUser
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistDefinitionItemAuditUser`;
CREATE TABLE `ChecklistDefinitionItemAuditUser` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ChkDefItemAuditUser_item_user_key` (`itemId`, `userId`),
    KEY `ChkDefItemAuditUser_userId_fk` (`userId`),
    CONSTRAINT `ChkDefItemAuditUser_itemId_fk` FOREIGN KEY (`itemId`) REFERENCES `ChecklistDefinitionItem` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChkDefItemAuditUser_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistInstance
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistInstance`;
CREATE TABLE `ChecklistInstance` (
    `id` VARCHAR(191) NOT NULL,
    `definitionId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `recurrence` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME') NOT NULL,
    `storeId` VARCHAR(191) NOT NULL,
    `opensTime` VARCHAR(5) DEFAULT NULL,
    `cutoffTime` VARCHAR(5) DEFAULT NULL,
    `periodKey` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME NOT NULL,
    `periodEnd` DATETIME NOT NULL,
    `generatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `verificationStatus` ENUM('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_SUBMITTED',
    `verifiedBy` VARCHAR(191) DEFAULT NULL,
    `verifiedAt` DATETIME DEFAULT NULL,
    `verificationNote` TEXT DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ChecklistInstance_def_store_period_key` (`definitionId`, `storeId`, `periodKey`),
    KEY `ChecklistInstance_periodStart_idx` (`periodStart`),
    KEY `ChecklistInstance_storeId_fk` (`storeId`),
    KEY `ChecklistInstance_verifiedBy_fk` (`verifiedBy`),
    CONSTRAINT `ChecklistInstance_definitionId_fk` FOREIGN KEY (`definitionId`) REFERENCES `ChecklistDefinition` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChecklistInstance_storeId_fk` FOREIGN KEY (`storeId`) REFERENCES `Store` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChecklistInstance_verifiedBy_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistInstanceAssignee
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistInstanceAssignee`;
CREATE TABLE `ChecklistInstanceAssignee` (
    `id` VARCHAR(191) NOT NULL,
    `instanceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ChecklistInstanceAssignee_inst_user_key` (`instanceId`, `userId`),
    KEY `ChecklistInstanceAssignee_userId_idx` (`userId`),
    CONSTRAINT `ChecklistInstanceAssignee_instanceId_fk` FOREIGN KEY (`instanceId`) REFERENCES `ChecklistInstance` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChecklistInstanceAssignee_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistInstanceItem
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistInstanceItem`;
CREATE TABLE `ChecklistInstanceItem` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `order` INT NOT NULL DEFAULT 0,
    `isDone` TINYINT(1) NOT NULL DEFAULT 0,
    `completedAt` DATETIME DEFAULT NULL,
    `completedBy` VARCHAR(191) DEFAULT NULL,
    `requiredImageCount` INT NOT NULL DEFAULT 0,
    `maxImageCount` INT DEFAULT NULL,
    `requiresLivePhoto` TINYINT(1) NOT NULL DEFAULT 0,
    `itemType` ENUM('STANDARD', 'AUDIT', 'NUMBER_ENTRY', 'RATING', 'YES_NO', 'PASS_FAIL', 'MULTIPLE_CHOICE', 'DROPDOWN', 'TEXT_BOX', 'DATE_TIME', 'GPS', 'SIGNATURE', 'DUAL_SIGNATURE', 'QR_SCAN', 'CASH_TALLY', 'VIDEO_UPLOAD') NOT NULL DEFAULT 'STANDARD',
    `accessories` JSON DEFAULT NULL,
    `numberEntryUnit` VARCHAR(191) DEFAULT NULL,
    `numberEntryMin` FLOAT DEFAULT NULL,
    `numberEntryMax` FLOAT DEFAULT NULL,
    `ratingScale` INT DEFAULT NULL,
    `numericValue` FLOAT DEFAULT NULL,
    `options` JSON DEFAULT NULL,
    `booleanAnswer` ENUM('YES', 'NO') DEFAULT NULL,
    `textValue` TEXT DEFAULT NULL,
    `dateValue` DATETIME DEFAULT NULL,
    `gpsTargetLat` FLOAT DEFAULT NULL,
    `gpsTargetLng` FLOAT DEFAULT NULL,
    `gpsRadiusMeters` FLOAT DEFAULT NULL,
    `gpsLat` FLOAT DEFAULT NULL,
    `gpsLng` FLOAT DEFAULT NULL,
    `gpsAccuracy` FLOAT DEFAULT NULL,
    `gpsCapturedAt` DATETIME DEFAULT NULL,
    `signatureLabels` JSON DEFAULT NULL,
    `signatureValue` TEXT DEFAULT NULL,
    `secondSignatureValue` TEXT DEFAULT NULL,
    `qrExpectedValue` VARCHAR(191) DEFAULT NULL,
    `cashExpectedAmount` FLOAT DEFAULT NULL,
    `conditionalTrigger` ENUM('YES', 'NO') DEFAULT NULL,
    `conditionalActions` JSON DEFAULT NULL,
    `conditionalReasonValue` TEXT DEFAULT NULL,
    `issueId` VARCHAR(191) DEFAULT NULL,
    `instanceId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ChecklistInstanceItem_instanceId_idx` (`instanceId`),
    KEY `ChecklistInstanceItem_completedBy_fk` (`completedBy`),
    KEY `ChecklistInstanceItem_issueId_fk` (`issueId`),
    CONSTRAINT `ChecklistInstanceItem_instanceId_fk` FOREIGN KEY (`instanceId`) REFERENCES `ChecklistInstance` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChecklistInstanceItem_completedBy_fk` FOREIGN KEY (`completedBy`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `ChecklistInstanceItem_issueId_fk` FOREIGN KEY (`issueId`) REFERENCES `Ticket` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistInstanceImage
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistInstanceImage`;
CREATE TABLE `ChecklistInstanceImage` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `originalFilename` VARCHAR(191) DEFAULT NULL,
    `sizeBytes` INT NOT NULL DEFAULT 0,
    `mimeType` VARCHAR(191) NOT NULL,
    `captureMethod` ENUM('LIVE', 'GALLERY') NOT NULL DEFAULT 'GALLERY',
    `checklistInstanceItemId` VARCHAR(191) NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ChecklistInstanceImage_instItemId_idx` (`checklistInstanceItemId`),
    KEY `ChecklistInstanceImage_uploadedBy_fk` (`uploadedBy`),
    CONSTRAINT `ChecklistInstanceImage_instItemId_fk` FOREIGN KEY (`checklistInstanceItemId`) REFERENCES `ChecklistInstanceItem` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChecklistInstanceImage_uploadedBy_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistInstanceItemSubmission
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistInstanceItemSubmission`;
CREATE TABLE `ChecklistInstanceItemSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `remarks` TEXT DEFAULT NULL,
    `isDone` TINYINT(1) NOT NULL DEFAULT 0,
    `completedAt` DATETIME DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `ChecklistInstanceItemSubmission_item_user_key` (`itemId`, `userId`),
    KEY `ChecklistInstanceItemSubmission_userId_fk` (`userId`),
    CONSTRAINT `ChecklistInstanceItemSubmission_itemId_fk` FOREIGN KEY (`itemId`) REFERENCES `ChecklistInstanceItem` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChecklistInstanceItemSubmission_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistInstanceItemSubmissionAccessory
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistInstanceItemSubmissionAccessory`;
CREATE TABLE `ChecklistInstanceItemSubmissionAccessory` (
    `id` VARCHAR(191) NOT NULL,
    `submissionId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `checked` TINYINT(1) NOT NULL DEFAULT 0,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ChkInstItemSubAccessory_subId_idx` (`submissionId`),
    CONSTRAINT `ChkInstItemSubAccessory_subId_fk` FOREIGN KEY (`submissionId`) REFERENCES `ChecklistInstanceItemSubmission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: ChecklistInstanceItemSubmissionImage
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `ChecklistInstanceItemSubmissionImage`;
CREATE TABLE `ChecklistInstanceItemSubmissionImage` (
    `id` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `originalFilename` VARCHAR(191) DEFAULT NULL,
    `sizeBytes` INT NOT NULL DEFAULT 0,
    `mimeType` VARCHAR(191) NOT NULL,
    `captureMethod` ENUM('LIVE', 'GALLERY') NOT NULL DEFAULT 'GALLERY',
    `submissionId` VARCHAR(191) NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `ChkInstItemSubImage_subId_idx` (`submissionId`),
    KEY `ChkInstItemSubImage_uploadedBy_fk` (`uploadedBy`),
    CONSTRAINT `ChkInstItemSubImage_subId_fk` FOREIGN KEY (`submissionId`) REFERENCES `ChecklistInstanceItemSubmission` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `ChkInstItemSubImage_uploadedBy_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: Notification
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `Notification`;
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `recipientId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `ticketId` VARCHAR(191) DEFAULT NULL,
    `taskId` VARCHAR(191) DEFAULT NULL,
    `checklistInstanceId` VARCHAR(191) DEFAULT NULL,
    `isRead` TINYINT(1) NOT NULL DEFAULT 0,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `Notification_recipientId_idx` (`recipientId`),
    CONSTRAINT `Notification_recipientId_fk` FOREIGN KEY (`recipientId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: Event
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `Event`;
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `type` ENUM('DEADLINE', 'ANNOUNCEMENT', 'BROADCAST') NOT NULL DEFAULT 'ANNOUNCEMENT',
    `eventDate` DATETIME NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `Event_createdBy_fk` (`createdBy`),
    CONSTRAINT `Event_createdBy_fk` FOREIGN KEY (`createdBy`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: Todo
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `Todo`;
CREATE TABLE `Todo` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `text` VARCHAR(500) NOT NULL,
    `completed` TINYINT(1) NOT NULL DEFAULT 0,
    `dueDate` DATETIME DEFAULT NULL,
    `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `Todo_userId_fk` (`userId`),
    CONSTRAINT `Todo_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: Settings
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `Settings`;
CREATE TABLE `Settings` (
    `id` VARCHAR(191) NOT NULL,
    `defaultTatHours` FLOAT NOT NULL DEFAULT 24,
    `maxUploadSizeMb` FLOAT NOT NULL DEFAULT 5,
    `maxUploadFiles` INT NOT NULL DEFAULT 10,
    `allowedImageTypes` JSON NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: AuditLog
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `AuditLog`;
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NOT NULL,
    `before` JSON DEFAULT NULL,
    `after` JSON DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `AuditLog_entityType_entityId_idx` (`entityType`, `entityId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: SmartTaskConversation
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `SmartTaskConversation`;
CREATE TABLE `SmartTaskConversation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'in_progress',
    `resultingTaskId` VARCHAR(191) DEFAULT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `SmartTaskConversation_userId_createdAt_idx` (`userId`, `createdAt`),
    KEY `SmartTaskConversation_resultingTaskId_fk` (`resultingTaskId`),
    CONSTRAINT `SmartTaskConversation_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `SmartTaskConversation_resultingTaskId_fk` FOREIGN KEY (`resultingTaskId`) REFERENCES `Task` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: SmartTaskConversationMessage
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `SmartTaskConversationMessage`;
CREATE TABLE `SmartTaskConversationMessage` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `from` ENUM('bot', 'user') NOT NULL,
    `text` TEXT NOT NULL,
    `timestamp` DATETIME NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `SmartTaskConvMsg_convId_ts_idx` (`conversationId`, `timestamp`),
    CONSTRAINT `SmartTaskConvMsg_conversationId_fk` FOREIGN KEY (`conversationId`) REFERENCES `SmartTaskConversation` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- Table: PendingTaskConversation
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `PendingTaskConversation`;
CREATE TABLE `PendingTaskConversation` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `channel` ENUM('whatsapp') NOT NULL DEFAULT 'whatsapp',
    `pendingSlot` ENUM('assignee', 'department', 'dueDate', 'priority') NOT NULL,
    `slotQueue` JSON NOT NULL,
    `draftTitle` VARCHAR(191) NOT NULL,
    `draftContext` TEXT NOT NULL,
    `draftCategory` ENUM('issue', 'delegated_task') NOT NULL,
    `draftPriority` ENUM('low', 'medium', 'high') NOT NULL,
    `draftDueDate` DATETIME DEFAULT NULL,
    `draftAssigneeId` VARCHAR(191) DEFAULT NULL,
    `draftAssigneeName` VARCHAR(191) NOT NULL DEFAULT '',
    `draftDepartmentId` VARCHAR(191) DEFAULT NULL,
    `draftDepartmentName` VARCHAR(191) NOT NULL DEFAULT '',
    `draftRawInput` TEXT NOT NULL,
    `draftInputMode` ENUM('voice', 'text') NOT NULL,
    `draftConfidence` FLOAT DEFAULT NULL,
    `draftWonBy` VARCHAR(191) DEFAULT NULL,
    `expiresAt` DATETIME NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `PendingTaskConversation_phone_key` (`phone`),
    KEY `PendingTaskConversation_expiresAt_idx` (`expiresAt`),
    KEY `PendingTaskConversation_userId_fk` (`userId`),
    KEY `PendingTaskConversation_draftAssigneeId_fk` (`draftAssigneeId`),
    KEY `PendingTaskConversation_draftDepartmentId_fk` (`draftDepartmentId`),
    CONSTRAINT `PendingTaskConversation_userId_fk` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `PendingTaskConversation_draftAssigneeId_fk` FOREIGN KEY (`draftAssigneeId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `PendingTaskConversation_draftDepartmentId_fk` FOREIGN KEY (`draftDepartmentId`) REFERENCES `Department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
