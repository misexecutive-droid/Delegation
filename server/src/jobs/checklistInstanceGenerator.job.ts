// Recurrence engine for the Checklist feature: sweeps active ChecklistDefinitions and stamps
// out a fresh, completable ChecklistInstance whenever a definition's current period hasn't been
// generated yet. See utils/period.ts for the period-math this relies on.
import cron from "node-cron"
import { createId } from "@paralleldrive/cuid2"
import { eq, and, inArray, asc, lte } from "drizzle-orm"
import { db } from "../config/db.js"
import {
    checklistDefinitions,
    checklistDefinitionStores,
    checklistDefinitionAssignees,
    checklistDefinitionItems,
    checklistDefinitionItemAuditUsers,
    checklistInstances,
    checklistInstanceAssignees,
    checklistInstanceItems,
    checklistInstanceItemSubmissions,
    checklistInstanceItemSubmissionAccessories,
} from "../db/schema/index.js"
import type { ChecklistRecurrence } from "../db/schema/checklistDefinition.js"
import { getCurrentPeriod, type Period } from "../utils/period.js"
import { env } from "../config/env.js"

// Plain-object shape carrying everything generateInstanceForDefinition needs, decoupled from
// wherever the caller got it from — the sweep below loads it fresh off the DB (loadDefinitionForGeneration),
// while checklistDefinition.service.ts's create()/update() load it the same way right after their
// own transaction commits, so both paths see exactly what was actually persisted (no risk of the
// generator working off stale/unsaved input).
type GenerationItem = {
    id: string
    label: string
    order: number
    requiredImageCount: number
    maxImageCount: number | null
    requiresLivePhoto: boolean
    itemType: (typeof checklistDefinitionItems.$inferSelect)["itemType"]
    accessories: string[] | null
    numberEntryUnit: string | null
    numberEntryMin: number | null
    numberEntryMax: number | null
    ratingScale: number | null
    options: string[] | null
    gpsTargetLat: number | null
    gpsTargetLng: number | null
    gpsRadiusMeters: number | null
    signatureLabels: string[] | null
    qrExpectedValue: string | null
    cashExpectedAmount: number | null
    conditionalTrigger: (typeof checklistDefinitionItems.$inferSelect)["conditionalTrigger"]
    conditionalActions: (typeof checklistDefinitionItems.$inferSelect)["conditionalActions"]
    auditUserIds: string[]
}

export type GenerationDefinition = {
    id: string
    name: string
    recurrence: ChecklistRecurrence
    startDate: Date
    opensTime: string | null
    cutoffTime: string | null
    storeIds: string[]
    assigneeIds: string[]
    items: GenerationItem[]
}

// Assembles the generation-shaped view of a definition straight off the DB (its store/assignee
// junction rows and its items + their audit-user junction rows) — the closest equivalent of the
// old Mongoose-populated definition document the job used to work off of. Deliberately separate
// from checklistDefinition.service.ts's own hydrateDefinitions (which also computes completion/
// quality stats this job has no use for, and importing from that module would create a circular
// import since that service calls back into this one).
export const loadDefinitionForGeneration = async (definitionId: string): Promise<GenerationDefinition | null> => {
    const [row] = await db.select().from(checklistDefinitions).where(eq(checklistDefinitions.id, definitionId)).limit(1)
    if (!row) return null

    const storeLinks = await db.select({ storeId: checklistDefinitionStores.storeId })
        .from(checklistDefinitionStores)
        .where(eq(checklistDefinitionStores.definitionId, definitionId))
    const assigneeLinks = await db.select({ userId: checklistDefinitionAssignees.userId })
        .from(checklistDefinitionAssignees)
        .where(eq(checklistDefinitionAssignees.definitionId, definitionId))

    const itemRows = await db.select().from(checklistDefinitionItems)
        .where(eq(checklistDefinitionItems.definitionId, definitionId))
        .orderBy(asc(checklistDefinitionItems.order))
    const itemIds = itemRows.map((i) => i.id)
    const auditLinks = itemIds.length
        ? await db.select().from(checklistDefinitionItemAuditUsers).where(inArray(checklistDefinitionItemAuditUsers.itemId, itemIds))
        : []
    const auditUserIdsByItem = new Map<string, string[]>()
    for (const link of auditLinks) {
        const list = auditUserIdsByItem.get(link.itemId) ?? []
        list.push(link.userId)
        auditUserIdsByItem.set(link.itemId, list)
    }

    return {
        id: row.id,
        name: row.name,
        recurrence: row.recurrence,
        startDate: row.startDate,
        opensTime: row.opensTime,
        cutoffTime: row.cutoffTime,
        storeIds: storeLinks.map((l) => l.storeId),
        assigneeIds: assigneeLinks.map((l) => l.userId),
        items: itemRows.map((item) => ({ ...item, auditUserIds: auditUserIdsByItem.get(item.id) ?? [] })),
    }
}

// Stamps out the currently-due ChecklistInstance for one (definition, store) pair. Caller is
// responsible for the "already generated for this period?" check — see generateInstanceForDefinition,
// which does that once for every store up front instead of once per store here.
//
// Wrapped in a single transaction (the original had none, plus a manual delete-the-orphan
// cleanup for when item/submission stamp-out failed after the instance insert had already
// committed) — a deliberate improvement per the migration conventions: if anything in here
// fails, the whole attempt rolls back cleanly instead of leaving a half-stamped-out instance
// behind for the next sweep tick to skip over (its (definitionId, storeId, periodKey) would
// otherwise already "exist" with no items to complete).
const generateInstanceForStore = async (
    definition: GenerationDefinition,
    storeId: string,
    period: Period,
    now: Date,
): Promise<{ id: string } | null> => {
    const instanceId = createId()
    try {
        await db.transaction(async (tx) => {
            await tx.insert(checklistInstances).values({
                id: instanceId,
                definitionId: definition.id,
                title: definition.name,
                recurrence: definition.recurrence,
                storeId,
                opensTime: definition.opensTime,
                cutoffTime: definition.cutoffTime,
                periodKey: period.periodKey,
                periodStart: period.periodStart,
                periodEnd: period.periodEnd,
                generatedAt: now,
            })

            if (definition.assigneeIds.length) {
                await tx.insert(checklistInstanceAssignees).values(
                    definition.assigneeIds.map((userId) => ({ instanceId, userId })),
                )
            }

            if (!definition.items.length) return

            const itemIds = definition.items.map(() => createId())
            await tx.insert(checklistInstanceItems).values(
                definition.items.map((item, index) => ({
                    id: itemIds[index],
                    label: item.label,
                    order: item.order,
                    // Photo requirements are authored once on the definition item and copied onto
                    // every instance it stamps out — an instance item never edits these itself.
                    requiredImageCount: item.requiredImageCount,
                    maxImageCount: item.maxImageCount,
                    requiresLivePhoto: item.requiresLivePhoto,
                    itemType: item.itemType,
                    accessories: item.accessories,
                    numberEntryUnit: item.numberEntryUnit,
                    numberEntryMin: item.numberEntryMin,
                    numberEntryMax: item.numberEntryMax,
                    ratingScale: item.ratingScale,
                    options: item.options,
                    gpsTargetLat: item.gpsTargetLat,
                    gpsTargetLng: item.gpsTargetLng,
                    gpsRadiusMeters: item.gpsRadiusMeters,
                    signatureLabels: item.signatureLabels,
                    qrExpectedValue: item.qrExpectedValue,
                    cashExpectedAmount: item.cashExpectedAmount,
                    conditionalTrigger: item.conditionalTrigger,
                    conditionalActions: item.conditionalActions,
                    instanceId,
                })),
            )

            // AUDIT items fan out into one ChecklistInstanceItemSubmission per named auditor,
            // seeded with that item's accessories checklist (all unchecked).
            const submissionDrafts = definition.items.flatMap((item, index) => {
                if (item.itemType !== "AUDIT" || !item.auditUserIds.length) return []
                const itemId = itemIds[index]
                return item.auditUserIds.map((userId) => ({
                    id: createId(),
                    itemId,
                    userId,
                    accessories: item.accessories ?? [],
                }))
            })
            if (submissionDrafts.length) {
                await tx.insert(checklistInstanceItemSubmissions).values(
                    submissionDrafts.map((d) => ({ id: d.id, itemId: d.itemId, userId: d.userId })),
                )
                const accessoryRows = submissionDrafts.flatMap((d) =>
                    d.accessories.map((name) => ({ id: createId(), submissionId: d.id, name, checked: false })),
                )
                if (accessoryRows.length) {
                    await tx.insert(checklistInstanceItemSubmissionAccessories).values(accessoryRows)
                }
            }
        })
    } catch (err: any) {
        // Duplicate-key race between this run and a concurrent tick for the same period —
        // the unique (definitionId, storeId, periodKey) index already guarantees only one wins.
        if (err?.code === "ER_DUP_ENTRY") return null
        throw err
    }

    return { id: instanceId }
}

// Stamps out the currently-due ChecklistInstance for one definition, across every store it's live
// in — one independent instance per store, or does nothing if its period hasn't arrived yet.
// Shared by the sweep below and by checklistDefinition.service.ts's create()/update() — a
// freshly-created (or just-reactivated) already-due definition gets its first instance(s)
// immediately instead of waiting for the next hourly tick. Returns the list of newly-created
// instances (empty if none were due/new).
export const generateInstanceForDefinition = async (definition: GenerationDefinition, now: Date): Promise<{ id: string }[]> => {
    const period = getCurrentPeriod(definition.recurrence, definition.startDate, now, env.CHECKLIST_TIMEZONE_OFFSET_MINUTES)
    if (!period) return []
    if (!definition.storeIds.length) return []

    // One query covering every store this definition is live in, instead of one
    // "already generated?" existence check per store.
    const alreadyGeneratedRows = await db.select({ storeId: checklistInstances.storeId })
        .from(checklistInstances)
        .where(and(
            eq(checklistInstances.definitionId, definition.id),
            inArray(checklistInstances.storeId, definition.storeIds),
            eq(checklistInstances.periodKey, period.periodKey),
        ))
    const alreadyGeneratedSet = new Set(alreadyGeneratedRows.map((r) => r.storeId))
    const pendingStoreIds = definition.storeIds.filter((storeId) => !alreadyGeneratedSet.has(storeId))
    if (!pendingStoreIds.length) return []

    const created: { id: string }[] = []
    for (const storeId of pendingStoreIds) {
        // Each store is isolated in its own try/catch — one store's failure (bad data, a
        // transient DB error) must not stop the rest of this definition's stores from getting
        // their instance this tick.
        try {
            const instance = await generateInstanceForStore(definition, storeId, period, now)
            if (instance) created.push(instance)
        } catch (err) {
            console.error(`Checklist instance generation failed for definition ${definition.id}, store ${storeId}:`, err)
        }
    }

    // A ONE_TIME definition has exactly one period, ever — deactivate it once generated (in at
    // least one store) so the sweep doesn't keep re-checking it forever.
    if (definition.recurrence === "ONE_TIME" && created.length) {
        await db.update(checklistDefinitions).set({ isActive: false, updatedAt: new Date() }).where(eq(checklistDefinitions.id, definition.id))
    }

    return created
}

const generateDueInstances = async () => {
    const now = new Date()
    // Widen the pre-filter by the same org-timezone offset getCurrentPeriod uses, so a definition
    // whose startDate is "today" in local time but still "tomorrow" by raw UTC clock isn't excluded
    // before generateInstanceForDefinition ever gets a chance to evaluate it.
    const localNow = new Date(now.getTime() + env.CHECKLIST_TIMEZONE_OFFSET_MINUTES * 60_000)
    const definitionRows = await db.select({ id: checklistDefinitions.id }).from(checklistDefinitions)
        .where(and(eq(checklistDefinitions.isActive, true), lte(checklistDefinitions.startDate, localNow)))

    for (const { id } of definitionRows) {
        // Each definition is isolated in its own try/catch — one bad/malformed definition must
        // not abort the sweep for the rest, unlike the single-collection slaSweep job.
        try {
            const definition = await loadDefinitionForGeneration(id)
            if (definition) await generateInstanceForDefinition(definition, now)
        } catch (err) {
            console.error(`Checklist instance generation failed for definition ${id}:`, err)
        }
    }
}

// Registers the hourly sweep and runs it once immediately, so a freshly deployed server (or a
// definition created mid-day) doesn't wait up to an hour for its first instance. Hourly, not
// every-5-minutes like the SLA sweep: every period boundary here is day-granular, so sub-hour
// polling buys nothing, while hourly stays cheap and tolerates brief downtime near midnight.
export const startChecklistInstanceGenerator = () => {
    generateDueInstances().catch((err) => console.error("Initial checklist instance generation failed:", err))
    cron.schedule("0 * * * *", () => {
        generateDueInstances().catch((err) => console.error("Checklist instance sweep failed:", err))
    })
}
