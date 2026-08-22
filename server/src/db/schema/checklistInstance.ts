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
import { CAPTURE_METHODS } from './task.js';
import { tickets } from './ticket.js';
import {
  checklistDefinitions,
  CHECKLIST_RECURRENCES,
  CHECKLIST_ITEM_TYPES,
  CHECKLIST_CONDITIONAL_ACTIONS,
  YES_NO_VALUES,
} from './checklistDefinition.js';

export const CHECKLIST_VERIFICATION_STATUSES = ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'] as const;

// ---------------------------------------------------------------------------
// ChecklistInstance — one stamped-out occurrence of a ChecklistDefinition for
// a single store and time period
// ---------------------------------------------------------------------------
export const checklistInstances = mysqlTable(
  'ChecklistInstance',
  {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
    definitionId: varchar('definitionId', { length: 191 })
      .notNull()
      .references(() => checklistDefinitions.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 191 }).notNull(),
    recurrence: mysqlEnum('recurrence', CHECKLIST_RECURRENCES).notNull(),
    storeId: varchar('storeId', { length: 191 }).notNull().references(() => stores.id),
    opensTime: varchar('opensTime', { length: 5 }), // copied from definition at stamp-out
    cutoffTime: varchar('cutoffTime', { length: 5 }), // copied from definition at stamp-out
    periodKey: varchar('periodKey', { length: 191 }).notNull(),
    periodStart: datetime('periodStart', { mode: 'date' }).notNull(),
    periodEnd: datetime('periodEnd', { mode: 'date' }).notNull(),
    generatedAt: datetime('generatedAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
    verificationStatus: mysqlEnum('verificationStatus', CHECKLIST_VERIFICATION_STATUSES)
      .notNull()
      .default('NOT_SUBMITTED'),
    verifiedBy: varchar('verifiedBy', { length: 191 }).references(() => users.id),
    verifiedAt: datetime('verifiedAt', { mode: 'date' }),
    verificationNote: text('verificationNote'),
    createdAt: datetime('createdAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
    updatedAt: datetime('updatedAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('ChecklistInstance_definitionId_storeId_periodKey_key').on(
      table.definitionId,
      table.storeId,
      table.periodKey,
    ),
    index('ChecklistInstance_periodStart_idx').on(table.periodStart),
    // Mongoose also indexed {assigneeIds:1, periodStart:-1}; that array now
    // lives in the checklistInstanceAssignees junction table below — the
    // closest equivalent is that table's userId index plus this periodStart index.
  ],
);

// ChecklistInstance.assigneeIds — many-to-many junction (ChecklistInstance <-> User)
export const checklistInstanceAssignees = mysqlTable(
  'ChecklistInstanceAssignee',
  {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
    instanceId: varchar('instanceId', { length: 191 })
      .notNull()
      .references(() => checklistInstances.id, { onDelete: 'cascade' }),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    createdAt: datetime('createdAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('ChecklistInstanceAssignee_instanceId_userId_key').on(table.instanceId, table.userId),
    index('ChecklistInstanceAssignee_userId_idx').on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// ChecklistInstanceItem — per-run copy of a ChecklistDefinitionItem plus
// answer fields (same wide single-table-polymorphism shape as its definition
// counterpart, keyed by itemType).
// ---------------------------------------------------------------------------
export const checklistInstanceItems = mysqlTable(
  'ChecklistInstanceItem',
  {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
    label: varchar('label', { length: 191 }).notNull(),
    order: int('order').notNull().default(0),
    isDone: boolean('isDone').notNull().default(false),
    // Kept in sync with isDone by a service-layer helper (was a Mongoose pre('save') hook);
    // completedBy is cleared on un-done but not auto-set on done (service sets it explicitly).
    completedAt: datetime('completedAt', { mode: 'date' }),
    completedBy: varchar('completedBy', { length: 191 }).references(() => users.id),
    requiredImageCount: int('requiredImageCount').notNull().default(0),
    maxImageCount: int('maxImageCount'),
    requiresLivePhoto: boolean('requiresLivePhoto').notNull().default(false),
    itemType: mysqlEnum('itemType', CHECKLIST_ITEM_TYPES).notNull().default('STANDARD'),
    accessories: json('accessories').$type<string[]>(),
    numberEntryUnit: varchar('numberEntryUnit', { length: 191 }),
    numberEntryMin: float('numberEntryMin'),
    numberEntryMax: float('numberEntryMax'),
    ratingScale: int('ratingScale'),
    numericValue: float('numericValue'), // shared slot for NUMBER_ENTRY/RATING/CASH_TALLY
    options: json('options').$type<string[]>(),
    booleanAnswer: mysqlEnum('booleanAnswer', YES_NO_VALUES),
    // Shared slot for MULTIPLE_CHOICE/DROPDOWN/TEXT_BOX/QR_SCAN — TEXT_BOX answers
    // can be long free text, so `text` is used rather than `varchar`.
    textValue: text('textValue'),
    dateValue: datetime('dateValue', { mode: 'date' }),
    gpsTargetLat: float('gpsTargetLat'),
    gpsTargetLng: float('gpsTargetLng'),
    gpsRadiusMeters: float('gpsRadiusMeters'),
    gpsLat: float('gpsLat'),
    gpsLng: float('gpsLng'),
    gpsAccuracy: float('gpsAccuracy'),
    gpsCapturedAt: datetime('gpsCapturedAt', { mode: 'date' }),
    signatureLabels: json('signatureLabels').$type<string[]>(),
    signatureValue: text('signatureValue'), // PNG data URL
    secondSignatureValue: text('secondSignatureValue'), // PNG data URL
    qrExpectedValue: varchar('qrExpectedValue', { length: 191 }),
    cashExpectedAmount: float('cashExpectedAmount'),
    conditionalTrigger: mysqlEnum('conditionalTrigger', YES_NO_VALUES),
    conditionalActions: json('conditionalActions').$type<(typeof CHECKLIST_CONDITIONAL_ACTIONS)[number][]>(),
    conditionalReasonValue: text('conditionalReasonValue'),
    // Links back to a Ticket created via the CREATE_ISSUE conditional action.
    issueId: varchar('issueId', { length: 191 }).references(() => tickets.id),
    instanceId: varchar('instanceId', { length: 191 })
      .notNull()
      .references(() => checklistInstances.id, { onDelete: 'cascade' }),
    createdAt: datetime('createdAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
    updatedAt: datetime('updatedAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index('ChecklistInstanceItem_instanceId_idx').on(table.instanceId)],
);

// ---------------------------------------------------------------------------
// ChecklistInstanceItemSubmission — one row per required auditor on an
// AUDIT-type ChecklistInstanceItem
// ---------------------------------------------------------------------------
export const checklistInstanceItemSubmissions = mysqlTable(
  'ChecklistInstanceItemSubmission',
  {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
    // No `.references()` here — the default constraint name would exceed
    // MySQL's 64-char identifier limit; declared explicitly below instead.
    itemId: varchar('itemId', { length: 191 }).notNull(),
    userId: varchar('userId', { length: 191 }).notNull().references(() => users.id),
    remarks: text('remarks'),
    isDone: boolean('isDone').notNull().default(false),
    // Kept in sync with isDone by a service-layer helper (was a Mongoose pre('save') hook).
    completedAt: datetime('completedAt', { mode: 'date' }),
    createdAt: datetime('createdAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
    updatedAt: datetime('updatedAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('ChecklistInstanceItemSubmission_itemId_userId_key').on(table.itemId, table.userId),
    foreignKey({
      columns: [table.itemId],
      foreignColumns: [checklistInstanceItems.id],
      name: 'ChklistInstItemSubmission_itemId_fk',
    }).onDelete('cascade'),
  ],
);

// ChecklistInstanceItemSubmission.accessories — embedded array with
// independently-toggled `checked` state per element; promoted to a real
// child table (copied from the definition item's `accessories: string[]` at
// stamp-out), with cascading delete.
export const checklistInstanceItemSubmissionAccessories = mysqlTable(
  'ChecklistInstanceItemSubmissionAccessory',
  {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
    // No `.references()` here — the default constraint name would exceed
    // MySQL's 64-char identifier limit; declared explicitly below instead.
    submissionId: varchar('submissionId', { length: 191 }).notNull(),
    name: varchar('name', { length: 191 }).notNull(),
    checked: boolean('checked').notNull().default(false),
    createdAt: datetime('createdAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
    updatedAt: datetime('updatedAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index('ChecklistInstanceItemSubmissionAccessory_submissionId_idx').on(table.submissionId),
    foreignKey({
      columns: [table.submissionId],
      foreignColumns: [checklistInstanceItemSubmissions.id],
      name: 'ChklistInstItemSubAccessory_subId_fk',
    }).onDelete('cascade'),
  ],
);

// ---------------------------------------------------------------------------
// ChecklistInstanceImage — photo proof captured against a ChecklistInstanceItem
// ---------------------------------------------------------------------------
export const checklistInstanceImages = mysqlTable(
  'ChecklistInstanceImage',
  {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
    url: varchar('url', { length: 2048 }).notNull(),
    originalFilename: varchar('originalFilename', { length: 191 }),
    sizeBytes: int('sizeBytes').notNull(),
    mimeType: varchar('mimeType', { length: 191 }).notNull(),
    captureMethod: mysqlEnum('captureMethod', CAPTURE_METHODS).notNull(),
    // No `.references()` here — the default constraint name would exceed
    // MySQL's 64-char identifier limit; declared explicitly below instead.
    checklistInstanceItemId: varchar('checklistInstanceItemId', { length: 191 }).notNull(),
    uploadedBy: varchar('uploadedBy', { length: 191 }).notNull().references(() => users.id),
    createdAt: datetime('createdAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
    updatedAt: datetime('updatedAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index('ChecklistInstanceImage_checklistInstanceItemId_idx').on(table.checklistInstanceItemId),
    foreignKey({
      columns: [table.checklistInstanceItemId],
      foreignColumns: [checklistInstanceItems.id],
      name: 'ChklistInstImage_instItemId_fk',
    }).onDelete('cascade'),
  ],
);

// ---------------------------------------------------------------------------
// ChecklistInstanceItemSubmissionImage — photo proof captured against a submission
// ---------------------------------------------------------------------------
export const checklistInstanceItemSubmissionImages = mysqlTable(
  'ChecklistInstanceItemSubmissionImage',
  {
    id: varchar('id', { length: 191 }).primaryKey().$defaultFn(() => createId()),
    url: varchar('url', { length: 2048 }).notNull(),
    originalFilename: varchar('originalFilename', { length: 191 }),
    sizeBytes: int('sizeBytes').notNull(),
    mimeType: varchar('mimeType', { length: 191 }).notNull(),
    captureMethod: mysqlEnum('captureMethod', CAPTURE_METHODS).notNull(),
    // No `.references()` here — the default constraint name would exceed
    // MySQL's 64-char identifier limit; declared explicitly below instead.
    submissionId: varchar('submissionId', { length: 191 }).notNull(),
    uploadedBy: varchar('uploadedBy', { length: 191 }).notNull().references(() => users.id),
    createdAt: datetime('createdAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
    updatedAt: datetime('updatedAt', { mode: 'date' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index('ChecklistInstanceItemSubmissionImage_submissionId_idx').on(table.submissionId),
    foreignKey({
      columns: [table.submissionId],
      foreignColumns: [checklistInstanceItemSubmissions.id],
      name: 'ChklistInstItemSubImage_subId_fk',
    }).onDelete('cascade'),
  ],
);
