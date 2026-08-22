import { db } from "../../config/db.js"
import {
    checklistDefinitions,
    checklistDefinitionStores,
    checklistDefinitionAssignees,
    checklistDefinitionItems,
    checklistDefinitionItemAuditUsers,
    type CHECKLIST_RECURRENCES,
} from "../../db/schema/index.js"
import { eq, and, asc, inArray, sql } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { AppError } from "../../utils/AppError.js"
import type { AccessTokenPayload } from "../../middleware/auth/auth.js"
import type { CreateChecklistDefinitionInput, UpdateChecklistDefinitionInput, SetChecklistDefinitionActiveInput } from "./checklistDefinition.validation.js"
import { generateInstanceForDefinition, loadDefinitionForGeneration } from "../../jobs/checklistInstanceGenerator.job.js"

export type ChecklistRecurrence = (typeof CHECKLIST_RECURRENCES)[number]

export type ListChecklistDefinitionsFilter = {
    storeId?: string
    recurrence?: ChecklistRecurrence
    isActive?: boolean
}

// Ported from the original MongoDB aggregation pipeline (see
// docs/mongo-query-patterns-report.md): grouped by definitionId instead of a time bucket, over
// every ChecklistInstanceItem across every instance stamped out from a given definition. As raw
// SQL rather than the "requiresLivePhoto ? liveCount : totalCount" JS/Mongo $cond pattern used in
// task.service.ts#complianceReport — same shape, same qualifying-photo-count logic.
const statsByDefinition = async (definitionIds: string[]): Promise<Map<string, { completionRate: number | null; qualityRate: number | null }>> => {
    const map = new Map<string, { completionRate: number | null; qualityRate: number | null }>()
    if (!definitionIds.length) return map

    // db.execute() on the mysql2 driver resolves to the raw mysql2 tuple [rows, fields],
    // NOT a plain row array — must destructure element 0 (see task.service.ts#complianceReport).
    const [rows] = await db.execute(sql`
        SELECT
            ci.definitionId AS definitionId,
            COUNT(*) AS totalItems,
            SUM(cii.isDone) AS doneItems,
            SUM(cii.requiredImageCount > 0) AS itemsRequiringPhotos,
            SUM(
                CASE WHEN cii.requiredImageCount > 0
                    AND (CASE WHEN cii.requiresLivePhoto THEN COALESCE(img.liveCount, 0) ELSE COALESCE(img.totalCount, 0) END) >= cii.requiredImageCount
                THEN 1 ELSE 0 END
            ) AS photoCompliantItems
        FROM ChecklistInstanceItem cii
        JOIN ChecklistInstance ci ON ci.id = cii.instanceId
        LEFT JOIN (
            SELECT checklistInstanceItemId, COUNT(*) AS totalCount, SUM(captureMethod = 'LIVE') AS liveCount
            FROM ChecklistInstanceImage GROUP BY checklistInstanceItemId
        ) img ON img.checklistInstanceItemId = cii.id
        WHERE ci.definitionId IN (${sql.join(definitionIds.map((id) => sql`${id}`), sql`, `)})
        GROUP BY ci.definitionId
    `)

    for (const r of rows as unknown as any[]) {
        const totalItems = Number(r.totalItems)
        const itemsRequiringPhotos = Number(r.itemsRequiringPhotos)
        map.set(r.definitionId as string, {
            completionRate: totalItems ? Math.round((Number(r.doneItems) / totalItems) * 1000) / 10 : null,
            qualityRate: itemsRequiringPhotos ? Math.round((Number(r.photoCompliantItems) / itemsRequiringPhotos) * 1000) / 10 : null,
        })
    }
    return map
}

// Not using Drizzle's relational query API (`db.query...with:{...}`) here — that API compiles
// every relation into a `LEFT JOIN LATERAL (...)` subquery, and the actual database this app
// runs against (MariaDB 10.11) doesn't support LATERAL joins at all (confirmed against the real
// local instance). Plain selects assembled by hand in JS instead — same pattern as
// task.service.ts/ticket.service.ts/checklist.service.ts. This is the closest equivalent of the
// old `populate({ path: "items", ... })`, plus flattening the junction tables (storeLinks/
// assigneeLinks/auditUserLinks) back into the flat id arrays (storeIds/assigneeIds/auditUserIds)
// the API/frontend already expects, and adding the two stats fields that used to come from the
// (now-stubbed) aggregation pipeline.
const hydrateDefinitions = async (definitionRows: (typeof checklistDefinitions.$inferSelect)[]) => {
    if (!definitionRows.length) return []
    const definitionIds = definitionRows.map((d) => d.id)
    const stats = await statsByDefinition(definitionIds)

    const storeLinks = await db.select().from(checklistDefinitionStores).where(inArray(checklistDefinitionStores.definitionId, definitionIds))
    const storeIdsByDefinition = new Map<string, string[]>()
    for (const link of storeLinks) {
        const list = storeIdsByDefinition.get(link.definitionId) ?? []
        list.push(link.storeId)
        storeIdsByDefinition.set(link.definitionId, list)
    }

    const assigneeLinks = await db.select().from(checklistDefinitionAssignees).where(inArray(checklistDefinitionAssignees.definitionId, definitionIds))
    const assigneeIdsByDefinition = new Map<string, string[]>()
    for (const link of assigneeLinks) {
        const list = assigneeIdsByDefinition.get(link.definitionId) ?? []
        list.push(link.userId)
        assigneeIdsByDefinition.set(link.definitionId, list)
    }

    const items = await db.select().from(checklistDefinitionItems).where(inArray(checklistDefinitionItems.definitionId, definitionIds)).orderBy(asc(checklistDefinitionItems.order))
    const itemIds = items.map((i) => i.id)
    const auditUserLinks = itemIds.length ? await db.select().from(checklistDefinitionItemAuditUsers).where(inArray(checklistDefinitionItemAuditUsers.itemId, itemIds)) : []
    const auditUserIdsByItem = new Map<string, string[]>()
    for (const link of auditUserLinks) {
        const list = auditUserIdsByItem.get(link.itemId) ?? []
        list.push(link.userId)
        auditUserIdsByItem.set(link.itemId, list)
    }

    const itemsByDefinition = new Map<string, any[]>()
    for (const item of items) {
        const mapped = { ...item, auditUserIds: auditUserIdsByItem.get(item.id) ?? [] }
        const list = itemsByDefinition.get(item.definitionId) ?? []
        list.push(mapped)
        itemsByDefinition.set(item.definitionId, list)
    }

    return definitionRows.map((definition) => ({
        ...definition,
        storeIds: storeIdsByDefinition.get(definition.id) ?? [],
        assigneeIds: assigneeIdsByDefinition.get(definition.id) ?? [],
        items: itemsByDefinition.get(definition.id) ?? [],
        completionRate: stats.get(definition.id)?.completionRate ?? null,
        qualityRate: stats.get(definition.id)?.qualityRate ?? null,
    }))
}

export const checklistDefinitionService = {
    async list(filter: ListChecklistDefinitionsFilter) {
        const conditions = []
        if (filter.recurrence) conditions.push(eq(checklistDefinitions.recurrence, filter.recurrence))
        if (filter.isActive !== undefined) conditions.push(eq(checklistDefinitions.isActive, filter.isActive))
        if (filter.storeId) {
            // Mongo/Mongoose matched an array field against a scalar as "array contains this
            // value" — the equivalent here is a lookup against the junction table first, then
            // filtering the definitions to just those ids.
            const links = await db
                .select({ definitionId: checklistDefinitionStores.definitionId })
                .from(checklistDefinitionStores)
                .where(eq(checklistDefinitionStores.storeId, filter.storeId))
            if (!links.length) return []
            conditions.push(inArray(checklistDefinitions.id, links.map(l => l.definitionId)))
        }

        const definitionRows = await db.select().from(checklistDefinitions)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(asc(checklistDefinitions.name))
        return hydrateDefinitions(definitionRows)
    },

    async getById(id: string) {
        const [definition] = await db.select().from(checklistDefinitions).where(eq(checklistDefinitions.id, id)).limit(1)
        if (!definition) throw AppError.notFound("Checklist not found")
        const [hydrated] = await hydrateDefinitions([definition])
        return hydrated
    },

    async create(input: CreateChecklistDefinitionInput, user: AccessTokenPayload) {
        const definitionId = createId()

        // Wrapped in a transaction (source had none) — creating a definition fans out into
        // four related tables (stores, assignees, items, item auditors); a partial failure
        // half-way through must not leave an orphaned/incomplete definition behind.
        await db.transaction(async (tx) => {
            await tx.insert(checklistDefinitions).values({
                id: definitionId,
                name: input.name,
                description: input.description ?? null,
                recurrence: input.recurrence,
                startDate: new Date(input.startDate),
                opensTime: input.opensTime ?? null,
                cutoffTime: input.cutoffTime ?? null,
                assigneeRoles: input.assigneeRoles ?? [],
                proofRequired: input.proofRequired ?? [],
                icon: input.icon,
                createdBy: user.sub,
            })

            await tx.insert(checklistDefinitionStores).values(
                input.storeIds.map(storeId => ({ definitionId, storeId })),
            )
            await tx.insert(checklistDefinitionAssignees).values(
                input.assigneeIds.map(userId => ({ definitionId, userId })),
            )

            for (const [index, item] of input.items.entries()) {
                const itemId = createId()
                await tx.insert(checklistDefinitionItems).values({
                    id: itemId,
                    label: item.label,
                    order: item.order ?? index,
                    requiredImageCount: item.requiredImageCount ?? 0,
                    maxImageCount: item.maxImageCount ?? null,
                    requiresLivePhoto: item.requiresLivePhoto ?? false,
                    itemType: item.itemType ?? "STANDARD",
                    accessories: item.accessories ?? null,
                    numberEntryUnit: item.numberEntryUnit ?? null,
                    numberEntryMin: item.numberEntryMin ?? null,
                    numberEntryMax: item.numberEntryMax ?? null,
                    ratingScale: item.ratingScale ?? null,
                    options: item.options ?? null,
                    gpsTargetLat: item.gpsTargetLat ?? null,
                    gpsTargetLng: item.gpsTargetLng ?? null,
                    gpsRadiusMeters: item.gpsRadiusMeters ?? null,
                    signatureLabels: item.signatureLabels ?? null,
                    qrExpectedValue: item.qrExpectedValue ?? null,
                    cashExpectedAmount: item.cashExpectedAmount ?? null,
                    conditionalTrigger: item.conditionalTrigger ?? null,
                    conditionalActions: item.conditionalActions ?? null,
                    definitionId,
                })
                if (item.itemType === "AUDIT" && item.auditUserIds?.length) {
                    await tx.insert(checklistDefinitionItemAuditUsers).values(
                        item.auditUserIds.map(userId => ({ itemId, userId })),
                    )
                }
            }
        })

        // Stamp out this definition's first instance right away if it's already due, instead of
        // making the admin wait for the generator job's next hourly tick. Reloaded fresh off the
        // DB (rather than assembled from `input`) so the generator sees exactly what the
        // transaction above actually persisted.
        const definitionForGeneration = await loadDefinitionForGeneration(definitionId)
        if (definitionForGeneration) await generateInstanceForDefinition(definitionForGeneration, new Date())

        return this.getById(definitionId)
    },

    async update(id: string, input: UpdateChecklistDefinitionInput) {
        // Captured from inside the transaction below for use afterwards (whether to stamp out a
        // fresh instance depends on the definition's pre-update isActive state, which this update
        // never itself changes — see setActive for that).
        let wasActive = false

        // Wrapped in a transaction (source had none) — this is a deliberate improvement per the
        // migration research report: the definition update, the store/assignee link replacement,
        // and the insert-new-items-then-delete-old-items sequence must all succeed or all fail
        // together.
        await db.transaction(async (tx) => {
            const [existing] = await tx
                .select({ id: checklistDefinitions.id, version: checklistDefinitions.version, isActive: checklistDefinitions.isActive })
                .from(checklistDefinitions)
                .where(eq(checklistDefinitions.id, id))
                .limit(1)
            if (!existing) throw AppError.notFound("Checklist not found")
            wasActive = existing.isActive

            await tx.update(checklistDefinitions).set({
                name: input.name,
                description: input.description ?? null,
                recurrence: input.recurrence,
                startDate: new Date(input.startDate),
                opensTime: input.opensTime ?? null,
                cutoffTime: input.cutoffTime ?? null,
                assigneeRoles: input.assigneeRoles ?? [],
                proofRequired: input.proofRequired ?? [],
                icon: input.icon,
                version: existing.version + 1,
                updatedAt: new Date(),
            }).where(eq(checklistDefinitions.id, id))

            // storeIds/assigneeIds are whole-array replaces in the original code (definition.set({
            // storeIds: input.storeIds, ... })) and nothing else references these junction rows by
            // their own id, so delete-all-and-reinsert is safe and simplest here (per migration
            // conventions).
            await tx.delete(checklistDefinitionStores).where(eq(checklistDefinitionStores.definitionId, id))
            await tx.insert(checklistDefinitionStores).values(
                input.storeIds.map(storeId => ({ definitionId: id, storeId })),
            )
            await tx.delete(checklistDefinitionAssignees).where(eq(checklistDefinitionAssignees.definitionId, id))
            await tx.insert(checklistDefinitionAssignees).values(
                input.assigneeIds.map(userId => ({ definitionId: id, userId })),
            )

            // Insert the new items BEFORE deleting the old ones, and delete by exclusion rather
            // than by definitionId alone - if an insert fails partway, the old items are still
            // intact instead of the definition being left with zero items. (Ported as-is from the
            // original Mongoose code; now safe to do so inside a real transaction.)
            const newItemIds: string[] = []
            for (const [index, item] of input.items.entries()) {
                const itemId = createId()
                newItemIds.push(itemId)
                await tx.insert(checklistDefinitionItems).values({
                    id: itemId,
                    label: item.label,
                    order: item.order ?? index,
                    requiredImageCount: item.requiredImageCount ?? 0,
                    maxImageCount: item.maxImageCount ?? null,
                    requiresLivePhoto: item.requiresLivePhoto ?? false,
                    itemType: item.itemType ?? "STANDARD",
                    accessories: item.accessories ?? null,
                    numberEntryUnit: item.numberEntryUnit ?? null,
                    numberEntryMin: item.numberEntryMin ?? null,
                    numberEntryMax: item.numberEntryMax ?? null,
                    ratingScale: item.ratingScale ?? null,
                    options: item.options ?? null,
                    gpsTargetLat: item.gpsTargetLat ?? null,
                    gpsTargetLng: item.gpsTargetLng ?? null,
                    gpsRadiusMeters: item.gpsRadiusMeters ?? null,
                    signatureLabels: item.signatureLabels ?? null,
                    qrExpectedValue: item.qrExpectedValue ?? null,
                    cashExpectedAmount: item.cashExpectedAmount ?? null,
                    conditionalTrigger: item.conditionalTrigger ?? null,
                    conditionalActions: item.conditionalActions ?? null,
                    definitionId: id,
                })
                if (item.itemType === "AUDIT" && item.auditUserIds?.length) {
                    await tx.insert(checklistDefinitionItemAuditUsers).values(
                        item.auditUserIds.map(userId => ({ itemId, userId })),
                    )
                }
            }
            // Old items' auditUserLinks cascade-delete automatically (FK onDelete: 'cascade' on
            // ChecklistDefinitionItemAuditUser.itemId) once the item row itself is deleted below.
            await tx.delete(checklistDefinitionItems).where(
                newItemIds.length
                    ? and(eq(checklistDefinitionItems.definitionId, id), inArray(checklistDefinitionItems.id, newItemIds))
                    : eq(checklistDefinitionItems.definitionId, id),
            )
        })

        // Only stamp out a fresh instance if this definition is still active - an admin editing a
        // deactivated checklist (e.g. fixing a label typo) shouldn't silently bring it back to life.
        if (wasActive) {
            const definitionForGeneration = await loadDefinitionForGeneration(id)
            if (definitionForGeneration) await generateInstanceForDefinition(definitionForGeneration, new Date())
        }

        return this.getById(id)
    },

    async setActive(id: string, input: SetChecklistDefinitionActiveInput) {
        const [existing] = await db.select({ id: checklistDefinitions.id }).from(checklistDefinitions).where(eq(checklistDefinitions.id, id)).limit(1)
        if (!existing) throw AppError.notFound("Checklist not found")
        await db.update(checklistDefinitions).set({ isActive: input.isActive, updatedAt: new Date() }).where(eq(checklistDefinitions.id, id))
        return this.getById(id)
    },

    // Replaces the original 5-step manual cascading delete fan-out (definition -> items ->
    // instances -> instance items -> instance images -> submissions -> submission images, 5
    // sequential deleteMany calls with NO transaction). The Drizzle schema already wires
    // `onDelete: 'cascade'` through this entire chain:
    //   ChecklistDefinition --cascade--> ChecklistDefinitionItem, ChecklistDefinitionStore,
    //     ChecklistDefinitionAssignee, ChecklistInstance
    //   ChecklistDefinitionItem --cascade--> ChecklistDefinitionItemAuditUser
    //   ChecklistInstance --cascade--> ChecklistInstanceAssignee, ChecklistInstanceItem
    //   ChecklistInstanceItem --cascade--> ChecklistInstanceImage, ChecklistInstanceItemSubmission
    //   ChecklistInstanceItemSubmission --cascade--> ChecklistInstanceItemSubmissionAccessory,
    //     ChecklistInstanceItemSubmissionImage
    // (see checklistDefinition.ts/checklistInstance.ts FK definitions) — a single delete on the
    // root row is enough; MySQL's cascading FKs handle every descendant table.
    async remove(id: string) {
        const [existing] = await db.select({ id: checklistDefinitions.id }).from(checklistDefinitions).where(eq(checklistDefinitions.id, id)).limit(1)
        if (!existing) throw AppError.notFound("Checklist not found")
        await db.delete(checklistDefinitions).where(eq(checklistDefinitions.id, id))
        return existing
    },
}
