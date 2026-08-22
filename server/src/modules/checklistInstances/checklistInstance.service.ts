import { db } from "../../config/db.js"
import {
    checklistInstances,
    checklistInstanceAssignees,
    checklistInstanceItems,
    checklistInstanceImages,
    checklistInstanceItemSubmissions,
    checklistInstanceItemSubmissionAccessories,
    checklistInstanceItemSubmissionImages,
    users,
} from "../../db/schema/index.js"
import { eq, and, inArray, desc, asc, sql } from "drizzle-orm"
import { AppError } from "../../utils/AppError.js"
import { notificationService } from "../notifications/notification.service.js"
import { ticketService } from "../tickets/ticket.service.js"
import type { AccessTokenPayload } from "../../middleware/auth/auth.js"
import type { VerifyChecklistInstanceInput } from "./checklistInstance.validation.js"
import type { Role } from "../../db/schema/core.js"
import { DATE_FORMATS } from "../../utils/dateBucket.js"
import type { DateBucket } from "../../utils/index.js"

export type InstanceStatusFilter = "OPEN" | "COMPLETED"

// Not using Drizzle's relational query API (`db.query...with:{...}`) here — that API compiles
// every relation into a `LEFT JOIN LATERAL (...)` subquery, and the actual database this app
// runs against (MariaDB 10.11) doesn't support LATERAL joins at all (confirmed against the real
// local instance). Plain selects assembled by hand in JS instead — same pattern as
// task.service.ts/ticket.service.ts/checklist.service.ts. This is the closest equivalent of the
// old 3-level `populate({ path: "items", ..., populate: [{ path: "images" }, { path:
// "submissions", populate: [...] }] })`, plus flattening the assigneeLinks junction rows back
// into a flat assigneeIds array and a submission's `userId` ref into the populated {id,
// firstName, lastName, storeId} object the old Mongoose `.populate({ path: "userId", select:
// "firstName lastName storeId" })` produced in place.
const hydrateInstances = async (instanceRows: (typeof checklistInstances.$inferSelect)[]) => {
    if (!instanceRows.length) return []
    const instanceIds = instanceRows.map((i) => i.id)

    const assigneeLinks = await db.select().from(checklistInstanceAssignees).where(inArray(checklistInstanceAssignees.instanceId, instanceIds))
    const assigneeIdsByInstance = new Map<string, string[]>()
    for (const link of assigneeLinks) {
        const list = assigneeIdsByInstance.get(link.instanceId) ?? []
        list.push(link.userId)
        assigneeIdsByInstance.set(link.instanceId, list)
    }

    const items = await db.select().from(checklistInstanceItems).where(inArray(checklistInstanceItems.instanceId, instanceIds)).orderBy(asc(checklistInstanceItems.order))
    const itemIds = items.map((i) => i.id)

    const images = itemIds.length ? await db.select().from(checklistInstanceImages).where(inArray(checklistInstanceImages.checklistInstanceItemId, itemIds)) : []
    const imagesByItem = new Map<string, typeof images>()
    for (const img of images) {
        const list = imagesByItem.get(img.checklistInstanceItemId) ?? []
        list.push(img)
        imagesByItem.set(img.checklistInstanceItemId, list)
    }

    const submissions = itemIds.length ? await db.select().from(checklistInstanceItemSubmissions).where(inArray(checklistInstanceItemSubmissions.itemId, itemIds)) : []
    const submissionIds = submissions.map((s) => s.id)

    const accessories = submissionIds.length ? await db.select().from(checklistInstanceItemSubmissionAccessories).where(inArray(checklistInstanceItemSubmissionAccessories.submissionId, submissionIds)) : []
    const accessoriesBySubmission = new Map<string, typeof accessories>()
    for (const a of accessories) {
        const list = accessoriesBySubmission.get(a.submissionId) ?? []
        list.push(a)
        accessoriesBySubmission.set(a.submissionId, list)
    }

    const submissionImages = submissionIds.length ? await db.select().from(checklistInstanceItemSubmissionImages).where(inArray(checklistInstanceItemSubmissionImages.submissionId, submissionIds)) : []
    const submissionImagesBySubmission = new Map<string, typeof submissionImages>()
    for (const img of submissionImages) {
        const list = submissionImagesBySubmission.get(img.submissionId) ?? []
        list.push(img)
        submissionImagesBySubmission.set(img.submissionId, list)
    }

    const submissionUserIds = [...new Set(submissions.map((s) => s.userId))]
    const submissionUsers = submissionUserIds.length
        ? await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, storeId: users.storeId }).from(users).where(inArray(users.id, submissionUserIds))
        : []
    const submissionUserById = new Map(submissionUsers.map((u) => [u.id, u]))

    const submissionsByItem = new Map<string, any[]>()
    for (const submission of submissions) {
        const mapped = {
            ...submission,
            // Mirrors the original `.populate({ path: "userId", select: "firstName lastName storeId" })`
            // — same field name, populated in place, only the fields the UI needs.
            userId: submissionUserById.get(submission.userId) ?? null,
            accessories: (accessoriesBySubmission.get(submission.id) ?? []).map((a) => ({ id: a.id, name: a.name, checked: a.checked })),
            images: submissionImagesBySubmission.get(submission.id) ?? [],
        }
        const list = submissionsByItem.get(submission.itemId) ?? []
        list.push(mapped)
        submissionsByItem.set(submission.itemId, list)
    }

    const itemsByInstance = new Map<string, any[]>()
    for (const item of items) {
        const mapped = {
            ...item,
            images: imagesByItem.get(item.id) ?? [],
            submissions: submissionsByItem.get(item.id) ?? [],
        }
        const list = itemsByInstance.get(item.instanceId) ?? []
        list.push(mapped)
        itemsByInstance.set(item.instanceId, list)
    }

    return instanceRows.map((instance) => ({
        ...instance,
        assigneeIds: assigneeIdsByInstance.get(instance.id) ?? [],
        items: itemsByInstance.get(instance.id) ?? [],
    }))
}

const getPopulatedInstanceById = async (id: string) => {
    const [instance] = await db.select().from(checklistInstances).where(eq(checklistInstances.id, id)).limit(1)
    if (!instance) return null
    const [hydrated] = await hydrateInstances([instance])
    return hydrated
}

const isCompleted = (instance: any) => {
    const items = instance.items ?? []
    return items.length > 0 && items.every((item: any) => item.isDone)
}

const filterByStatus = (instances: any[], status?: InstanceStatusFilter) => {
    if (!status) return instances
    return instances.filter(instance => (status === "COMPLETED" ? isCompleted(instance) : !isCompleted(instance)))
}

// assigneeIds is now the flattened junction-table result (see mapInstance/getPopulatedInstanceById
// above) rather than a real embedded array field — the `.some()` authorization check itself is
// otherwise unchanged. This is the AUTHORIZATION-sensitive piece flagged by the migration research
// report: callers MUST pass the flattened assigneeIds list (from the assigneeLinks relation), not
// try to re-derive access from anything else, or this can silently over/under-grant access.
const assertCanAccess = (instance: { assigneeIds: string[] }, user: AccessTokenPayload) => {
    const isAssignee = instance.assigneeIds.some((id) => id === user.sub)
    if (user.role !== "ADMIN" && user.role !== "PC" && !isAssignee) throw AppError.forbidden()
}

// Same rule as checklist.service.ts's completeItem — never trust the client's isDone, always
// recount qualifying images from the DB before allowing an item to be marked done.
const assertPhotosSatisfied = async (item: any) => {
    if (item.requiredImageCount <= 0) return
    const images = await db.select().from(checklistInstanceImages).where(eq(checklistInstanceImages.checklistInstanceItemId, item.id))
    const qualifying = item.requiresLivePhoto ? images.filter((img) => img.captureMethod === "LIVE") : images
    if (qualifying.length < item.requiredImageCount) {
        const missing = item.requiredImageCount - qualifying.length
        const kind = item.requiresLivePhoto ? "live photo(s)" : "photo(s)"
        throw AppError.badRequest(`Upload ${missing} more ${kind} before this item can be marked complete`)
    }
}

// NUMBER_ENTRY counterpart to assertPhotosSatisfied — a reading is required (and must sit within
// the definition-authored min/max, when set) before the item can be marked done. Never trusts a
// value the client didn't just send: the item's own numericValue isn't consulted here, so a stale
// value from a previous run can't silently satisfy a fresh completion.
const assertNumberEntrySatisfied = (item: any, numericValue: number | undefined) => {
    if (numericValue == null || Number.isNaN(numericValue)) {
        throw AppError.badRequest("Enter a value before this item can be marked complete")
    }
    if (item.numberEntryMin != null && numericValue < item.numberEntryMin) {
        throw AppError.badRequest(`Value must be at least ${item.numberEntryMin}${item.numberEntryUnit ? ` ${item.numberEntryUnit}` : ""}`)
    }
    if (item.numberEntryMax != null && numericValue > item.numberEntryMax) {
        throw AppError.badRequest(`Value must be at most ${item.numberEntryMax}${item.numberEntryUnit ? ` ${item.numberEntryUnit}` : ""}`)
    }
}

// RATING counterpart — same numericValue slot as NUMBER_ENTRY, bounded to a whole star between 1
// and the definition-authored ratingScale (defaulting to 5 stars if never configured).
const assertRatingSatisfied = (item: any, numericValue: number | undefined) => {
    const scale = item.ratingScale ?? 5
    if (numericValue == null || Number.isNaN(numericValue) || !Number.isInteger(numericValue)) {
        throw AppError.badRequest("Pick a rating before this item can be marked complete")
    }
    if (numericValue < 1 || numericValue > scale) {
        throw AppError.badRequest(`Rating must be between 1 and ${scale}`)
    }
}

// YES_NO/PASS_FAIL counterpart — an explicit answer is required; "No"/"Fail" is a valid,
// completed answer, it just isn't a photo/number/etc., so this only checks presence.
const assertBooleanAnswerSatisfied = (booleanAnswer: "YES" | "NO" | undefined) => {
    if (booleanAnswer !== "YES" && booleanAnswer !== "NO") {
        throw AppError.badRequest("Choose an answer before this item can be marked complete")
    }
}

// MULTIPLE_CHOICE/DROPDOWN counterpart — the answer must be one of the definition-authored
// options, not just any non-empty string (unlike TEXT_BOX below).
const assertOptionSatisfied = (item: any, textValue: string | undefined) => {
    if (!textValue || !(item.options ?? []).includes(textValue)) {
        throw AppError.badRequest("Choose one of the listed options before this item can be marked complete")
    }
}

// TEXT_BOX counterpart — any non-empty answer is accepted, no option list to match against.
const assertTextSatisfied = (textValue: string | undefined) => {
    if (!textValue?.trim()) {
        throw AppError.badRequest("Enter an answer before this item can be marked complete")
    }
}

// DATE_TIME counterpart — must be a value the client actually sent and a parseable date.
const assertDateSatisfied = (dateValue: string | undefined) => {
    if (!dateValue || Number.isNaN(new Date(dateValue).getTime())) {
        throw AppError.badRequest("Pick a date before this item can be marked complete")
    }
}

// Great-circle distance in meters between two lat/lng points — used only to check a GPS reading
// against an optional definition-authored target + radius.
const EARTH_RADIUS_METERS = 6371000
const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a))
}

// GPS counterpart — a location reading is required; only checked against the definition-authored
// target when all three of gpsTargetLat/Lng/RadiusMeters are set (the schema refine in
// checklistDefinition.validation.ts guarantees lat/lng are set whenever radius is, so a plain
// null-check on all three is enough to know "is there a target to check against").
const assertGpsSatisfied = (item: any, lat: number | undefined, lng: number | undefined) => {
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
        throw AppError.badRequest("Capture your location before this item can be marked complete")
    }
    if (item.gpsTargetLat != null && item.gpsTargetLng != null && item.gpsRadiusMeters != null) {
        const distance = haversineMeters(lat, lng, item.gpsTargetLat, item.gpsTargetLng)
        if (distance > item.gpsRadiusMeters) {
            throw AppError.badRequest(
                `You're ${Math.round(distance)}m from the required location — must be within ${item.gpsRadiusMeters}m`,
            )
        }
    }
}

// QR_SCAN counterpart — reuses the same textValue slot TEXT_BOX/MULTIPLE_CHOICE do, but a scanned
// code additionally has to match qrExpectedValue when the definition authored one.
const assertQrSatisfied = (item: any, textValue: string | undefined) => {
    if (!textValue?.trim()) {
        throw AppError.badRequest("Scan a code before this item can be marked complete")
    }
    if (item.qrExpectedValue && textValue.trim() !== item.qrExpectedValue) {
        throw AppError.badRequest("Scanned code doesn't match the expected code")
    }
}

// SIGNATURE counterpart — just needs a non-empty drawing.
const assertSignatureSatisfied = (signatureValue: string | undefined) => {
    if (!signatureValue) {
        throw AppError.badRequest("Add a signature before this item can be marked complete")
    }
}

// DUAL_SIGNATURE counterpart — both signers must have signed.
const assertDualSignatureSatisfied = (signatureValue: string | undefined, secondSignatureValue: string | undefined) => {
    if (!signatureValue || !secondSignatureValue) {
        throw AppError.badRequest("Both signatures are required before this item can be marked complete")
    }
}

export type ItemValueInput = {
    numericValue?: number
    booleanAnswer?: "YES" | "NO"
    textValue?: string
    dateValue?: string
    gpsLat?: number
    gpsLng?: number
    gpsAccuracy?: number
    signatureValue?: string
    secondSignatureValue?: string
    conditionalReasonValue?: string
}

// One validator per value-bearing item type, keyed by itemType — a lookup instead of an
// if/else-if chain, so adding the next type means adding one entry here, not another branch to
// thread through setItemDone. CASH_TALLY reuses assertNumberEntrySatisfied outright — it's a
// NUMBER_ENTRY variant with an extra display-only field, not a different validation rule.
const VALUE_VALIDATORS_BY_ITEM_TYPE: Record<string, (item: any, values: ItemValueInput) => void> = {
    NUMBER_ENTRY: (item, v) => assertNumberEntrySatisfied(item, v.numericValue),
    RATING: (item, v) => assertRatingSatisfied(item, v.numericValue),
    YES_NO: (_item, v) => assertBooleanAnswerSatisfied(v.booleanAnswer),
    PASS_FAIL: (_item, v) => assertBooleanAnswerSatisfied(v.booleanAnswer),
    MULTIPLE_CHOICE: (item, v) => assertOptionSatisfied(item, v.textValue),
    DROPDOWN: (item, v) => assertOptionSatisfied(item, v.textValue),
    TEXT_BOX: (_item, v) => assertTextSatisfied(v.textValue),
    DATE_TIME: (_item, v) => assertDateSatisfied(v.dateValue),
    GPS: (item, v) => assertGpsSatisfied(item, v.gpsLat, v.gpsLng),
    QR_SCAN: (item, v) => assertQrSatisfied(item, v.textValue),
    CASH_TALLY: (item, v) => assertNumberEntrySatisfied(item, v.numericValue),
    SIGNATURE: (_item, v) => assertSignatureSatisfied(v.signatureValue),
    DUAL_SIGNATURE: (_item, v) => assertDualSignatureSatisfied(v.signatureValue, v.secondSignatureValue),
}

// Builder-authored "If answer is X then:" rules (see ChecklistDefinitionItem.conditionalTrigger/
// conditionalActions) — only ever meaningful for YES_NO/PASS_FAIL items, and only fire when the
// answer being submitted right now matches the trigger. REQUIRE_PHOTO/ASK_REASON are validated
// here (block completion until satisfied, same as the type validators above); CREATE_ISSUE/
// NOTIFY_AREA_MANAGER are side effects applied after validation passes.
const isConditionTriggered = (item: any, values: ItemValueInput) =>
    !!item.conditionalTrigger && item.conditionalTrigger === values.booleanAnswer

const assertConditionalActionsSatisfied = async (item: any, values: ItemValueInput) => {
    if (!isConditionTriggered(item, values)) return
    const actions: string[] = item.conditionalActions ?? []

    if (actions.includes("REQUIRE_PHOTO")) {
        const images = await db.select().from(checklistInstanceImages).where(eq(checklistInstanceImages.checklistInstanceItemId, item.id))
        const qualifying = item.requiresLivePhoto ? images.filter((img) => img.captureMethod === "LIVE").length : images.length
        if (qualifying < 1) {
            throw AppError.badRequest("Upload a photo before completing this item — your answer requires one")
        }
    }

    if (actions.includes("ASK_REASON")) {
        const reason = values.conditionalReasonValue ?? item.conditionalReasonValue
        if (!reason?.trim()) {
            throw AppError.badRequest("Enter a reason before completing this item — your answer requires one")
        }
    }
}

// Applies CREATE_ISSUE/NOTIFY_AREA_MANAGER after validation passes and the item has been saved —
// these are side effects, not completion gates. CREATE_ISSUE only fires once per item (guarded by
// issueId) so reopening/resubmitting the same "No" doesn't spawn duplicate tickets. Returns the
// (possibly issueId-updated) item so the caller's in-memory copy stays accurate without a re-fetch.
const applyConditionalSideEffects = async (
    item: any,
    instance: { id: string; title: string; storeId: string },
    user: AccessTokenPayload,
    values: ItemValueInput,
) => {
    if (!isConditionTriggered(item, values)) return item
    const actions: string[] = item.conditionalActions ?? []
    let updatedItem = item

    if (actions.includes("CREATE_ISSUE") && !item.issueId) {
        try {
            const reason = values.conditionalReasonValue ?? item.conditionalReasonValue
            const ticket = await ticketService.create({
                title: `Checklist flag : ${item.label}`,
                description: `Raised automatically from "${instance.title}" -- "${item.label}" was answered "${values.booleanAnswer}".${reason ? `Reason: ${reason}` : ""}`,
                storeId: instance.storeId,
            }, user)
            // ticket.service.ts hasn't been migrated to Drizzle yet (separate task) — it still
            // hands back a Mongoose document, so `_id` (not `id`) is what actually exists on it.
            const issueId = String((ticket as any)._id ?? (ticket as any).id)
            await db.update(checklistInstanceItems).set({ issueId, updatedAt: new Date() }).where(eq(checklistInstanceItems.id, item.id))
            updatedItem = { ...item, issueId }
        } catch (err) {
            console.error("Failed to auto-create issue from checklist flag:", err)
        }
    }

    if (actions.includes("NOTIFY_AREA_MANAGER")) {
        // NOTE: the original guarded this with `!item.areaManagerNotifiedAt` — a field that was
        // never actually declared on the ChecklistInstanceItem Mongoose schema, so Mongoose
        // silently discarded every assignment to it and the guard was always true. In practice
        // this meant the notification fired on every save where the condition matched, not just
        // once. Preserved as-is (fire every time) rather than inventing new dedupe state that
        // never actually existed before.
        await notificationService
            .notifyAreaManagersOfChecklistFlag({ _id: instance.id, title: instance.title }, updatedItem)
            .catch((err: unknown) => console.error("Failed to notify area manager of checklist flage:", err))
    }

    return updatedItem
}

// Keep completedAt in sync with isDone automatically, same convention the Mongoose pre('save')
// hook used — completedBy is decided by the caller (it has no access to the requesting user), and
// is cleared automatically on un-done.
const deriveInstanceItemCompletion = (isDone: boolean, completedByUserId: string | null): { completedAt: Date | null; completedBy: string | null } => {
    if (!isDone) return { completedAt: null, completedBy: null }
    return { completedAt: new Date(), completedBy: completedByUserId }
}

export const syncVerificationStatus = async (instanceId: string) => {
    const items = await db.select({ isDone: checklistInstanceItems.isDone }).from(checklistInstanceItems).where(eq(checklistInstanceItems.instanceId, instanceId))
    const allDone = items.length > 0 && items.every((i) => i.isDone)

    const [instance] = await db.select().from(checklistInstances).where(eq(checklistInstances.id, instanceId)).limit(1)
    if (!instance) return

    if (allDone && instance.verificationStatus !== "APPROVED") {
        if (instance.verificationStatus !== "PENDING") {
            await db.update(checklistInstances).set({ verificationStatus: "PENDING", updatedAt: new Date() }).where(eq(checklistInstances.id, instanceId))
            const assigneeLinks = await db.select({ userId: checklistInstanceAssignees.userId }).from(checklistInstanceAssignees).where(eq(checklistInstanceAssignees.instanceId, instanceId))
            notificationService
                .notifyChecklistPendingVerification({ _id: instance.id, title: instance.title, storeId: instance.storeId, assigneeIds: assigneeLinks.map(l => l.userId) })
                .catch((err) => console.error("Failed to notify PC of pending checklist:", err))
        }
    } else if (!allDone && instance.verificationStatus === "PENDING") {
        await db.update(checklistInstances).set({ verificationStatus: "NOT_SUBMITTED", updatedAt: new Date() }).where(eq(checklistInstances.id, instanceId))
    }
}

// PC has the same org-wide verification access as ADMIN — same parity as everywhere else in
// the app (tickets, tasks) — so a PC user isn't limited to their own store.
const CAN_VERIFY_BY_ROLE: Partial<Record<Role, (instance: any, user: AccessTokenPayload) => boolean>> = {
    ADMIN: () => true,
    PC: () => true,
}

const assertCanVerify = (instance: any, user: AccessTokenPayload) => {
    const canVerify = CAN_VERIFY_BY_ROLE[user.role]?.(instance, user) ?? false
    if (!canVerify) throw AppError.forbidden()
}

export const checklistInstanceService = {
    async getMine(userId: string, status?: InstanceStatusFilter) {
        // assigneeIds is now the checklistInstanceAssignees junction table rather than a real
        // embedded array field — look up the matching instance ids first, same convention as
        // checklistDefinition.service.ts's list() storeId filter.
        const links = await db.select({ instanceId: checklistInstanceAssignees.instanceId }).from(checklistInstanceAssignees).where(eq(checklistInstanceAssignees.userId, userId))
        if (!links.length) return []

        const instanceRows = await db.select().from(checklistInstances)
            .where(inArray(checklistInstances.id, links.map(l => l.instanceId)))
            .orderBy(desc(checklistInstances.periodStart))
        return filterByStatus(await hydrateInstances(instanceRows), status)
    },

    async listAll(filter: { definitionId?: string; storeId?: string; status?: InstanceStatusFilter }) {
        const conditions = []
        if (filter.definitionId) conditions.push(eq(checklistInstances.definitionId, filter.definitionId))
        if (filter.storeId) conditions.push(eq(checklistInstances.storeId, filter.storeId))

        const instanceRows = await db.select().from(checklistInstances)
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(checklistInstances.periodStart))
        return filterByStatus(await hydrateInstances(instanceRows), filter.status)
    },

    async getById(id: string, user: AccessTokenPayload) {
        const instance = await getPopulatedInstanceById(id)
        if (!instance) throw AppError.notFound("Checklist instance not found")
        assertCanAccess(instance, user)
        return instance
    },

    async setItemDone(itemId: string, isDone: boolean, user: AccessTokenPayload, values: ItemValueInput = {}) {
        const [item] = await db.select().from(checklistInstanceItems).where(eq(checklistInstanceItems.id, itemId)).limit(1)
        if (!item) throw AppError.notFound("Checklist item not found.")

        // Fetch just enough of the parent instance to authorize + drive the side effects below —
        // no need for the full items/submissions populate setItemDone doesn't use.
        const [instanceRow] = await db.select().from(checklistInstances).where(eq(checklistInstances.id, item.instanceId)).limit(1)
        if (!instanceRow) throw AppError.notFound("Checklist instance not found.")
        const assigneeLinkRows = await db.select({ userId: checklistInstanceAssignees.userId }).from(checklistInstanceAssignees).where(eq(checklistInstanceAssignees.instanceId, instanceRow.id))
        const assigneeIds = assigneeLinkRows.map((l) => l.userId)
        assertCanAccess({ assigneeIds }, user)

        const patch: Partial<typeof checklistInstanceItems.$inferInsert> = {}
        if (values.numericValue !== undefined) patch.numericValue = values.numericValue
        if (values.booleanAnswer !== undefined) patch.booleanAnswer = values.booleanAnswer
        // Fixed during migration: the source set `item.booleanAnswer` here too (copy-paste typo),
        // which meant a TEXT_BOX/MULTIPLE_CHOICE/DROPDOWN/QR_SCAN answer was never actually
        // persisted — this now correctly writes textValue.
        if (values.textValue !== undefined) patch.textValue = values.textValue
        if (values.dateValue !== undefined) {
            const parsed = new Date(values.dateValue)
            if (Number.isNaN(parsed.getTime())) throw AppError.badRequest("That doesn't look like a valid date.")
            patch.dateValue = parsed
        }
        if (values.gpsLat !== undefined) patch.gpsLat = values.gpsLat
        // Fixed during migration: the source never assigned `item.gpsLng` at all (only gpsLat was
        // ever persisted) — a GPS item's longitude reading was silently dropped.
        if (values.gpsLng !== undefined) patch.gpsLng = values.gpsLng
        if (values.gpsAccuracy !== undefined) patch.gpsAccuracy = values.gpsAccuracy
        if (values.gpsLat !== undefined || values.gpsLng !== undefined) patch.gpsCapturedAt = new Date()
        if (values.signatureValue !== undefined) patch.signatureValue = values.signatureValue
        if (values.secondSignatureValue !== undefined) patch.secondSignatureValue = values.secondSignatureValue
        if (values.conditionalReasonValue !== undefined) patch.conditionalReasonValue = values.conditionalReasonValue

        // Validators need to see the patched values (e.g. a just-submitted conditionalReasonValue)
        // the same way the original code validated against the already-`.save()`d in-memory
        // document — merge here instead of round-tripping through the DB.
        const mergedItem = { ...item, ...patch }

        if (isDone) {
            await assertPhotosSatisfied(mergedItem)
            VALUE_VALIDATORS_BY_ITEM_TYPE[item.itemType]?.(mergedItem, values)
            await assertConditionalActionsSatisfied(mergedItem, values)
        }

        const completion = deriveInstanceItemCompletion(isDone, isDone ? user.sub : null)
        await db.update(checklistInstanceItems).set({
            ...patch,
            isDone,
            completedAt: completion.completedAt,
            completedBy: completion.completedBy,
            updatedAt: new Date(),
        }).where(eq(checklistInstanceItems.id, itemId))

        let updatedItem = { ...mergedItem, isDone, completedAt: completion.completedAt, completedBy: completion.completedBy }

        if (isDone) {
            updatedItem = await applyConditionalSideEffects(updatedItem, instanceRow, user, values)
        }

        await syncVerificationStatus(instanceRow.id)

        // Re-select so the response reflects exactly what's in the DB (e.g. if applyConditionalSideEffects's
        // issueId update above landed).
        const [finalItem] = await db.select().from(checklistInstanceItems).where(eq(checklistInstanceItems.id, itemId)).limit(1)
        return finalItem
    },

    // GET /checklist-instances/pending-verification — PC sees every store's queue, same as ADMIN.
    async listPendingVerification(_user: AccessTokenPayload) {
        const instanceRows = await db.select().from(checklistInstances)
            .where(eq(checklistInstances.verificationStatus, "PENDING"))
            .orderBy(desc(checklistInstances.periodStart))
        return hydrateInstances(instanceRows)
    },

    async verify(id: string, input: VerifyChecklistInstanceInput, user: AccessTokenPayload) {
        const [instance] = await db.select().from(checklistInstances).where(eq(checklistInstances.id, id)).limit(1)
        if (!instance) throw AppError.notFound("Checklist instance not found")
        assertCanVerify(instance, user)

        if (instance.verificationStatus !== "PENDING") {
            throw AppError.badRequest("This checklist isn't pending verification.")
        }

        if (input.action === "APPROVE") {
            await db.update(checklistInstances).set({
                verificationStatus: "APPROVED",
                verifiedBy: user.sub,
                verifiedAt: new Date(),
                verificationNote: input.note ?? null,
                updatedAt: new Date(),
            }).where(eq(checklistInstances.id, id))
        } else {
            await db.update(checklistInstances).set({
                verificationStatus: "REJECTED",
                verificationNote: input.note ?? null,
                updatedAt: new Date(),
            }).where(eq(checklistInstances.id, id))
        }

        const assigneeLinks = await db.select({ userId: checklistInstanceAssignees.userId }).from(checklistInstanceAssignees).where(eq(checklistInstanceAssignees.instanceId, id))
        notificationService
            .notifyChecklistVerificationResult({ _id: instance.id, title: instance.title, assigneeIds: assigneeLinks.map(l => l.userId) }, input.action, input.note)
            .catch((err) => console.error("Failed to notify checklist verification result:", err))

        const result = await getPopulatedInstanceById(id)
        return result!
    },

    // GET /checklist-instances/reports/compliance?groupBy=&storeId=&from=&to= (ADMIN only).
    // Mirrors taskService.complianceReport's shape/pipeline exactly, but buckets by the parent
    // instance's periodStart rather than the item's own createdAt — periodStart is the
    // semantically correct "which operational period does this belong to" field; createdAt is
    // just whenever the cron job happened to stamp the item out (could lag on a backfill run).
    async complianceReport(groupBy: DateBucket, storeId?: string, from?: string, to?: string) {
        const conditions: ReturnType<typeof sql>[] = [];
        if (storeId) conditions.push(sql`ci.storeId = ${storeId}`);
        if (from) conditions.push(sql`ci.periodStart >= ${new Date(from)}`);
        if (to) conditions.push(sql`ci.periodStart <= ${new Date(to)}`);
        const whereClause = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

        // db.execute() on the mysql2 driver resolves to the raw mysql2 tuple [rows, fields],
        // NOT a plain row array — must destructure element 0 (see task.service.ts#complianceReport).
        const [rows] = await db.execute(sql`
            SELECT
                DATE_FORMAT(ci.periodStart, ${DATE_FORMATS[groupBy]}) AS bucket,
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
            ${whereClause}
            GROUP BY bucket
            ORDER BY bucket ASC
        `);

        return (rows as unknown as any[]).map((r) => ({
            bucket: r.bucket as string,
            totalItems: Number(r.totalItems),
            doneItems: Number(r.doneItems),
            completionRate: Number(r.totalItems) ? Math.round((Number(r.doneItems) / Number(r.totalItems)) * 1000) / 10 : null,
            itemsRequiringPhotos: Number(r.itemsRequiringPhotos),
            qualityRate: Number(r.itemsRequiringPhotos) ? Math.round((Number(r.photoCompliantItems) / Number(r.itemsRequiringPhotos)) * 1000) / 10 : null,
        }));
    },
}
