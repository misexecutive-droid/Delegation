import {
  mysqlTable,
  varchar,
  text,
  int,
  float,
  boolean,
  datetime,
  json,
  mysqlEnum,
  index,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';
import { users, stores } from './core.js';

// ---------------------------------------------------------------------------
// Shared enum value arrays (reused by checklistInstance.ts)
// ---------------------------------------------------------------------------

export const CHECKLIST_RECURRENCES = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'] as const;
export type ChecklistRecurrence = (typeof CHECKLIST_RECURRENCES)[number];
export const CHECKLIST_ASSIGNEE_ROLES = [
  'STORE_MANAGER',
  'FLOOR_MANAGER',
  'CASHIER',
  'SECURITY',
  'HOUSEKEEPING',
  'OPERATIONS',
] as const;
export const CHECKLIST_PROOF_TYPES = ['PHOTO', 'GPS_MATCH', 'TIMESTAMP', 'SIGNATURE', 'QR_SCAN'] as const;
export const CHECKLIST_ICONS = [
  'store',
  'clock',
  'star',
  'check',
  'shield',
  'alert-triangle',
  'hash',
  'shield-check',
  'calendar',
] as const;
export const CHECKLIST_ITEM_TYPES = [
  'STANDARD',
  'AUDIT',
  'NUMBER_ENTRY',
  'RATING',
  'YES_NO',
  'PASS_FAIL',
  'MULTIPLE_CHOICE',
  'DROPDOWN',
  'TEXT_BOX',
  'DATE_TIME',
  'GPS',
  'SIGNATURE',
  'DUAL_SIGNATURE',
  'QR_SCAN',
  'CASH_TALLY',
  'VIDEO_UPLOAD',
] as const;
export const CHECKLIST_CONDITIONAL_ACTIONS = [
  'REQUIRE_PHOTO',
  'ASK_REASON',
  'CREATE_ISSUE',
  'NOTIFY_AREA_MANAGER',
] as const;
// Used by both ChecklistDefinitionItem.conditionalTrigger and
// ChecklistInstanceItem.{conditionalTrigger,booleanAnswer}.
export const YES_NO_VALUES = ['YES', 'NO'] as const;

// ---------------------------------------------------------------------------
// ChecklistDefinition — recurring checklist "template" scoped to stores
// ---------------------------------------------------------------------------
export const checklistDefinitions = mysqlTable('ChecklistDefinition', {
  id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
  name: varchar('name', { length: 191 }).notNull(),
  description: text('description'),
  // Mongoose enforced storeIds.length >= 1 via a custom path validator; that
  // "junction table must have at least one row" rule has no schema equivalent
  // here and must be enforced at the application/service layer.
  recurrence: mysqlEnum('recurrence', CHECKLIST_RECURRENCES).notNull(),
  startDate: datetime('startDate', { mode: 'date' }).notNull(),
  opensTime: varchar('opensTime', { length: 5 }), // HH:mm, validated at app layer
  cutoffTime: varchar('cutoffTime', { length: 5 }), // HH:mm, validated at app layer
  isActive: boolean('isActive').notNull().default(true),
  assigneeRoles: json('assigneeRoles').$type<(typeof CHECKLIST_ASSIGNEE_ROLES)[number][]>(),
  proofRequired: json('proofRequired').$type<(typeof CHECKLIST_PROOF_TYPES)[number][]>(),
  icon: mysqlEnum('icon', CHECKLIST_ICONS).notNull().default('store'),
  version: int('version').notNull().default(1),
  createdBy: varchar('createdBy', { length: 191 }).notNull().references(() => users.id),
  createdAt: datetime('createdAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
  updatedAt: datetime('updatedAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
});

// ChecklistDefinition.storeIds — many-to-many junction (ChecklistDefinition <-> Store)
export const checklistDefinitionStores = mysqlTable(
  'ChecklistDefinitionStore',
  {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
    definitionId: varchar('definitionId', { length: 191 })
      .notNull()
      .references(() => checklistDefinitions.id, { onDelete: 'cascade' }),
    storeId: varchar('storeId', { length: 191 }).notNull().references(() => stores.id),
    createdAt: datetime('createdAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('ChecklistDefinitionStore_definitionId_storeId_key').on(table.definitionId, table.storeId)],
);

// ChecklistDefinition.assigneeIds — many-to-many junction (ChecklistDefinition <-> User)
export const checklistDefinitionAssignees = mysqlTable(
  'ChecklistDefinitionAssignee',
  {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
    // No `.references()` here — the default constraint name would exceed
    // MySQL's 64-char identifier limit; declared explicitly below instead.
    definitionId: varchar('definitionId', { length: 191 }).notNull(),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    createdAt: datetime('createdAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('ChecklistDefinitionAssignee_definitionId_userId_key').on(table.definitionId, table.userId),
    foreignKey({
      columns: [table.definitionId],
      foreignColumns: [checklistDefinitions.id],
      name: 'ChklistDefAssignee_definitionId_fk',
    }).onDelete('cascade'),
  ],
);

// ---------------------------------------------------------------------------
// ChecklistDefinitionItem — wide, sparse single-table-polymorphism item
// (meaning of most fields depends on `itemType`); kept as one wide table to
// match the source's own design rather than normalizing per item type.
// ---------------------------------------------------------------------------
export const checklistDefinitionItems = mysqlTable(
  'ChecklistDefinitionItem',
  {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
    label: varchar('label', { length: 191 }).notNull(),
    order: int('order').notNull().default(0),
    requiredImageCount: int('requiredImageCount').notNull().default(0),
    maxImageCount: int('maxImageCount'),
    requiresLivePhoto: boolean('requiresLivePhoto').notNull().default(false),
    itemType: mysqlEnum('itemType', CHECKLIST_ITEM_TYPES).notNull().default('STANDARD'),
    accessories: json('accessories').$type<string[]>(),
    numberEntryUnit: varchar('numberEntryUnit', { length: 191 }),
    numberEntryMin: float('numberEntryMin'),
    numberEntryMax: float('numberEntryMax'),
    ratingScale: int('ratingScale'),
    options: json('options').$type<string[]>(),
    gpsTargetLat: float('gpsTargetLat'),
    gpsTargetLng: float('gpsTargetLng'),
    gpsRadiusMeters: float('gpsRadiusMeters'),
    signatureLabels: json('signatureLabels').$type<string[]>(),
    qrExpectedValue: varchar('qrExpectedValue', { length: 191 }),
    cashExpectedAmount: float('cashExpectedAmount'),
    conditionalTrigger: mysqlEnum('conditionalTrigger', YES_NO_VALUES),
    conditionalActions: json('conditionalActions').$type<(typeof CHECKLIST_CONDITIONAL_ACTIONS)[number][]>(),
    definitionId: varchar('definitionId', { length: 191 })
      .notNull()
      .references(() => checklistDefinitions.id, { onDelete: 'cascade' }),
    createdAt: datetime('createdAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
    updatedAt: datetime('updatedAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index('ChecklistDefinitionItem_definitionId_idx').on(table.definitionId)],
);

// ChecklistDefinitionItem.auditUserIds — many-to-many junction (used for AUDIT-type items)
export const checklistDefinitionItemAuditUsers = mysqlTable(
  'ChecklistDefinitionItemAuditUser',
  {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
    // No `.references()` here — the default constraint name would exceed
    // MySQL's 64-char identifier limit; declared explicitly below instead.
    itemId: varchar('itemId', { length: 191 }).notNull(),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    createdAt: datetime('createdAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('ChecklistDefinitionItemAuditUser_itemId_userId_key').on(table.itemId, table.userId),
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [checklistDefinitionItems.id],
      name: 'ChklistDefItemAuditUser_itemId_fk',
    }).onDelete('cascade'),
  ],
);
